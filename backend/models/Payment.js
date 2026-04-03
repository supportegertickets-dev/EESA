const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  member:    { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  type:      { type: String, enum: ['registration', 'renewal'], required: true },
  amount:    { type: Number, required: true },
  semester:  String,
  mpesaCode: { type: String, trim: true },
  status:    { type: String, enum: ['pending', 'confirmed', 'rejected', 'stk_pushed', 'failed'], default: 'pending' },
  // M-Pesa STK Push fields
  checkoutRequestId:  String,
  merchantRequestId:  String,
  mpesaReceiptNumber: String,
  transactionDate:    String,
  phoneNumber:        String,
  resultCode:         Number,
  resultDesc:         String,
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  confirmedAt: Date,
  notes:     String,
}, { timestamps: true });

paymentSchema.index({ checkoutRequestId: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
