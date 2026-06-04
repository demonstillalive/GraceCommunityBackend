const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

// Test Hostinger SMTP connection
const testEmailConnection = async () => {
  console.log('\n🔍 Testing Hostinger Email Connection...\n');
  console.log('Settings:');
  console.log(`  Host: ${process.env.EMAIL_HOST}`);
  console.log(`  Port: ${process.env.EMAIL_PORT}`);
  console.log(`  Email: ${process.env.EMAIL_USER}`);
  console.log(`  Secure (TLS/SSL): ${process.env.EMAIL_SECURE === 'true'}\n`);

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SUCCESS! Email connection verified.\n');

    // Try sending a test email
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Grace Community - Email Configuration Test',
      html: `
        <h2>✅ Email Configuration Successful!</h2>
        <p>This test email confirms that Hostinger SMTP is correctly configured.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p>You can now use the Grace Community application.</p>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log(`   Message ID: ${result.messageId}\n`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Email connection FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nTroubleshooting steps:');
    console.error('1. Verify .env file has correct EMAIL_USER and EMAIL_PASSWORD');
    console.error('2. Ensure EMAIL_HOST is "smtp.hostinger.com" and PORT is 465');
    console.error('3. Check Hostinger Email Account Settings:');
    console.error('   - IMAP/POP3 and SMTP must be enabled');
    console.error('   - Email account must be active');
    console.error('4. Contact Hostinger support if still having issues\n');
    process.exit(1);
  }
};

// Run test if this file is executed directly
if (require.main === module) {
  testEmailConnection();
}

module.exports = testEmailConnection;
