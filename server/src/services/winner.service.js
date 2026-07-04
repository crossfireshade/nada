const Winner = require('../models/Winner');
const User = require('../models/User');
const emailService = require('./email.service');
const alertService = require('./alert.service');
const { ROLES } = require('../utils/constants');

const sendWinnersToPublicity = async (guideId, actorId) => {
  const winners = await Winner.find({ guideId }).populate('guideId', 'programTitle theme');
  if (!winners.length) {
    throw Object.assign(new Error('No winners found for this guide'), { statusCode: 404 });
  }

  const guide = winners[0]?.guideId;
  const programName = guide?.programTitle || guide?.theme || '';

  const publicityUsers = await User.find({
    role: ROLES.RESPONSABLE_PUBLICITE,
    active: true,
  }).lean();

  if (!publicityUsers.length) {
    throw Object.assign(new Error('No publicity users found'), { statusCode: 404 });
  }

  const now = new Date();
  const results = [];

  for (const pu of publicityUsers) {
    try {
      await emailService.sendWinnersEmail(pu.email, winners, guideId);
      results.push({ email: pu.email, status: 'SENT' });
    } catch (err) {
      console.error(`Failed to send winner email to ${pu.email}:`, err.message);
      results.push({ email: pu.email, status: 'FAILED' });
    }
  }

  // Check if winners were previously sent BEFORE marking them as sent now
  const previouslySent = await Winner.exists({ guideId, emailStatus: 'SENT' });

  // Mark winners as sent
  await Winner.updateMany(
    { guideId },
    { sentToPublicityAt: now, emailStatus: 'SENT' }
  );

  // Notify each RESPONSABLE_PUBLICITE user
  try {
    const messageKey = previouslySent ? 'notifications.winnersUpdated' : 'notifications.winnersReceived';
    const dedupeKeySuffix = now.toISOString();
    await alertService.createOrSkipAlert({
      severity: 'INFO',
      messageKey,
      params: { programName },
      targetRole: ROLES.RESPONSABLE_PUBLICITE,
      relatedEntityType: 'Guide',
      relatedEntityId: guideId,
      dedupeKey: `winners_sent:${guideId}:${dedupeKeySuffix}`,
    });
  } catch (notifErr) {
    console.error('[winner.service] notification error:', notifErr?.message);
  }

  return results;
};

module.exports = { sendWinnersToPublicity };
