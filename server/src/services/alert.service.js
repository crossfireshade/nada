const Alert = require('../models/Alert');
const { getPagination, getSort } = require('../utils/helpers');

const createAlert = async ({
  severity = 'INFO',
  messageKey = '',
  params = {},
  message = '',
  targetRole = null,
  targetUserId = null,
  relatedEntityType = null,
  relatedEntityId = null,
  relatedMeta = {},
  dedupeKey = null,
}) => {
  return Alert.create({
    severity,
    messageKey,
    params,
    message,
    targetRole,
    targetUserId,
    relatedEntityType,
    relatedEntityId,
    relatedMeta,
    dedupeKey,
  });
};

/**
 * Create an alert only if no active (non-deleted) alert with the same dedupeKey exists.
 * If dedupeKey is null, always creates a new alert.
 */
const createOrSkipAlert = async (options) => {
  const { dedupeKey } = options;
  if (dedupeKey) {
    const existing = await Alert.findOne({ dedupeKey, isDeleted: false });
    if (existing) return null;
  }
  try {
    return await createAlert(options);
  } catch (err) {
    if (err.code === 11000) return null; // duplicate key race condition
    throw err;
  }
};

const getAlerts = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, ['createdAt', 'status']);

  const filter = {
    isDeleted: false,
    $or: [{ targetUserId: user._id }, { targetRole: user.role }],
  };
  if (query.status) filter.status = query.status;

  const [data, total] = await Promise.all([
    Alert.find(filter)
      .populate('targetUserId', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Alert.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

const markRead = async (alertId, userId) => {
  const alert = await Alert.findById(alertId);
  if (!alert) throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
  alert.status = 'READ';
  await alert.save();
  return alert;
};

const markAllRead = async (user) => {
  await Alert.updateMany(
    {
      isDeleted: false,
      status: 'UNREAD',
      $or: [{ targetUserId: user._id }, { targetRole: user.role }],
    },
    { status: 'READ' }
  );
};

const deleteAlert = async (alertId) => {
  const alert = await Alert.findById(alertId);
  if (!alert) throw Object.assign(new Error('Alert not found'), { statusCode: 404 });
  alert.isDeleted = true;
  await alert.save();
  return alert;
};

// kept for backward compat
const dismiss = deleteAlert;

module.exports = { createAlert, createOrSkipAlert, getAlerts, markRead, markAllRead, deleteAlert, dismiss };
