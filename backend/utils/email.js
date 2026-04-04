/**
 * Email Notification Service
 * Primary: Brevo HTTP API (fast, reliable)
 * Fallback: SMTP via Nodemailer
 */
const nodemailer = require('nodemailer');

const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const SMTP_FROM = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@eesa.egerton.ac.ke';
const SMTP_FROM_NAME = 'EESA Portal';

// ── SMTP Fallback Transporter ──
const smtpPort = Number(process.env.SMTP_PORT) || 587;
let transporter = null;
function getSmtpTransporter() {
  if (transporter) return transporter;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  if (!user || user.includes('your_') || !pass || pass.includes('your_')) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user, pass }
  });
  return transporter;
}

// ── Brevo HTTP API sender ──
async function sendViaBrevoApi(to, subject, html) {
  if (!BREVO_API_KEY || BREVO_API_KEY.includes('your_')) return null;
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: SMTP_FROM_NAME, email: SMTP_FROM },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error('[Email] Brevo API error:', res.status, err);
      return null;
    }
    const data = await res.json();
    console.log('[Email] Sent via Brevo API:', data.messageId || 'ok');
    return data;
  } catch (err) {
    console.error('[Email] Brevo API failed:', err.message);
    return null;
  }
}

// ── SMTP fallback sender ──
async function sendViaSmtp(to, subject, html) {
  const t = getSmtpTransporter();
  if (!t) return null;
  try {
    const info = await t.sendMail({ from: `${SMTP_FROM_NAME} <${SMTP_FROM}>`, to, subject, html });
    console.log('[Email] Sent via SMTP:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] SMTP failed:', err.message);
    return null;
  }
}

/**
 * Send an email — tries Brevo API first, falls back to SMTP
 */
async function sendEmail(to, subject, html) {
  // Try Brevo API first
  let result = await sendViaBrevoApi(to, subject, html);
  if (result) return result;

  // Fallback to SMTP
  result = await sendViaSmtp(to, subject, html);
  if (result) return result;

  console.log('[Email] No email provider configured — skipping email to:', to, 'Subject:', subject);
  return null;
}

/**
 * Send a templated notification email
 */
async function sendNotificationEmail(to, title, message, link = '') {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
      <div style="background: #800020; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">EESA Portal</h1>
        <p style="margin: 4px 0 0; opacity: 0.9;">Egerton Engineering Students' Association</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">${title}</h2>
        <p style="color: #555; line-height: 1.6;">${message}</p>
        ${link ? `<a href="${link}" style="display: inline-block; background: #800020; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; margin-top: 12px;">View Details</a>` : ''}
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">
        © ${new Date().getFullYear()} EESA - Egerton University. All rights reserved.
      </p>
    </div>
  `;
  return sendEmail(to, `[EESA] ${title}`, html);
}

/**
 * Send newsletter/bulk email
 */
async function sendBulkEmail(recipients, subject, htmlContent) {
  const results = [];
  for (const email of recipients) {
    const r = await sendEmail(email, subject, htmlContent);
    results.push({ email, sent: !!r });
  }
  return results;
}

module.exports = { sendEmail, sendNotificationEmail, sendBulkEmail, sendPasswordResetEmail };

/**
 * Send password reset email with OTP code
 */
async function sendPasswordResetEmail(to, fullName, code) {
  const html = `
    <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 20px;">
      <div style="background: #800020; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">EESA Portal</h1>
        <p style="margin: 4px 0 0; opacity: 0.9;">Egerton Engineering Students' Association</p>
      </div>
      <div style="background: white; padding: 24px; border-radius: 0 0 8px 8px;">
        <h2 style="color: #333; margin-top: 0;">Password Reset</h2>
        <p style="color: #555; line-height: 1.6;">Hi ${fullName},</p>
        <p style="color: #555; line-height: 1.6;">Use the code below to reset your password. It expires in <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 24px 0;">
          <span style="display: inline-block; background: #f0f0f0; padding: 16px 32px; font-size: 28px; font-weight: 700; letter-spacing: 6px; border-radius: 8px; color: #800020;">${code}</span>
        </div>
        <p style="color: #999; font-size: 13px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
      <p style="text-align: center; color: #999; font-size: 12px; margin-top: 16px;">
        &copy; ${new Date().getFullYear()} EESA - Egerton University. All rights reserved.
      </p>
    </div>
  `;
  return sendEmail(to, '[EESA] Password Reset Code', html);
}
