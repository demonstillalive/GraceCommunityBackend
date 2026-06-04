const cron = require('node-cron');
const { sendReminderEmails } = require('./reminderScheduler');

let scheduledTask = null;

// Initialize the reminder scheduler
const initializeReminderScheduler = () => {
  // Run every day at 9:00 AM (09:00)
  scheduledTask = cron.schedule('0 9 * * *', () => {
    console.log('[Cron Job] Running reminder scheduler at', new Date());
    sendReminderEmails();
  });

  console.log('✅ Reminder scheduler initialized - runs daily at 9:00 AM');

  // Also run immediately on server start (useful for testing)
  // Uncomment below for development testing
  // sendReminderEmails();
};

// Stop the scheduler
const stopReminderScheduler = () => {
  if (scheduledTask) {
    scheduledTask.stop();
    console.log('❌ Reminder scheduler stopped');
  }
};

// Manually trigger for testing
const triggerReminderScheduler = () => {
  console.log('[Manual Trigger] Running reminder scheduler');
  sendReminderEmails();
};

module.exports = {
  initializeReminderScheduler,
  stopReminderScheduler,
  triggerReminderScheduler,
};
