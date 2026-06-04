const express = require('express');
const router = express.Router();
const {
  registerUser,
  getUserByEmail,
  updateUser,
} = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// Register new user
router.post('/register', registerUser);

// Get user by email
router.get('/:email', getUserByEmail);

// Update user (protected)
router.put('/:email/admin', authMiddleware, updateUser);

// Update user (unprotected - for OTP verified users)
router.put('/:email', updateUser);

module.exports = router;
