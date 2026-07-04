const alertService = require('../services/alert.service');
const { successResponse, paginatedResponse } = require('../utils/helpers');

const getAlerts = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await alertService.getAlerts(req.query, req.user);
    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const alert = await alertService.markRead(req.params.id, req.user._id);
    return successResponse(res, alert);
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await alertService.markAllRead(req.user);
    return successResponse(res, { message: 'All alerts marked as read' });
  } catch (err) {
    next(err);
  }
};

const deleteAlert = async (req, res, next) => {
  try {
    const alert = await alertService.deleteAlert(req.params.id, req.user._id);
    return successResponse(res, alert);
  } catch (err) {
    next(err);
  }
};

const createGuestConflictAlert = async (req, res, next) => {
  try {
    const { guestName, programTitle, startTime, endTime } = req.body;
    if (!guestName || !programTitle) return res.status(400).json({ message: 'Missing fields' });
    const today = new Date().toISOString().slice(0, 10);
    const name = guestName.trim().toLowerCase();

    // Alert only for the current user (the "second" producer who created the duplicate)
    await alertService.createOrSkipAlert({
      severity: 'WARNING',
      messageKey: 'notifications.guestAlreadyInProgram',
      params: { guestName, programTitle, startTime: startTime || '', endTime: endTime || '' },
      targetUserId: req.user._id,
      dedupeKey: `guest_conflict_typing:${req.user._id}:${name}:${today}`,
    });

    return successResponse(res, null);
  } catch (err) {
    next(err);
  }
};

// kept for backward compat
const dismiss = deleteAlert;

module.exports = { getAlerts, markRead, markAllRead, deleteAlert, dismiss, createGuestConflictAlert };
