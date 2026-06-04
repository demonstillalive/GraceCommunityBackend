const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  sponsorName: {
    type: String,
    required: true,
  },
  sponsorMobile: {
    type: String,
    required: true,
  },
  currentRank: {
    type: String,
    enum: ['AMB1', 'AMB2', 'AMB3', 'AMB4', 'AMB5', 'AMB6', 'AMB7'],
    required: true,
  },
  subscriptionDate: {
    type: Date,
    required: true,
  },
  subscriptionDates: {
    AMB1: { type: Date },
    AMB2: { type: Date },
    AMB3: { type: Date },
    AMB4: { type: Date },
    AMB5: { type: Date },
    AMB6: { type: Date },
    AMB7: { type: Date },
  },
  emailNotificationEnabled: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('User', UserSchema);
