const mongoose = require('mongoose');

const ReminderLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userEmail: {
    type: String,
    required: true,
  },
  reminderType: {
    type: String,
    enum: ['7_days', '5_days', '2_days_first', '2_days_second'],
    required: true,
  },
  subscriptionType: {
    type: String,
    enum: ['base_9_subscription', 'amb_rank'],
    required: true,
  },
  targetDate: {
    type: Date,
    required: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['sent', 'failed', 'pending'],
    default: 'sent',
  },
  errorMessage: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ReminderLog', ReminderLogSchema);
