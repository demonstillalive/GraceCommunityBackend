const User = require('../models/User');
const ReminderLog = require('../models/ReminderLog');
const { sendReminderEmail } = require('./emailService');

const REMINDER_SCHEDULE = {
  7: { days: 7, type: '7_days' },
  5: { days: 5, type: '5_days' },
  2: { days: 2, type: '2_days_first' },
};

// Get subscription dates for a user (both base and rank-specific)
const getSubscriptionDates = (user) => {
  const dates = [];

  // Base $9 subscription
  if (user.subscriptionDate) {
    dates.push({
      date: user.subscriptionDate,
      type: 'base_9_subscription',
      label: '$9 Subscription',
      rankLabel: null,
    });
  }

  // AMB rank subscriptions
  if (user.subscriptionDates) {
    const rankNumber = parseInt(user.currentRank.replace('AMB', ''));
    for (let i = 1; i <= rankNumber; i++) {
      if (user.subscriptionDates[`AMB${i}`]) {
        dates.push({
          date: user.subscriptionDates[`AMB${i}`],
          type: 'amb_rank',
          label: 'AMB Rank Update',
          rankLabel: `AMB${i}`,
        });
      }
    }
  }

  return dates;
};

// Check if reminder already sent
const isReminderAlreadySent = async (userId, reminderType, targetDate, subscriptionType) => {
  const existing = await ReminderLog.findOne({
    userId,
    reminderType,
    targetDate: new Date(targetDate),
    subscriptionType,
    status: 'sent',
  });

  return !!existing;
};

// Calculate days until subscription expiry
const daysUntilDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiryDate = new Date(date);
  expiryDate.setHours(0, 0, 0, 0);

  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
};

// Send and log reminder
const sendAndLogReminder = async (user, reminderType, subscriptionInfo, emailContent) => {
  try {
    if (!user.emailNotificationEnabled) {
      console.log(`Email notifications disabled for ${user.email}, skipping reminder`);
      return;
    }

    const daysRemaining = daysUntilDate(subscriptionInfo.date);

    const emailData = {
      currentRank: user.currentRank,
      nextSubscriptionDate: subscriptionInfo.date.toLocaleDateString(),
      subscriptionLabel: subscriptionInfo.label,
      rankLabel: subscriptionInfo.rankLabel,
      daysRemaining,
      name: user.name,
      email: user.email,
      ...emailContent,
    };

    await sendReminderEmail(user.email, user.name, emailData);

    // Log the sent reminder
    await ReminderLog.create({
      userId: user._id,
      userEmail: user.email,
      reminderType,
      subscriptionType: subscriptionInfo.type,
      targetDate: subscriptionInfo.date,
      status: 'sent',
    });

    console.log(
      `Reminder sent: ${user.email} - ${reminderType} - ${subscriptionInfo.label}`
    );
  } catch (error) {
    console.error(`Error sending reminder to ${user.email}:`, error);

    // Log failed reminder
    await ReminderLog.create({
      userId: user._id,
      userEmail: user.email,
      reminderType,
      subscriptionType: subscriptionInfo.type,
      targetDate: subscriptionInfo.date,
      status: 'failed',
      errorMessage: error.message,
    });
  }
};

// Main scheduler function
const sendReminderEmails = async () => {
  try {
    console.log('[Reminder Scheduler] Starting scheduled email check...');

    // Fetch all active users with notifications enabled
    const users = await User.find({ emailNotificationEnabled: true });

    if (users.length === 0) {
      console.log('[Reminder Scheduler] No active users found');
      return;
    }

    let totalSent = 0;

    for (const user of users) {
      const subscriptions = getSubscriptionDates(user);

      for (const subscription of subscriptions) {
        const daysRemaining = daysUntilDate(subscription.date);

        // 7 days before
        if (daysRemaining === 7) {
          const alreadySent = await isReminderAlreadySent(
            user._id,
            '7_days',
            subscription.date,
            subscription.type
          );

          if (!alreadySent) {
            await sendAndLogReminder(user, '7_days', subscription, {
              emailTemplate: 'reminder_7_days',
              subject: `Grace Community - ${subscription.label} Reminder (7 Days)`,
              message: `Your ${subscription.label} expires in 7 days. Please update your membership or complete your AMB rank update.`,
            });
            totalSent++;
          }
        }

        // 5 days before
        if (daysRemaining === 5) {
          const alreadySent = await isReminderAlreadySent(
            user._id,
            '5_days',
            subscription.date,
            subscription.type
          );

          if (!alreadySent) {
            await sendAndLogReminder(user, '5_days', subscription, {
              emailTemplate: 'reminder_5_days',
              subject: `Grace Community - ${subscription.label} Renewal (5 Days Left)`,
              message: `Your ${subscription.label} expires in 5 days. Update your membership or AMB rank now.`,
            });
            totalSent++;
          }
        }

        // 2 days before - FIRST EMAIL
        if (daysRemaining === 2) {
          const alreadySent = await isReminderAlreadySent(
            user._id,
            '2_days_first',
            subscription.date,
            subscription.type
          );

          if (!alreadySent) {
            await sendAndLogReminder(user, '2_days_first', subscription, {
              emailTemplate: 'reminder_2_days_first',
              subject: `⚠️ URGENT: ${subscription.label} Expiring Soon!`,
              message: `Only 2 days left! Please renew your ${subscription.label} or update your AMB rank immediately.`,
            });
            totalSent++;
          }
        }

        // 2 days before - SECOND EMAIL (sent later in the day)
        if (daysRemaining === 2) {
          const alreadySent = await isReminderAlreadySent(
            user._id,
            '2_days_final_call',
            subscription.date,
            subscription.type
          );

          if (!alreadySent) {
            // Only send second email if at least 12 hours have passed since first
            const hoursSinceFirst = await ReminderLog.findOne({
              userId: user._id,
              reminderType: '2_days_first',
              targetDate: new Date(subscription.date),
              subscriptionType: subscription.type,
              status: 'sent',
            });

            if (!hoursSinceFirst) {
              // First email not sent yet, skip second
              continue;
            }

            const firstEmailTime = hoursSinceFirst.sentAt;
            const timeDiff = Date.now() - firstEmailTime;
            const hoursDiff = timeDiff / (1000 * 60 * 60);

            if (hoursDiff >= 12) {
              await sendAndLogReminder(user, '2_days_final_call', subscription, {
                emailTemplate: 'reminder_2_days_final',
                subject: `FINAL CALL: ${subscription.label} - Action Required!`,
                message: `This is your final reminder! Your ${subscription.label} expires in 2 days. Visit the Grace Community portal to renew or update.`,
              });
              totalSent++;
            }
          }
        }
      }
    }

    console.log(`[Reminder Scheduler] Completed. Total emails sent: ${totalSent}`);
  } catch (error) {
    console.error('[Reminder Scheduler] Error:', error);
  }
};

module.exports = {
  sendReminderEmails,
  getSubscriptionDates,
  daysUntilDate,
};
