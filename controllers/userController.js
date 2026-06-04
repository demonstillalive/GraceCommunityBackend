const User = require('../models/User');
const OTP = require('../models/OTP');
const { sendReminderEmail } = require('../utils/emailService');

// Register new user
exports.registerUser = async (req, res) => {
  try {
    const {
      email,
      name,
      mobile,
      sponsorName,
      sponsorMobile,
      currentRank,
      subscriptionDate,
      emailNotificationEnabled,
    } = req.body;

    // Verify OTP was verified first
    const otpRecord = await OTP.findOne({ email, verified: true });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Email not verified' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Prepare subscription dates - either from the nested object or individual fields
    let subscriptionDates = req.body.subscriptionDates || {};
    const rankNumber = parseInt(currentRank.replace('AMB', ''));

    // If subscriptionDates is empty, try to build from individual fields
    if (!subscriptionDates || Object.keys(subscriptionDates).length === 0) {
      subscriptionDates = {};
      for (let i = 1; i <= rankNumber; i++) {
        subscriptionDates[`AMB${i}`] = req.body[`AMB${i}SubscriptionDate`] || null;
      }
    }

    // Convert date strings to Date objects
    const convertedSubscriptionDates = {};
    for (let i = 1; i <= rankNumber; i++) {
      const key = `AMB${i}`;
      if (subscriptionDates[key]) {
        convertedSubscriptionDates[key] = new Date(subscriptionDates[key]);
      }
    }

    // Create new user
    const newUser = new User({
      email,
      name,
      mobile,
      sponsorName,
      sponsorMobile,
      currentRank,
      subscriptionDate: new Date(subscriptionDate),
      subscriptionDates: convertedSubscriptionDates,
      emailNotificationEnabled,
    });

    await newUser.save();

    // Clean up OTP
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

// Get user by email
exports.getUserByEmail = async (req, res) => {
  try {
    const { email } = req.params;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { email } = req.params;
    let updateData = { ...req.body };

    // Verify OTP was verified first
    const otpRecord = await OTP.findOne({ email, verified: true });
    if (!otpRecord) {
      return res.status(400).json({ error: 'Email must be verified with OTP before updating' });
    }

    // Get existing user to know their rank
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Convert subscription dates to proper Date objects
    if (updateData.subscriptionDates) {
      const convertedDates = {};
      const rankNumber = parseInt(updateData.currentRank?.replace('AMB', '') || existingUser.currentRank.replace('AMB', ''));
      
      for (let i = 1; i <= rankNumber; i++) {
        const key = `AMB${i}`;
        if (updateData.subscriptionDates[key]) {
          convertedDates[key] = new Date(updateData.subscriptionDates[key]);
        }
      }
      updateData.subscriptionDates = convertedDates;
    }

    // Convert subscriptionDate to Date object if present
    if (updateData.subscriptionDate && typeof updateData.subscriptionDate === 'string') {
      updateData.subscriptionDate = new Date(updateData.subscriptionDate);
    }

    const user = await User.findOneAndUpdate({ email }, updateData, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Clean up OTP after successful update
    await OTP.deleteOne({ _id: otpRecord._id });

    res.status(200).json({
      message: 'User updated successfully',
      user,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
};
