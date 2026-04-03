/**
 * Email Notification Service
 * Uses Nodemailer for sending emails (Gmail SMTP)
 */
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Send an email
 * @param {string} to - Recipient email
 * @param {string} subject
 * @param {string} html - HTML body
 */
async function sendEmail(to, subject, html) {
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'your_email@gmail.com') {
    console.log('[Email] SMTP not configured — skipping email to:', to, 'Subject:', subject);
    return null;
  }
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to, subject, html
    });
    console.log('[Email] Sent:', info.messageId);
    return info;
  } catch (err) {
    console.error('[Email] Send failed:', err.message);
    return null;
  }
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

module.exports = { sendEmail, sendNotificationEmail, sendBulkEmail };
