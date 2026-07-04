const RecurringGuide = require('../models/RecurringGuide');
const GuideOccurrence = require('../models/GuideOccurrence');
const alertService = require('./alert.service');
const { ROLES } = require('../utils/constants');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert weekday (0=Mon…6=Sun) to JS getDay() value (0=Sun, 1=Mon…)
 */
const toJsDay = (wd) => (wd + 1) % 7;

/**
 * Build a Date from a date + "HH:MM" time string (local time)
 */
const buildDateTime = (date, timeStr) => {
  const d = new Date(date);
  const [h, m] = timeStr.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
};

/**
 * Get the next calendar date matching weekday (0=Mon…6=Sun)
 * starting from `fromDate` (inclusive check: if today matches, returns today).
 */
const getNextDate = (weekday, fromDate = new Date()) => {
  const jsDay = toJsDay(weekday);
  const today = new Date(fromDate);
  today.setHours(0, 0, 0, 0);
  const todayJs = today.getDay();
  let diff = jsDay - todayJs;
  if (diff < 0) diff += 7;
  const result = new Date(today);
  result.setDate(today.getDate() + diff);
  return result;
};

/**
 * Generate occurrence documents for a template for `weeksAhead` weeks.
 * Skips if occurrence already exists for that scheduledDate.
 */
const buildOccurrences = (template, weeksAhead = 4, startFrom = new Date()) => {
  const firstDate = getNextDate(template.weekday, startFrom);
  const results = [];
  for (let w = 0; w < weeksAhead; w++) {
    const occDate = new Date(firstDate);
    occDate.setDate(firstDate.getDate() + w * 7);
    occDate.setHours(0, 0, 0, 0);

    const broadcastDateTime = buildDateTime(occDate, template.startTime);
    const submissionDeadline = new Date(
      broadcastDateTime.getTime() - template.submissionDeadlineHours * 60 * 60 * 1000
    );

    results.push({
      templateId: template._id,
      programName: template.programName,
      weekday: template.weekday,
      scheduledDate: occDate,
      startTime: template.startTime,
      endTime: template.endTime,
      broadcastDateTime,
      submissionDeadline,
      submissionDeadlineHours: template.submissionDeadlineHours,
      status: 'PLANNED',
      producerId: template.producerId,
      productionChiefId: template.productionChiefId || null,
    });
  }
  return results;
};

// ── CRUD: Templates ───────────────────────────────────────────────────────────

const createTemplate = async (data, userId) => {
  const template = await RecurringGuide.create({ ...data, createdBy: userId });

  // Generate initial occurrences
  const occurrences = buildOccurrences(template, template.weeksAhead || 4);
  if (occurrences.length) {
    await GuideOccurrence.insertMany(occurrences, { ordered: false }).catch(() => {});
  }

  // Notify producer
  await alertService.createOrSkipAlert({
    severity: 'INFO',
    messageKey: 'recurring.newTemplateAssigned',
    params: { programName: template.programName },
    targetUserId: template.producerId,
    relatedEntityType: 'RecurringGuide',
    relatedEntityId: template._id,
    dedupeKey: `recurring_assigned:${template._id}`,
  });

  return template;
};

const getTemplates = async (query = {}, user) => {
  const filter = {};
  if (query.weekday !== undefined && query.weekday !== '') filter.weekday = parseInt(query.weekday);
  if (query.producerId) filter.producerId = query.producerId;
  if (query.isActive !== undefined && query.isActive !== '') {
    filter.isActive = query.isActive === 'true' || query.isActive === true;
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 50;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    RecurringGuide.find(filter)
      .populate('producerId', 'name email role')
      .populate('productionChiefId', 'name email role')
      .populate('createdBy', 'name email')
      .sort({ weekday: 1, startTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    RecurringGuide.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

const getTemplateById = async (id) => {
  const template = await RecurringGuide.findById(id)
    .populate('producerId', 'name email role')
    .populate('productionChiefId', 'name email role')
    .populate('createdBy', 'name email')
    .lean();
  if (!template) throw Object.assign(new Error('Template not found'), { statusCode: 404 });
  return template;
};

const SCHEDULE_FIELDS = ['weekday', 'startTime', 'endTime', 'submissionDeadlineHours', 'producerId', 'productionChiefId', 'programName', 'weeksAhead'];

const updateTemplate = async (id, data) => {
  const old = await RecurringGuide.findById(id).lean();
  if (!old) throw Object.assign(new Error('Template not found'), { statusCode: 404 });

  const template = await RecurringGuide.findByIdAndUpdate(id, data, { new: true, runValidators: true })
    .populate('producerId', 'name email role')
    .populate('productionChiefId', 'name email role')
    .lean();
  if (!template) throw Object.assign(new Error('Template not found'), { statusCode: 404 });

  // If any schedule-affecting field changed, regenerate future PLANNED occurrences
  const scheduleChanged = SCHEDULE_FIELDS.some(f =>
    data[f] !== undefined && String(data[f]) !== String(old[f])
  );

  if (scheduleChanged) {
    // Delete future PLANNED occurrences (not in-progress ones)
    await GuideOccurrence.deleteMany({
      templateId: id,
      status: 'PLANNED',
      scheduledDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    });

    // Regenerate from today
    const occurrences = buildOccurrences(template, template.weeksAhead || 4);
    if (occurrences.length) {
      await GuideOccurrence.insertMany(occurrences, { ordered: false }).catch(() => {});
    }

    // Also update non-PLANNED late occurrences' metadata (name, times) without changing dates
    if (data.programName || data.startTime || data.endTime || data.producerId || data.productionChiefId) {
      const metaUpdate = {};
      if (data.programName) metaUpdate.programName = data.programName;
      if (data.startTime) metaUpdate.startTime = data.startTime;
      if (data.endTime) metaUpdate.endTime = data.endTime;
      if (data.producerId) metaUpdate.producerId = data.producerId;
      if (data.productionChiefId) metaUpdate.productionChiefId = data.productionChiefId;
      await GuideOccurrence.updateMany(
        { templateId: id, status: { $in: ['LATE', 'DRAFT', 'SUBMITTED'] } },
        { $set: metaUpdate }
      );
    }
  }

  return template;
};

const toggleActive = async (id) => {
  const template = await RecurringGuide.findById(id);
  if (!template) throw Object.assign(new Error('Template not found'), { statusCode: 404 });
  template.isActive = !template.isActive;
  await template.save();

  if (!template.isActive) {
    // Disable all future PLANNED occurrences, marking them as disabled by template
    await GuideOccurrence.updateMany(
      { templateId: id, status: 'PLANNED', broadcastDateTime: { $gt: new Date() } },
      { status: 'DISABLED', disabledByTemplate: true }
    );
  } else {
    // Re-activate: ONLY restore occurrences disabled by this template deactivation
    // (not ones disabled because a sibling producer already started)
    await GuideOccurrence.updateMany(
      { templateId: id, status: 'DISABLED', disabledByTemplate: true, broadcastDateTime: { $gt: new Date() } },
      { status: 'PLANNED', disabledByTemplate: false }
    );
    // Generate occurrences for dates that don't exist yet
    const occurrences = buildOccurrences(template, template.weeksAhead || 4);
    if (occurrences.length) {
      await GuideOccurrence.insertMany(occurrences, { ordered: false }).catch(() => {});
    }
  }

  return template;
};

const deleteTemplate = async (id) => {
  const template = await RecurringGuide.findByIdAndDelete(id);
  if (!template) throw Object.assign(new Error('Template not found'), { statusCode: 404 });
  await GuideOccurrence.deleteMany({ templateId: id });
  return { ok: true };
};

// ── CRUD: Occurrences ─────────────────────────────────────────────────────────

const getOccurrences = async (query = {}, user) => {
  const filter = {};

  // Role-based access
  if (user.role === ROLES.PRODUCTEUR) {
    filter.producerId = user._id;
  } else if (user.role === ROLES.RESPONSABLE_PRODUCTION) {
    filter.$or = [{ producerId: user._id }, { productionChiefId: user._id }];
  }
  // ADMIN sees all

  // For non-admin users, only show occurrences whose template is still active
  if (user.role !== ROLES.RESPONSABLE_ADMINISTRATIF) {
    const activeTemplateIds = await RecurringGuide.find({ isActive: true }, { _id: 1 }).lean()
      .then(docs => docs.map(d => d._id));
    filter.templateId = { $in: activeTemplateIds };
  }

  if (query.templateId) filter.templateId = query.templateId;
  if (query.status) {
    const statuses = query.status.split(',').map(s => s.trim()).filter(Boolean);
    filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
  }
  if (query.weekday !== undefined && query.weekday !== '') filter.weekday = parseInt(query.weekday);
  if (query.from || query.to) {
    filter.scheduledDate = {};
    if (query.from) filter.scheduledDate.$gte = new Date(query.from);
    if (query.to) {
      const end = new Date(query.to);
      end.setDate(end.getDate() + 1);
      filter.scheduledDate.$lt = end;
    }
  }

  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    GuideOccurrence.find(filter)
      .populate('producerId', 'name email')
      .populate('productionChiefId', 'name email')
      .populate('validatedBy', 'name email')
      .populate('templateId', 'description')
      .sort({ broadcastDateTime: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    GuideOccurrence.countDocuments(filter),
  ]);

  return { data, total, page, limit };
};

const getOccurrenceById = async (id) => {
  const occ = await GuideOccurrence.findById(id)
    .populate('producerId', 'name email role')
    .populate('productionChiefId', 'name email role')
    .populate('templateId')
    .populate('validatedBy', 'name email')
    .lean();
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  return occ;
};

const startOccurrence = async (id, userId) => {
  const occ = await GuideOccurrence.findById(id).populate('templateId');
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  if (!['PLANNED', 'LATE'].includes(occ.status)) {
    throw Object.assign(new Error(`Cannot start occurrence in status ${occ.status}`), { statusCode: 422 });
  }
  occ.status = 'DRAFT';
  await occ.save();

  // If template belongs to a group, disable all other PLANNED occurrences for the same date
  const groupId = occ.templateId?.groupId;
  if (groupId) {
    const siblingTemplates = await RecurringGuide.find({
      groupId,
      _id: { $ne: occ.templateId._id },
    }).select('_id').lean();

    if (siblingTemplates.length) {
      await GuideOccurrence.updateMany(
        {
          templateId: { $in: siblingTemplates.map(t => t._id) },
          scheduledDate: occ.scheduledDate,
          status: { $in: ['PLANNED', 'LATE'] },
        },
        { status: 'DISABLED' }
      );
    }
  }

  return occ;
};

const submitOccurrence = async (id, userId, notes) => {
  const occ = await GuideOccurrence.findById(id);
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  if (!['PLANNED', 'DRAFT', 'LATE'].includes(occ.status)) {
    throw Object.assign(new Error(`Cannot submit occurrence in status ${occ.status}`), { statusCode: 422 });
  }
  occ.status = 'SUBMITTED';
  occ.submittedAt = new Date();
  if (notes !== undefined) occ.notes = notes;
  await occ.save();

  // Notify production chief and admin
  const template = await RecurringGuide.findById(occ.templateId).lean();
  if (template?.productionChiefId) {
    await alertService.createOrSkipAlert({
      severity: 'INFO',
      messageKey: 'recurring.occurrenceSubmitted',
      params: { programName: occ.programName },
      targetUserId: template.productionChiefId,
      relatedEntityType: 'GuideOccurrence',
      relatedEntityId: occ._id,
      dedupeKey: `occ_submitted:${occ._id}`,
    });
  }
  await alertService.createOrSkipAlert({
    severity: 'INFO',
    messageKey: 'recurring.occurrenceSubmitted',
    params: { programName: occ.programName },
    targetRole: ROLES.RESPONSABLE_ADMINISTRATIF,
    relatedEntityType: 'GuideOccurrence',
    relatedEntityId: occ._id,
    dedupeKey: `occ_submitted_admin:${occ._id}`,
  });

  return occ;
};

const validateOccurrence = async (id, userId) => {
  const occ = await GuideOccurrence.findById(id);
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  if (occ.status !== 'SUBMITTED') {
    throw Object.assign(new Error('Can only validate a submitted occurrence'), { statusCode: 422 });
  }
  occ.status = 'VALIDATED';
  occ.validatedAt = new Date();
  occ.validatedBy = userId;
  await occ.save();

  // Notify producer
  await alertService.createOrSkipAlert({
    severity: 'SUCCESS',
    messageKey: 'recurring.occurrenceValidated',
    params: { programName: occ.programName },
    targetUserId: occ.producerId,
    relatedEntityType: 'GuideOccurrence',
    relatedEntityId: occ._id,
    dedupeKey: `occ_validated:${occ._id}`,
  });

  return occ;
};

const disableOccurrence = async (id) => {
  const occ = await GuideOccurrence.findByIdAndUpdate(
    id,
    { status: 'DISABLED' },
    { new: true }
  );
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  return occ;
};

const enableOccurrence = async (id) => {
  const occ = await GuideOccurrence.findById(id);
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  if (occ.status !== 'DISABLED') throw Object.assign(new Error('Occurrence is not disabled'), { statusCode: 400 });
  occ.status = 'PLANNED';
  await occ.save();
  return occ;
};

// ── Cron Helpers ──────────────────────────────────────────────────────────────

/**
 * Mark past-deadline occurrences as LATE.
 * Called by cron every 30 minutes.
 */
const markLateOccurrences = async () => {
  const now = new Date();
  const result = await GuideOccurrence.updateMany(
    {
      status: { $in: ['PLANNED', 'DRAFT'] },
      submissionDeadline: { $lte: now },
    },
    { status: 'LATE' }
  );

  // Send late alerts for newly-late occurrences
  const lateOccs = await GuideOccurrence.find({
    status: 'LATE',
    lateAlertSent: false,
  })
    .populate('templateId', 'productionChiefId')
    .lean();

  for (const occ of lateOccs) {
    // Producer
    await alertService.createOrSkipAlert({
      severity: 'CRITICAL',
      messageKey: 'recurring.occurrenceLate',
      params: { programName: occ.programName },
      targetUserId: occ.producerId,
      relatedEntityType: 'GuideOccurrence',
      relatedEntityId: occ._id,
      dedupeKey: `occ_late_producer:${occ._id}`,
    });
    // Admin
    await alertService.createOrSkipAlert({
      severity: 'CRITICAL',
      messageKey: 'recurring.occurrenceLate',
      params: { programName: occ.programName },
      targetRole: ROLES.RESPONSABLE_ADMINISTRATIF,
      relatedEntityType: 'GuideOccurrence',
      relatedEntityId: occ._id,
      dedupeKey: `occ_late_admin:${occ._id}`,
    });

    await GuideOccurrence.findByIdAndUpdate(occ._id, { lateAlertSent: true });
  }
};

/**
 * Send deadline reminders for upcoming occurrences.
 * Called by cron every 30 minutes.
 */
const sendDeadlineReminders = async () => {
  const now = new Date();

  const pending = await GuideOccurrence.find({
    status: { $in: ['PLANNED', 'DRAFT'] },
    submissionDeadline: { $gt: now },
  }).lean();

  for (const occ of pending) {
    const msLeft = occ.submissionDeadline.getTime() - now.getTime();
    const hoursLeft = msLeft / (1000 * 60 * 60);

    // 24h reminder to producer
    if (hoursLeft <= 24 && !occ.reminder24hSent) {
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'recurring.reminder24h',
        params: { programName: occ.programName },
        targetUserId: occ.producerId,
        relatedEntityType: 'GuideOccurrence',
        relatedEntityId: occ._id,
        dedupeKey: `occ_rem24:${occ._id}`,
      });
      await GuideOccurrence.findByIdAndUpdate(occ._id, { reminder24hSent: true });
    }

    // 6h reminder to producer + admin
    if (hoursLeft <= 6 && !occ.reminder6hSent) {
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'recurring.reminder6h',
        params: { programName: occ.programName },
        targetUserId: occ.producerId,
        relatedEntityType: 'GuideOccurrence',
        relatedEntityId: occ._id,
        dedupeKey: `occ_rem6:${occ._id}`,
      });
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'recurring.reminder6hAdmin',
        params: { programName: occ.programName },
        targetRole: ROLES.RESPONSABLE_ADMINISTRATIF,
        relatedEntityType: 'GuideOccurrence',
        relatedEntityId: occ._id,
        dedupeKey: `occ_rem6_admin:${occ._id}`,
      });
      await GuideOccurrence.findByIdAndUpdate(occ._id, { reminder6hSent: true });
    }

    // 1h reminder to producer
    if (hoursLeft <= 1 && !occ.reminder1hSent) {
      await alertService.createOrSkipAlert({
        severity: 'CRITICAL',
        messageKey: 'recurring.reminder1h',
        params: { programName: occ.programName },
        targetUserId: occ.producerId,
        relatedEntityType: 'GuideOccurrence',
        relatedEntityId: occ._id,
        dedupeKey: `occ_rem1:${occ._id}`,
      });
      await GuideOccurrence.findByIdAndUpdate(occ._id, { reminder1hSent: true });
    }
  }
};

/**
 * Generate occurrences for next weeksAhead weeks for all active templates.
 * Called by cron daily at midnight.
 */
const generateUpcomingOccurrences = async () => {
  const templates = await RecurringGuide.find({ isActive: true }).lean();
  for (const template of templates) {
    const weeksAhead = template.weeksAhead || 4;
    // Generate from next week (week 3→4 rolling window)
    const from = new Date();
    from.setDate(from.getDate() + weeksAhead * 7 - 7); // start from week N-1 to catch new slot
    const occurrences = buildOccurrences(template, 2, from);
    if (occurrences.length) {
      await GuideOccurrence.insertMany(occurrences, { ordered: false }).catch(() => {});
    }
  }
};

const getGroupTemplates = async (groupId) => {
  const templates = await RecurringGuide.find({ groupId })
    .populate('producerId', 'name email')
    .populate('productionChiefId', 'name email')
    .sort({ createdAt: 1 })
    .lean();

  if (!templates.length) {
    throw Object.assign(new Error('Group not found'), { statusCode: 404 });
  }

  const now = new Date();
  const rows = await Promise.all(
    templates.map(async (tmpl) => {
      const nextOcc = await GuideOccurrence.findOne({
        templateId: tmpl._id,
        scheduledDate: { $gte: now },
        status: { $nin: ['DISABLED'] },
      }).sort({ scheduledDate: 1 }).lean();

      const occ = nextOcc || await GuideOccurrence.findOne({ templateId: tmpl._id })
        .sort({ scheduledDate: -1 }).lean();

      return { template: tmpl, nextOccurrence: occ || null };
    })
  );
  return rows;
};

const requestAccess = async (occurrenceId, user) => {
  const occ = await GuideOccurrence.findById(occurrenceId);
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  const isLate = occ.status === 'LATE' || (occ.status === 'PLANNED' && new Date(occ.submissionDeadline) < new Date());
  if (!isLate) throw Object.assign(new Error('Occurrence is not late'), { statusCode: 400 });

  // Mark access as requested so admin sees the button
  occ.accessRequested = true;
  occ.accessRequestedBy = user._id;
  await occ.save();

  await alertService.createOrSkipAlert({
    severity: 'WARNING',
    messageKey: 'notifications.accessRequested',
    params: { programName: occ.programName, producerName: user.name || user.email },
    targetRole: ROLES.RESPONSABLE_ADMINISTRATIF,
    relatedEntityType: 'GuideOccurrence',
    relatedEntityId: occ._id,
    dedupeKey: `access_request:${occ._id}:${user._id}`,
  });

  return { ok: true };
};

const grantAccess = async (occurrenceId, adminUser) => {
  const occ = await GuideOccurrence.findById(occurrenceId);
  if (!occ) throw Object.assign(new Error('Occurrence not found'), { statusCode: 404 });
  const isLate = occ.status === 'LATE' || (occ.status === 'PLANNED' && new Date(occ.submissionDeadline) < new Date());
  if (!isLate) throw Object.assign(new Error('Occurrence is not late'), { statusCode: 400 });

  occ.accessGranted = true;
  occ.accessGrantedBy = adminUser._id;
  occ.accessGrantedAt = new Date();
  await occ.save();

  // Notify the producer
  await alertService.createOrSkipAlert({
    severity: 'SUCCESS',
    messageKey: 'notifications.accessGranted',
    params: { programName: occ.programName },
    targetUserId: occ.producerId,
    relatedEntityType: 'GuideOccurrence',
    relatedEntityId: occ._id,
    dedupeKey: `access_granted:${occ._id}`,
  });

  return { ok: true };
};

module.exports = {
  createTemplate,
  getTemplates,
  getGroupTemplates,
  getTemplateById,
  updateTemplate,
  toggleActive,
  deleteTemplate,
  getOccurrences,
  getOccurrenceById,
  startOccurrence,
  submitOccurrence,
  validateOccurrence,
  disableOccurrence,
  enableOccurrence,
  markLateOccurrences,
  sendDeadlineReminders,
  generateUpcomingOccurrences,
  requestAccess,
  grantAccess,
};
