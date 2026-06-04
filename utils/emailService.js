const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Hostinger SMTP Configuration
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.hostinger.com',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: process.env.EMAIL_SECURE === 'true' || true, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Grace Community Reminder - OTP Verification',
    html: `
      <h2>Email Verification</h2>
      <p>Your OTP is: <strong>${otp}</strong></p>
      <p>This OTP will expire in 10 minutes.</p>
      <p>Do not share this OTP with anyone.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP sent to ${email}`);
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

const sendReminderEmail = async (email, userName, reminderData) => {
  let emailSubject = reminderData.subject || 'Grace Community - Subscription Reminder';
  let emailHtml = '';

  const template = reminderData.emailTemplate || 'default';
  const subscriptionLabel = reminderData.subscriptionLabel || 'Subscription';
  const daysRemaining = reminderData.daysRemaining || 0;

  // Email templates based on days remaining
  if (template === 'reminder_7_days') {
    emailHtml = `
      <h2>Hello ${userName},</h2>
      <p style="font-size: 16px; color: #2c3e50;">Your ${subscriptionLabel} expires in <strong>7 days</strong>!</p>
      <div style="background-color: #e8f4f8; border-left: 4px solid #3498db; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>📅 ${subscriptionLabel} Details:</strong></p>
        <p>Current Rank: ${reminderData.currentRank}</p>
        <p>Expiry Date: ${reminderData.nextSubscriptionDate}</p>
        <p>Days Remaining: <strong>${daysRemaining}</strong></p>
      </div>
      <p style="font-size: 14px; color: #7f8c8d;">It's time to plan your subscription renewal or AMB rank update!</p>
      <p><a href="${process.env.FRONTEND_URL}/register-form" style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Update Now</a></p>
      <p style="font-size: 12px; color: #95a5a6; margin-top: 30px;">Thank you for being part of Grace Community!</p>
    `;
  } else if (template === 'reminder_5_days') {
    emailHtml = `
      <h2>Hello ${userName},</h2>
      <p style="font-size: 16px; color: #e67e22;">⏰ Your ${subscriptionLabel} expires in <strong>5 days</strong>!</p>
      <div style="background-color: #fef5e7; border-left: 4px solid #e67e22; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>📅 ${subscriptionLabel} Details:</strong></p>
        <p>Current Rank: ${reminderData.currentRank}</p>
        <p>Expiry Date: ${reminderData.nextSubscriptionDate}</p>
        <p>Days Remaining: <strong>${daysRemaining}</strong></p>
      </div>
      <p style="font-size: 14px; color: #7f8c8d;">Don't miss the deadline! Update your membership or complete your AMB rank update.</p>
      <p><a href="${process.env.FRONTEND_URL}/register-form" style="background-color: #e67e22; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Renew Now</a></p>
      <p style="font-size: 12px; color: #95a5a6; margin-top: 30px;">Thank you for being part of Grace Community!</p>
    `;
  } else if (template === 'reminder_2_days_first') {
    emailHtml = `
      <h2 style="color: #c0392b;">⚠️ URGENT: ${userName}!</h2>
      <p style="font-size: 16px; color: #c0392b;">Your ${subscriptionLabel} expires in <strong>ONLY 2 DAYS</strong>!</p>
      <div style="background-color: #fadbd8; border-left: 4px solid #c0392b; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>🚨 ${subscriptionLabel} Details:</strong></p>
        <p>Current Rank: ${reminderData.currentRank}</p>
        <p>Expiry Date: ${reminderData.nextSubscriptionDate}</p>
        <p style="color: #c0392b; font-weight: bold;">Days Remaining: ${daysRemaining}</p>
      </div>
      <p style="font-size: 14px; color: #7f8c8d;">This is a final call! Please take action immediately to avoid any interruption in your membership or rank status.</p>
      <p><a href="${process.env.FRONTEND_URL}/register-form" style="background-color: #c0392b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">⚡ Update Immediately</a></p>
      <p style="font-size: 12px; color: #95a5a6; margin-top: 30px;">Thank you for being part of Grace Community!</p>
    `;
  } else if (template === 'reminder_2_days_final') {
    emailHtml = `
      <h2 style="color: #8b0000; text-align: center;">🔴 FINAL CALL!</h2>
      <p style="font-size: 18px; color: #8b0000; text-align: center; font-weight: bold;">Your ${subscriptionLabel} expires in 2 DAYS!</p>
      <div style="background-color: #ffe0e0; border: 3px solid #8b0000; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p style="text-align: center;"><strong>🚨 IMMEDIATE ACTION REQUIRED</strong></p>
        <p><strong>📅 ${subscriptionLabel} Details:</strong></p>
        <p>Current Rank: ${reminderData.currentRank}</p>
        <p>Expiry Date: ${reminderData.nextSubscriptionDate}</p>
        <p style="color: #8b0000; font-weight: bold; text-align: center;">⏳ Time is running out!</p>
      </div>
      <p style="font-size: 14px; color: #7f8c8d;">This is your last reminder before your ${subscriptionLabel} expires. Visit the Grace Community portal now to renew your membership or complete your AMB rank update.</p>
      <p style="text-align: center;"><a href="${process.env.FRONTEND_URL}/register-form" style="background-color: #8b0000; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">🎯 ACT NOW - Update Your Membership</a></p>
      <p style="font-size: 12px; color: #95a5a6; margin-top: 30px; text-align: center;">Thank you for being part of Grace Community!</p>
    `;
  } else {
    // Default template
    emailHtml = `
      <h2>Hello ${userName},</h2>
      <p>This is your subscription reminder from Grace Community.</p>
      <div style="background-color: #f0f0f0; padding: 20px; border-radius: 5px;">
        <p><strong>Subscription Details:</strong></p>
        <p>Current Rank: ${reminderData.currentRank}</p>
        <p>Next Subscription Date: ${reminderData.nextSubscriptionDate}</p>
      </div>
      <p>Thank you for being part of Grace Community!</p>
    `;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: emailSubject,
    html: emailHtml,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Reminder email sent to ${email}`);
  } catch (error) {
    console.error('Error sending reminder email:', error);
    throw error;
  }
};

// Verify email connection on startup
const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email service connected successfully (Hostinger SMTP)');
    return true;
  } catch (error) {
    console.error('❌ Email connection failed:', error.message);
    console.error('Please check your Hostinger email credentials in .env file');
    return false;
  }
};

module.exports = {
  transporter,
  verifyEmailConnection,
  sendOTPEmail,
  sendReminderEmail,
};
