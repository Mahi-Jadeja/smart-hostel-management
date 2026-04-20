import nodemailer from 'nodemailer';
import config from '../config/env.js';

/**
 * Create a reusable email transporter.
 *
 * Nodemailer "transporters" handle the connection to the SMTP server.
 * We create it once and reuse it to avoid reconnecting on every email.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587', 10),
  secure: process.env.EMAIL_SECURE === 'true', // true for port 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Verify transporter connection on startup.
 *
 * If credentials are wrong, we want to know immediately
 * instead of failing silently when the first email is sent.
 */
transporter.verify((error) => {
  if (error) {
    console.warn('⚠️  Email transporter verification failed:', error.message);
    console.warn('   Emails will not be sent until SMTP credentials are fixed.');
  } else {
    console.log('✅ Email transporter verified and ready.');
  }
});

/**
 * Send a single email.
 *
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text fallback
 * @returns {Promise<object>} Nodemailer info object
 */
export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"IntelliHostel" <noreply@intellihostel.com>',
      to,
      subject,
      html,
      text,
    });

    console.log(`✅ Email sent to ${to} | Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    throw new Error(`Email sending failed: ${error.message}`);
  }
};
/**
 * Send a payment reminder to Student and Guardian.
 *
 * @param {object} payment - The Payment document
 * @param {object} student - The Student document
 */
export const sendPaymentReminder = async (payment, student) => {
  const { amount, type, due_date, description } = payment;
  const studentName = student.name;
  const studentEmail = student.email;
  const guardianEmail = student.guardian?.email;

  const dueDateStr = new Date(due_date).toLocaleDateString();
  const amountStr = `₹${amount.toLocaleString()}`;

  const subject = `Payment Reminder: ${amountStr} due on ${dueDateStr}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Payment Reminder</h2>
      <p>Dear ${studentName},</p>
      <p>This is a reminder that a payment is due soon.</p>
      <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>Type:</strong> ${type.replace(/_/g, ' ').toUpperCase()}</p>
        <p style="margin: 5px 0;"><strong>Amount:</strong> ${amountStr}</p>
        <p style="margin: 5px 0;"><strong>Due Date:</strong> ${dueDateStr}</p>
        ${description ? `<p style="margin: 5px 0;"><strong>Description:</strong> ${description}</p>` : ''}
      </div>
      <p>Please log in to your student dashboard to mark this payment as paid.</p>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        If you have already paid, please ignore this email.
      </p>
    </div>
  `;

  const text = `Payment Reminder: ${amountStr} for ${type.replace(/_/g, ' ')} is due on ${dueDateStr}. Please log in to pay.`;

  // Send to Student
  try {
    await sendEmail({ to: studentEmail, subject, html, text });
  } catch (error) {
    console.error(`❌ Failed to send payment reminder to student ${studentEmail}:`, error.message);
  }

  // Send to Guardian (if exists)
  if (guardianEmail) {
    try {
      await sendEmail({
        to: guardianEmail,
        subject: `Payment Reminder for ${studentName}: ${amountStr} due ${dueDateStr}`,
        html,
        text,
      });
    } catch (error) {
      console.error(`❌ Failed to send payment reminder to guardian ${guardianEmail}:`, error.message);
    }
  }
};