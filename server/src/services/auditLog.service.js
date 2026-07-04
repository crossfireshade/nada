const AuditLog = require('../models/AuditLog');
const { getPagination, getSort } = require('../utils/helpers');

const log = async ({ actorId, action, entityType, entityId = null, meta = {} }) => {
  try {
    await AuditLog.create({ actorId, action, entityType, entityId, meta });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

const getLogs = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, ['timestamp', 'action', 'entityType']);

  const filter = {};
  if (query.actorId) filter.actorId = query.actorId;
  if (query.entityType) filter.entityType = query.entityType;
  if (query.action) filter.action = new RegExp(query.action, 'i');
  if (query.month) {
    const [y, m] = query.month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 1);
    filter.timestamp = { $gte: start, $lt: end };
  } else if (query.date) {
    const d = new Date(query.date + 'T00:00:00');
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    filter.timestamp = { $gte: d, $lt: next };
  }

  const [data, total] = await Promise.all([
    AuditLog.find(filter)
      .populate('actorId', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

module.exports = { log, getLogs };
