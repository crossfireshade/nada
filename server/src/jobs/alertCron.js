const cron = require('node-cron');
const Guide = require('../models/Guide');
const Winner = require('../models/Winner');
const Alert = require('../models/Alert');
const alertService = require('../services/alert.service');
const { ROLES } = require('../utils/constants');

/**
 * Guide not submitted — runs daily at 17:00
 * Guides with DRAFT status whose broadcastDate is tomorrow.
 * Notifies the guide creator (PRODUCTEUR) and RESPONSABLE_PRODUCTION.
 */
const guideNotSubmittedJob = cron.schedule('0 17 * * *', async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const y = tomorrow.getFullYear();
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const d = String(tomorrow.getDate()).padStart(2, '0');
    const tomorrowStr = `${y}-${m}-${d}`;

    const draftGuides = await Guide.find({ status: 'DRAFT', broadcastDate: tomorrowStr }).lean();
    for (const guide of draftGuides) {
      const programName = guide.programTitle || guide.theme;
      // Notify the guide creator
      if (guide.createdBy) {
        await alertService.createOrSkipAlert({
          severity: 'WARNING',
          messageKey: 'notifications.guideNotSubmitted',
          params: { programName },
          targetUserId: guide.createdBy,
          relatedEntityType: 'Guide',
          relatedEntityId: guide._id,
          dedupeKey: `guide_not_submitted:${guide._id}:creator`,
        });
      }
      // Notify Responsable Production
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'notifications.guideNotSubmitted',
        params: { programName },
        targetRole: ROLES.RESPONSABLE_PRODUCTION,
        relatedEntityType: 'Guide',
        relatedEntityId: guide._id,
        dedupeKey: `guide_not_submitted:${guide._id}:prod`,
      });
    }
  } catch (err) {
    console.error('[cron:guideNotSubmitted]', err.message);
  }
}, { scheduled: false });

/**
 * Validation overdue — runs every 30 minutes
 * Guides in SUBMITTED status for more than 4 hours without approval.
 */
const validationOverdueJob = cron.schedule('*/30 * * * *', async () => {
  try {
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const overdueGuides = await Guide.find({
      status: 'SUBMITTED',
      submittedAt: { $lte: fourHoursAgo },
    }).lean();

    for (const guide of overdueGuides) {
      const programName = guide.programTitle || guide.theme;
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'notifications.validationOverdue',
        params: { programName },
        targetRole: ROLES.RESPONSABLE_PRODUCTION,
        relatedEntityType: 'Guide',
        relatedEntityId: guide._id,
        dedupeKey: `validation_overdue:${guide._id}:${guide.submittedAt?.toISOString() || ''}`,
      });
    }
  } catch (err) {
    console.error('[cron:validationOverdue]', err.message);
  }
}, { scheduled: false });

/**
 * Winners not sent to publicity — runs daily at 09:00
 * Guides that are ARCHIVED or LIVE_IN_PROGRESS with unsent winners.
 * Notifies TECHNICIEN_COORDINATEUR.
 */
const winnersNotSentJob = cron.schedule('0 9 * * *', async () => {
  try {
    const unsentWinners = await Winner.find({ emailStatus: 'PENDING' })
      .populate({ path: 'guideId', select: 'status programTitle theme' })
      .lean();

    const seen = new Set();
    for (const winner of unsentWinners) {
      const guideId = winner.guideId?._id?.toString();
      if (!guideId || seen.has(guideId)) continue;
      seen.add(guideId);

      const guide = winner.guideId;
      if (!['LIVE_IN_PROGRESS', 'ARCHIVED'].includes(guide.status)) continue;

      const programName = guide.programTitle || guide.theme;
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'notifications.winnersNotSentToPublicity',
        params: { programName },
        targetRole: ROLES.TECHNICIEN_COORDINATEUR,
        relatedEntityType: 'Guide',
        relatedEntityId: guide._id,
        dedupeKey: `winners_not_sent:${guide._id}`,
      });
    }
  } catch (err) {
    console.error('[cron:winnersNotSent]', err.message);
  }
}, { scheduled: false });

/**
 * Monthly reset — runs on the 1st of every month at 00:01
 * Deletes all notifications so the bell starts fresh each month.
 */
const monthlyAlertResetJob = cron.schedule('1 0 1 * *', async () => {
  try {
    const result = await Alert.deleteMany({});
    console.log(`[cron:monthlyReset] Deleted ${result.deletedCount} alerts`);
  } catch (err) {
    console.error('[cron:monthlyReset]', err.message);
  }
}, { scheduled: false });

/**
 * Monthly blacklist reset — runs on the 1st of every month at 00:02
 * Clears the blacklisted flag so winners can participate again in the new month.
 */
const monthlyBlacklistResetJob = cron.schedule('2 0 1 * *', async () => {
  try {
    const result = await Winner.updateMany(
      { blacklisted: true },
      { $set: { blacklisted: false, blacklistedAt: null } }
    );
    console.log(`[cron:monthlyBlacklistReset] Reset ${result.modifiedCount} blacklisted winners`);
  } catch (err) {
    console.error('[cron:monthlyBlacklistReset]', err.message);
  }
}, { scheduled: false });

// ── Recurring guide jobs ──────────────────────────────────────────────────────
const recurringSvc = require('../services/recurringGuide.service');

/**
 * Every 30 minutes: mark late occurrences + send deadline reminders
 */
const recurringStatusJob = cron.schedule('*/30 * * * *', async () => {
  try {
    await recurringSvc.markLateOccurrences();
    await recurringSvc.sendDeadlineReminders();
  } catch (err) {
    console.error('[cron:recurringStatus]', err.message);
  }
}, { scheduled: false });

/**
 * Daily at 00:05: generate upcoming occurrences (rolling 4-week window)
 */
const recurringGenerateJob = cron.schedule('5 0 * * *', async () => {
  try {
    await recurringSvc.generateUpcomingOccurrences();
  } catch (err) {
    console.error('[cron:recurringGenerate]', err.message);
  }
}, { scheduled: false });

const startJobs = () => {
  guideNotSubmittedJob.start();
  validationOverdueJob.start();
  winnersNotSentJob.start();
  recurringStatusJob.start();
  recurringGenerateJob.start();
  monthlyAlertResetJob.start();
  monthlyBlacklistResetJob.start();
  console.log('Cron jobs started');
};

module.exports = { startJobs };
