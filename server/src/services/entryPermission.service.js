const EntryPermission = require('../models/EntryPermission');
const EntryPermissionGuest = require('../models/EntryPermissionGuest');
const { getPagination, getSort } = require('../utils/helpers');

const getTodayInbox = async () => {
  // Show all PENDING/RECEIVED entry permissions (not just today's date)
  // so the receptionist never misses an auto-generated permission
  const permissions = await EntryPermission.find({
    status: { $in: ['PENDING', 'RECEIVED', 'VALIDATED'] },
  })
    .sort({ createdAt: -1 })
    .populate('guideId', 'theme status programTitle broadcastDate startTime endTime')
    .populate('createdByUserId', 'name email role')
    .lean();

  const permIds = permissions.map((p) => p._id);
  const guests = await EntryPermissionGuest.find({ entryPermissionId: { $in: permIds } }).lean();

  const guestMap = {};
  for (const g of guests) {
    const pid = String(g.entryPermissionId);
    if (!guestMap[pid]) guestMap[pid] = [];
    guestMap[pid].push(g);
  }

  return permissions.map((p) => ({ ...p, guests: guestMap[String(p._id)] || [] }));
};

const getEntryPermissions = async (query, user) => {
  const { page, limit, skip } = getPagination(query);
  const sort = getSort(query, ['date', 'status', 'createdAt']);

  const filter = {};
  // Filter by owner unless admin, receptionist, or responsable production (who needs to approve)
  if (
    user &&
    user.role !== 'RESPONSABLE_ADMINISTRATIF' &&
    user.role !== 'RECEPTIONNISTE_POLICIER' &&
    user.role !== 'RESPONSABLE_PRODUCTION'
  ) {
    filter.createdByUserId = user._id;
  }
  if (query.status) filter.status = query.status;
  if (query.date) {
    const d = new Date(query.date);
    const dayStart = new Date(d.setHours(0, 0, 0, 0));
    const dayEnd = new Date(new Date(query.date).setHours(23, 59, 59, 999));
    filter.date = { $gte: dayStart, $lte: dayEnd };
  }

  const [data, total] = await Promise.all([
    EntryPermission.find(filter)
      .populate('guideId', 'theme status programTitle broadcastDate startTime endTime')
      .populate('createdByUserId', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    EntryPermission.countDocuments(filter),
  ]);

  const permIds = data.map((p) => p._id);
  const guests = await EntryPermissionGuest.find({ entryPermissionId: { $in: permIds } }).lean();
  const guestMap = {};
  for (const g of guests) {
    const pid = String(g.entryPermissionId);
    if (!guestMap[pid]) guestMap[pid] = [];
    guestMap[pid].push(g);
  }
  const dataWithGuests = data.map((p) => ({ ...p, guests: guestMap[String(p._id)] || [] }));

  return { data: dataWithGuests, total, page, limit };
};

module.exports = { getTodayInbox, getEntryPermissions };
