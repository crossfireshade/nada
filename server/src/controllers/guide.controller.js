const Guide = require('../models/Guide');
const guideService = require('../services/guide.service');
const auditLog = require('../services/auditLog.service');
const alertService = require('../services/alert.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/helpers');
const { ROLES } = require('../utils/constants');

const checkGuestConflict = async (req, res, next) => {
  try {
    const { name, date, excludeId } = req.query;
    const conflict = await guideService.checkSingleGuestConflict(name, date, excludeId || null);
    return successResponse(res, conflict);
  } catch (err) {
    next(err);
  }
};

const getGuestConflicts = async (req, res, next) => {
  try {
    const guide = await Guide.findById(req.params.id).lean();
    if (!guide) return errorResponse(res, 'Guide not found', 404);
    const conflicts = await guideService.findGuestConflicts(guide._id, guide.broadcastDate);
    return successResponse(res, conflicts);
  } catch (err) {
    next(err);
  }
};

/**
 * Check for schedule conflicts (same broadcastDate, excluding the current guide).
 * Sends alerts to PRODUCTEUR (guide creator) and RESPONSABLE_PRODUCTION.
 */
const checkScheduleConflict = async (guideId, broadcastDate, createdBy) => {
  if (!broadcastDate) return;
  try {
    const conflict = await Guide.findOne({
      _id: { $ne: guideId },
      broadcastDate,
      status: { $nin: ['ARCHIVED', 'REJECTED'] },
    }).lean();
    if (!conflict) return;

    const programName = conflict.programTitle || conflict.theme;
    const date = conflict.broadcastDate || '—';
    const time = (conflict.startTime && conflict.endTime) ? `${conflict.startTime}–${conflict.endTime}` : '—';
    const producer = conflict.producerName || '—';
    const conflictParams = {
      programName,
      details: `${date} · ${time} · ${producer}`,
    };

    // Notify the guide creator
    if (createdBy) {
      await alertService.createOrSkipAlert({
        severity: 'CRITICAL',
        messageKey: 'notifications.scheduleConflict',
        params: conflictParams,
        targetUserId: createdBy,
        relatedEntityType: 'Guide',
        relatedEntityId: guideId,
        dedupeKey: `schedule_conflict:${guideId}:${conflict._id}`,
      });
    }
    // Notify Responsable Production
    await alertService.createOrSkipAlert({
      severity: 'CRITICAL',
      messageKey: 'notifications.scheduleConflict',
      params: conflictParams,
      targetRole: ROLES.RESPONSABLE_PRODUCTION,
      relatedEntityType: 'Guide',
      relatedEntityId: guideId,
      dedupeKey: `schedule_conflict:${guideId}:${conflict._id}:prod`,
    });
  } catch (err) {
    console.error('[guide] schedule conflict notification error:', err?.message);
  }
};

const getGuides = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await guideService.getGuides(req.query, req.user);
    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    next(err);
  }
};

const getGuideById = async (req, res, next) => {
  try {
    const guide = await Guide.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('validatedBy', 'name email role')
      .lean();
    if (!guide) return errorResponse(res, 'Guide not found', 404);
    return successResponse(res, guide);
  } catch (err) {
    next(err);
  }
};

const createGuide = async (req, res, next) => {
  try {
    const { programTitle, producerName, broadcastDate, programDuration, theme, startTime, endTime, occurrenceId } = req.body;

    // Prevent duplicate: if a guide already exists for this occurrence, return it
    if (occurrenceId) {
      const existing = await Guide.findOne({
        occurrenceId,
        status: { $in: ['DRAFT', 'SUBMITTED', 'APPROVED', 'FINAL_PUBLISHED', 'REJECTED'] },
      });
      if (existing) return successResponse(res, existing);
    }

    const guide = await Guide.create({
      programTitle,
      producerName,
      broadcastDate,
      programDuration,
      startTime,
      endTime,
      theme,
      createdBy: req.user._id,
      occurrenceId: occurrenceId || null,
    });

    await auditLog.log({
      actorId: req.user._id,
      action: 'CREATE_GUIDE',
      entityType: 'Guide',
      entityId: guide._id,
      meta: { programTitle },
    });

    // Check for schedule conflict
    await checkScheduleConflict(guide._id, broadcastDate, req.user._id);

    return successResponse(res, guide, 201);
  } catch (err) {
    next(err);
  }
};

const updateGuide = async (req, res, next) => {
  try {
    const { programTitle, producerName, broadcastDate, programDuration, theme, startTime, endTime } = req.body;
    const update = {};
    if (programTitle !== undefined) update.programTitle = programTitle;
    if (producerName !== undefined) update.producerName = producerName;
    if (broadcastDate !== undefined) update.broadcastDate = broadcastDate;
    if (programDuration !== undefined) update.programDuration = programDuration;
    if (startTime !== undefined) update.startTime = startTime;
    if (endTime !== undefined) update.endTime = endTime;
    if (theme !== undefined) update.theme = theme;

    const guide = await Guide.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    )
      .populate('createdBy', 'name email role');
    if (!guide) return errorResponse(res, 'Guide not found', 404);

    await auditLog.log({
      actorId: req.user._id,
      action: 'UPDATE_GUIDE',
      entityType: 'Guide',
      entityId: guide._id,
    });

    // Check for schedule conflict when broadcastDate changes
    if (broadcastDate !== undefined) {
      const creatorId = guide.createdBy?._id ?? guide.createdBy;
      await checkScheduleConflict(guide._id, broadcastDate, creatorId);
    }

    return successResponse(res, guide);
  } catch (err) {
    next(err);
  }
};

const transitionGuide = (action) => async (req, res, next) => {
  try {
    const guide = await guideService.transition(req.params.id, action, req.user._id, req.body?.reason);
    await auditLog.log({
      actorId: req.user._id,
      action: `GUIDE_${action.replace('-', '_').toUpperCase()}`,
      entityType: 'Guide',
      entityId: guide._id,
    });
    return successResponse(res, guide);
  } catch (err) {
    next(err);
  }
};

const deleteGuide = async (req, res, next) => {
  try {
    const guide = await Guide.findById(req.params.id).lean();
    if (!guide) return errorResponse(res, 'Guide not found', 404);
    const userId = req.user._id || req.user.id;
    const canDeleteAll = ['RESPONSABLE_PRODUCTION', 'TECHNICIEN_COORDINATEUR', 'RESPONSABLE_ADMINISTRATIF'].includes(req.user.role);
    if (!canDeleteAll && String(guide.createdBy) !== String(userId)) {
      return errorResponse(res, 'Forbidden', 403);
    }
    await Guide.findByIdAndDelete(req.params.id);
    return successResponse(res, { message: 'Guide deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGuides,
  getGuideById,
  createGuide,
  updateGuide,
  deleteGuide,
  getGuestConflicts,
  checkGuestConflict,
  submitGuide: transitionGuide('submit'),
  approveGuide: transitionGuide('approve'),
  publishGuide: transitionGuide('publish'),
  validateGuide: transitionGuide('validate'),
  rejectGuide: transitionGuide('reject'),
  startLiveGuide: transitionGuide('start-live'),
  stopLiveGuide: transitionGuide('stop-live'),
  restartLiveGuide: transitionGuide('restart-live'),
  archiveGuide: transitionGuide('archive'),
};
