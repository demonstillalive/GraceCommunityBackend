const express = require('express');
const router = express.Router();

// Placeholder for reminder routes
// Can be extended for sending reminders, scheduling, etc.

router.get('/', (req, res) => {
  res.json({ message: 'Reminder routes' });
});

module.exports = router;
