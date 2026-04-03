const express = require('express');
const Payment = require('../models/Payment');
const Member = require('../models/Member');
const { requireAdmin, requireMember } = require('../middleware/auth');
const router = express.Router();

// ── M-Pesa Daraja Helpers ──
async function getMpesaToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret || key.includes('your_') || secret.includes('your_')) {
    throw new Error('MPESA_NOT_CONFIGURED');
  }
  const env = process.env.MPESA_ENV || 'sandbox';
  const baseUrl = env === 'live'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` }
  });
  const data = await res.json();
  return { token: data.access_token, baseUrl };
}

function getMpesaPassword() {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey || passkey.includes('your_')) {
    throw new Error('MPESA_NOT_CONFIGURED');
  }
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  return { password, timestamp };
}

// ── M-Pesa STK Push (Lipa Na M-Pesa Online) ──
router.post('/mpesa/stkpush', requireMember, async (req, res) => {
  try {
    const { type, phone } = req.body;
    if (!type || !phone) return res.status(400).json({ error: 'Payment type and phone number required' });

    const amount = type === 'registration' ? 250 : 50;
    // Normalize phone: 07xx → 2547xx
    let phoneNumber = phone.replace(/\s+/g, '');
    if (phoneNumber.startsWith('0')) phoneNumber = '254' + phoneNumber.slice(1);
    if (phoneNumber.startsWith('+')) phoneNumber = phoneNumber.slice(1);

    // Prevent duplicate pending STK pushes
    const existing = await Payment.findOne({
      member: req.session.member.id, type,
      status: { $in: ['pending', 'stk_pushed'] }
    });
    if (existing) return res.status(409).json({ error: 'You already have a pending payment. Please complete or wait for it to expire.' });

    const { token, baseUrl } = await getMpesaToken();
    const { password, timestamp } = getMpesaPassword();

    const stkPayload = {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: phoneNumber,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: phoneNumber,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: `EESA-${type.toUpperCase()}`,
      TransactionDesc: `EESA ${type} fee`
    };

    const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(stkPayload)
    });
    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== '0') {
      return res.status(400).json({ error: stkData.ResponseDescription || 'STK Push failed' });
    }

    // Create payment record tracking the STK push
    const payment = await Payment.create({
      member: req.session.member.id,
      type, amount, phoneNumber,
      semester: getCurrentSemester(),
      status: 'stk_pushed',
      checkoutRequestId: stkData.CheckoutRequestID,
      merchantRequestId: stkData.MerchantRequestID
    });

    res.status(201).json({
      message: 'STK Push sent. Check your phone and enter your M-Pesa PIN.',
      payment: { _id: payment._id, checkoutRequestId: payment.checkoutRequestId }
    });
  } catch (err) {
    console.error('STK Push error:', err.message);
    const message = err.message === 'MPESA_NOT_CONFIGURED'
      ? 'M-Pesa is not configured on this server yet. Use the manual confirmation option below.'
      : 'M-Pesa STK Push failed. You can still pay manually.';
    res.status(err.message === 'MPESA_NOT_CONFIGURED' ? 503 : 500).json({ error: message });
  }
});

// ── M-Pesa Callback (Safaricom calls this after payment) ──
router.post('/mpesa/callback', async (req, res) => {
  try {
    const { Body } = req.body;
    if (!Body?.stkCallback) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;

    const payment = await Payment.findOne({ checkoutRequestId: CheckoutRequestID });
    if (!payment) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    payment.resultCode = ResultCode;
    payment.resultDesc = ResultDesc;

    if (ResultCode === 0 && CallbackMetadata?.Item) {
      // Payment successful — extract metadata
      const meta = {};
      for (const item of CallbackMetadata.Item) {
        meta[item.Name] = item.Value;
      }
      payment.mpesaReceiptNumber = meta.MpesaReceiptNumber;
      payment.mpesaCode = meta.MpesaReceiptNumber;
      payment.transactionDate = String(meta.TransactionDate);
      payment.status = 'confirmed';
      payment.confirmedAt = new Date();
      payment.notes = 'Auto-confirmed via M-Pesa callback';

      // Auto-update member status
      const member = await Member.findById(payment.member);
      if (member) {
        if (payment.type === 'registration') {
          member.registrationPaid = true;
        } else if (payment.type === 'renewal') {
          member.currentSemester = payment.semester;
          member.renewalHistory.push({
            semester: payment.semester,
            amount: payment.amount,
            paidAt: new Date(),
            mpesaCode: meta.MpesaReceiptNumber
          });
        }
        await member.save();
      }
    } else {
      // Payment failed or cancelled
      payment.status = 'failed';
    }
    await payment.save();

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('M-Pesa callback error:', err.message);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  }
});

// ── Check STK Push status ──
router.get('/mpesa/status/:id', requireMember, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.member.toString() !== req.session.member.id)
      return res.status(403).json({ error: 'Not your payment' });
    res.json({
      status: payment.status,
      mpesaCode: payment.mpesaReceiptNumber || payment.mpesaCode,
      resultDesc: payment.resultDesc
    });
  } catch { res.status(500).json({ error: 'Check failed' }); }
});

// Member submits a payment
router.post('/', requireMember, async (req, res) => {
  try {
    const { type, mpesaCode, semester } = req.body;
    if (!type || !mpesaCode) return res.status(400).json({ error: 'Payment type and M-Pesa code required' });

    const amount = type === 'registration' ? 250 : 50;

    // Prevent duplicate pending payments
    const existing = await Payment.findOne({ member: req.session.member.id, type, status: 'pending' });
    if (existing) return res.status(409).json({ error: 'You already have a pending payment of this type. Please wait for admin confirmation.' });

    const payment = await Payment.create({
      member: req.session.member.id,
      type, amount, mpesaCode,
      semester: semester || getCurrentSemester(),
      status: 'pending'
    });
    res.status(201).json({ message: 'Payment submitted. Await admin confirmation.', payment });
  } catch { res.status(500).json({ error: 'Payment submission failed' }); }
});

// Member view own payments
router.get('/mine', requireMember, async (req, res) => {
  try {
    const payments = await Payment.find({ member: req.session.member.id }).sort({ createdAt: -1 });
    res.json(payments);
  } catch { res.status(500).json({ error: 'Failed to fetch payments' }); }
});

// Admin: Get all payments
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { status, type } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    const payments = await Payment.find(filter).populate('member', 'fullName regNumber email department').sort({ createdAt: -1 });
    res.json(payments);
  } catch { res.status(500).json({ error: 'Failed to fetch payments' }); }
});

// Admin: Confirm payment
router.put('/:id/confirm', requireAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (!['pending', 'stk_pushed'].includes(payment.status)) return res.status(400).json({ error: 'Payment already processed' });

    payment.status = 'confirmed';
    payment.confirmedBy = req.session.admin.id;
    payment.confirmedAt = new Date();
    await payment.save();

    // Update member
    const member = await Member.findById(payment.member);
    if (member) {
      if (payment.type === 'registration') {
        member.registrationPaid = true;
      } else if (payment.type === 'renewal') {
        member.currentSemester = payment.semester;
        member.renewalHistory.push({
          semester: payment.semester,
          amount: payment.amount,
          paidAt: new Date(),
          mpesaCode: payment.mpesaCode
        });
      }
      await member.save();
    }

    res.json({ message: 'Payment confirmed', payment });
  } catch { res.status(500).json({ error: 'Confirmation failed' }); }
});

// Admin: Reject payment
router.put('/:id/reject', requireAdmin, async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    payment.status = 'rejected';
    payment.notes = req.body.notes || '';
    payment.confirmedBy = req.session.admin.id;
    payment.confirmedAt = new Date();
    await payment.save();

    res.json({ message: 'Payment rejected', payment });
  } catch { res.status(500).json({ error: 'Rejection failed' }); }
});

function getCurrentSemester() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  return month < 6 ? `${year} Sem 1` : `${year} Sem 2`;
}

module.exports = router;
