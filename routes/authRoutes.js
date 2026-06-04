const express = require('express');
const router = express.Router();
const { sendOTP, verifyOTP } = require('../controllers/authController');

// Send OTP to email
router.post('/send-otp', sendOTP);

// Verify OTP
router.post('/verify-otp', verifyOTP);

module.exports = router;
