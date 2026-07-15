const cron = require('node-cron');
const prisma = require('../config/db');
const { STATUS, OVERDUE_THRESHOLD_DAYS } = require('../utils/constants');

/**
 * Executes the overdue ticket detection logic in the database.
 * 
 * Compares non-resolved complaints against the threshold date and
 * marks them as overdue. It also clears overdue statuses for resolved tickets.
 * 
 * Unnecessary database writes are avoided by only querying and updating
 * complaints that actually require status changes.
 */
async function checkOverdueComplaints() {
  try {
    const overdueThreshold = new Date(
      Date.now() - OVERDUE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000
    );

    // 1. Mark unresolved complaints created before threshold as overdue
    // Only target those where isOverdue is currently false to avoid redundant writes.
    const markOverdueResult = await prisma.complaint.updateMany({
      where: {
        status: { not: STATUS.RESOLVED },
        createdAt: { lt: overdueThreshold },
        isOverdue: false,
      },
      data: {
        isOverdue: true,
      },
    });

    if (markOverdueResult.count > 0) {
      console.log(`[Scheduler] Marked ${markOverdueResult.count} complaints as overdue.`);
    }

    // 2. Clear overdue flags for resolved complaints
    // Only target those where isOverdue is currently true to avoid redundant writes.
    const clearOverdueResult = await prisma.complaint.updateMany({
      where: {
        status: STATUS.RESOLVED,
        isOverdue: true,
      },
      data: {
        isOverdue: false,
      },
    });

    if (clearOverdueResult.count > 0) {
      console.log(`[Scheduler] Cleared overdue flag for ${clearOverdueResult.count} resolved complaints.`);
    }
  } catch (error) {
    console.error('[Scheduler] Error running overdue detection task:', error.message);
  }
}

/**
 * Initializes the cron scheduler for background tasks.
 * Starts when server.js bootstrap runs.
 */
function initScheduler() {
  const cronInterval = process.env.CRON_OVERDUE_INTERVAL || '*/30 * * * *'; // Default to every 30 minutes
  
  console.log(`[Scheduler] Initializing overdue complaint detection with schedule: "${cronInterval}"`);
  
  // Run on startup once to ensure database alignment
  checkOverdueComplaints();

  // Schedule the recurring task
  cron.schedule(cronInterval, async () => {
    await checkOverdueComplaints();
  });
}

module.exports = {
  checkOverdueComplaints,
  initScheduler,
};
