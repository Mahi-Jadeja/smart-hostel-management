import nodemailer from 'nodemailer';
import config from '../config/env.js';
import dns from 'dns';

/**
 * Create a reusable email transporter.
 *
 * Nodemailer "transporters" handle the connection to the SMTP server.
 * We create it once and reuse it to avoid reconnecting on every email.
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,

  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },

  requireTLS: true,

  // ✅ FORCE IPv4 PROPERLY
  lookup: (hostname, options, callback) => {
    return dns.lookup(hostname, { family: 4 }, callback);
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

/**
 * Send a password reset email to the user.
 *
 * @param {string} to        - Recipient email address
 * @param {string} name      - Recipient's name (for personalisation)
 * @param {string} resetUrl  - Full reset URL with raw token
 *                             e.g. https://app.com/reset-password/abc123
 * @returns {Promise<void>}
 */
export const sendPasswordResetEmail = async (to, name, resetUrl) => {
  const subject = 'IntelliHostel — Password Reset Request';

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px 40px;">
        <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
          🏠 IntelliHostel
        </h1>
        <p style="margin: 8px 0 0; color: #bfdbfe; font-size: 14px;">
          Smart Hostel Management System
        </p>
      </div>

      <!-- Body -->
      <div style="padding: 40px;">
        <h2 style="margin: 0 0 8px; color: #1e293b; font-size: 20px; font-weight: 600;">
          Password Reset Request
        </h2>
        <p style="margin: 0 0 24px; color: #64748b; font-size: 15px; line-height: 1.6;">
          Hi ${name}, we received a request to reset the password for your IntelliHostel account.
        </p>

        <!-- Info Box -->
        <div style="background: #f1f5f9; border-radius: 8px; padding: 16px 20px; margin-bottom: 28px;">
          <p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.6;">
            ⏱️ <strong>This link expires in 30 minutes.</strong><br/>
            If you did not request a password reset, you can safely ignore this email.
            Your password will remain unchanged.
          </p>
        </div>

        <!-- Reset Button -->
        <div style="text-align: center; margin-bottom: 32px;">
          <a
            href="${resetUrl}"
            style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600; font-size: 15px; letter-spacing: 0.3px; box-shadow: 0 4px 12px rgba(30,64,175,0.35);"
          >
            Reset My Password
          </a>
        </div>

        <!-- Fallback URL -->
        <p style="margin: 0 0 8px; color: #94a3b8; font-size: 12px; text-align: center;">
          Button not working? Copy and paste this link into your browser:
        </p>
        <p style="margin: 0; word-break: break-all; color: #3b82f6; font-size: 12px; text-align: center; font-family: monospace;">
          ${resetUrl}
        </p>
      </div>

      <!-- Footer -->
      <div style="background: #f8fafc; padding: 20px 40px; border-top: 1px solid #e2e8f0;">
        <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center; line-height: 1.6;">
          This email was sent by IntelliHostel — Symbiosis Institute of Technology, Pune.<br/>
          If you did not request this, please ignore this email.
        </p>
      </div>

    </div>
  `;

  const text = `
    IntelliHostel — Password Reset Request

    Hi ${name},

    We received a request to reset your IntelliHostel account password.

    Click the link below to reset your password (expires in 30 minutes):
    ${resetUrl}

    If you did not request this, please ignore this email.
    Your password will remain unchanged.

    — IntelliHostel Team
  `;

  await sendEmail({ to, subject, html, text });
};