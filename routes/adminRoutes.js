const express = require('express');
const router = express.Router();
const {
  adminLogin,
  getAllUsers,
  getUserDetails,
  getUpcomingSubscriptions,
  getDashboardStats,
  toggleEmailNotification,
  toggleNotificationByEmail,
  sendSubscriptionReminder,
  sendCustomEmail,
} = require('../controllers/adminController');
const { adminAuthMiddleware } = require('../middleware/auth');

// Admin Login (Hidden route - not advertised in docs)
router.post('/login', adminLogin);

// Get dashboard statistics
router.get('/dashboard/stats', adminAuthMiddleware, getDashboardStats);

// Get all users with filters
router.get('/users/all', adminAuthMiddleware, getAllUsers);

// Get upcoming subscriptions
router.get('/subscriptions/upcoming', adminAuthMiddleware, getUpcomingSubscriptions);

// Get specific user details
router.get('/users/:userId', adminAuthMiddleware, getUserDetails);

// Toggle email notification for user by ID
router.put('/users/:userId/notification', adminAuthMiddleware, toggleEmailNotification);

// Toggle email notification for user by email
router.put('/users/email/:email/notification', adminAuthMiddleware, toggleNotificationByEmail);

// Send subscription reminder emails
router.post('/send-subscription-reminder', adminAuthMiddleware, sendSubscriptionReminder);

// Send custom email to users
router.post('/send-custom-email', adminAuthMiddleware, sendCustomEmail);

module.exports = router;
