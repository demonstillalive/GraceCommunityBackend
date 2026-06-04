const Admin = require('../models/Admin');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendReminderEmail } = require('../utils/emailService');

// Admin Login (Hidden Route)
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== process.env.ADMIN_EMAIL) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // For simplicity, compare directly with env password (in production use proper hash)
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Admin login successful',
      token,
    });
  } catch (error) {
    console.error('Error logging in admin:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

// Get all users with filters
exports.getAllUsers = async (req, res) => {
  try {
    const { rank, upcomingDaysFilter } = req.query;

    let filter = {};

    // Filter by rank if provided
    if (rank) {
      filter.currentRank = rank;
    }

    // Filter by upcoming subscription (9$ subscription - base subscription)
    if (upcomingDaysFilter) {
      const days = parseInt(upcomingDaysFilter);
      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      filter.subscriptionDate = {
        $gte: today,
        $lte: futureDate,
      };
    }

    const users = await User.find(filter).select(
      'name email mobile sponsorName sponsorMobile currentRank subscriptionDate subscriptionDates'
    );

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};

// Get user details by ID
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
};

// Get users with upcoming subscriptions
exports.getUpcomingSubscriptions = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const users = await User.find({
      subscriptionDate: {
        $gte: today,
        $lte: futureDate,
      },
    }).select(
      'name email mobile sponsorName sponsorMobile currentRank subscriptionDate subscriptionDates emailNotificationEnabled'
    );

    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching upcoming subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming subscriptions' });
  }
};

// Statistics dashboard
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const rankCounts = await User.aggregate([
      {
        $group: {
          _id: '$currentRank',
          count: { $sum: 1 },
        },
      },
    ]);

    const upcomingIn7Days = await User.countDocuments({
      subscriptionDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const notificationsEnabled = await User.countDocuments({
      emailNotificationEnabled: true,
    });

    res.status(200).json({
      totalUsers,
      rankDistribution: rankCounts,
      upcomingIn7Days,
      notificationsEnabled,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
};

// Toggle user email notifications
exports.toggleEmailNotification = async (req, res) => {
  try {
    const { userId } = req.params;
    const { emailNotificationEnabled } = req.body;

    if (typeof emailNotificationEnabled !== 'boolean') {
      return res.status(400).json({ error: 'emailNotificationEnabled must be boolean' });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { emailNotificationEnabled },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: `Email notifications ${emailNotificationEnabled ? 'enabled' : 'disabled'} for user`,
      user,
    });
  } catch (error) {
    console.error('Error toggling email notification:', error);
    res.status(500).json({ error: 'Failed to toggle email notification' });
  }
};

// Send subscription reminder emails to users with upcoming subscriptions
exports.sendSubscriptionReminder = async (req, res) => {
  try {
    const { days = 7, subscriptionType = 'all' } = req.body;
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    let users = [];

    if (subscriptionType === 'base' || subscriptionType === 'all') {
      const baseUsers = await User.find({
        subscriptionDate: { $gte: today, $lte: futureDate },
        emailNotificationEnabled: true,
      });
      users = users.concat(baseUsers.map(u => ({ ...u.toObject(), _subscriptionLabel: '$9 Monthly Subscription', _subscriptionDate: u.subscriptionDate })));
    }

    if (subscriptionType === 'amb' || subscriptionType === 'all') {
      const ambUsers = await User.find({
        $or: [
          { 'subscriptionDates.AMB1': { $gte: today, $lte: futureDate } },
          { 'subscriptionDates.AMB2': { $gte: today, $lte: futureDate } },
          { 'subscriptionDates.AMB3': { $gte: today, $lte: futureDate } },
          { 'subscriptionDates.AMB4': { $gte: today, $lte: futureDate } },
          { 'subscriptionDates.AMB5': { $gte: today, $lte: futureDate } },
          { 'subscriptionDates.AMB6': { $gte: today, $lte: futureDate } },
          { 'subscriptionDates.AMB7': { $gte: today, $lte: futureDate } },
        ],
        emailNotificationEnabled: true,
      });

      ambUsers.forEach(u => {
        const userObj = u.toObject();
        for (let i = 1; i <= 7; i++) {
          const ambKey = `AMB${i}`;
          const ambDate = userObj.subscriptionDates?.[ambKey];
          if (ambDate && ambDate >= today && ambDate <= futureDate) {
            users.push({
              ...userObj,
              _subscriptionLabel: `${ambKey} Subscription`,
              _subscriptionDate: ambDate,
            });
          }
        }
      });
    }

    if (users.length === 0) {
      return res.status(200).json({ message: 'No users with upcoming subscriptions found', sentCount: 0 });
    }

    let sentCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        const daysRemaining = Math.ceil((new Date(user._subscriptionDate) - today) / (1000 * 60 * 60 * 24));
        const template = daysRemaining <= 2 ? 'reminder_2_days_first' : daysRemaining <= 5 ? 'reminder_5_days' : 'reminder_7_days';

        await sendReminderEmail(user.email, user.name, {
          subject: `Grace Community - ${user._subscriptionLabel} Reminder`,
          subscriptionLabel: user._subscriptionLabel,
          daysRemaining,
          currentRank: user.currentRank,
          nextSubscriptionDate: new Date(user._subscriptionDate).toLocaleDateString(),
          emailTemplate: template,
        });
        sentCount++;
      } catch (err) {
        errors.push({ email: user.email, error: err.message });
      }
    }

    res.status(200).json({
      message: `Sent ${sentCount} reminder emails`,
      sentCount,
      totalFound: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending subscription reminders:', error);
    res.status(500).json({ error: 'Failed to send subscription reminders' });
  }
};

// Send custom email to one or more users
exports.sendCustomEmail = async (req, res) => {
  try {
    const { userIds, subject, message } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    let users = [];
    if (userIds && userIds.length > 0) {
      users = await User.find({ _id: { $in: userIds } });
    } else {
      // If no specific users, send to all with notifications enabled
      users = await User.find({ emailNotificationEnabled: true });
    }

    if (users.length === 0) {
      return res.status(404).json({ error: 'No users found to send email' });
    }

    const { transporter } = require('../utils/emailService');
    let sentCount = 0;
    const errors = [];

    for (const user of users) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: user.email,
          subject: subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2 style="color: #2c3e50;">Hello ${user.name},</h2>
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; border-left: 4px solid #3498db;">
                ${message.replace(/\n/g, '<br>')}
              </div>
              <br>
              <p style="color: #7f8c8d; font-size: 12px;">This is an official communication from Grace Community.</p>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        sentCount++;
      } catch (err) {
        errors.push({ email: user.email, error: err.message });
      }
    }

    res.status(200).json({
      message: `Custom email sent to ${sentCount} user(s)`,
      sentCount,
      totalTargeted: users.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error sending custom email:', error);
    res.status(500).json({ error: 'Failed to send custom email' });
  }
};

// Disable all notifications for a user by email
exports.toggleNotificationByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const { emailNotificationEnabled } = req.body;

    if (typeof emailNotificationEnabled !== 'boolean') {
      return res.status(400).json({ error: 'emailNotificationEnabled must be boolean' });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { emailNotificationEnabled },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({
      message: `Email notifications ${emailNotificationEnabled ? 'enabled' : 'disabled'}`,
      user,
    });
  } catch (error) {
    console.error('Error toggling notification by email:', error);
    res.status(500).json({ error: 'Failed to toggle notification' });
  }
};
