const EntryPermission = require('../models/EntryPermission');
const EntryPermissionGuest = require('../models/EntryPermissionGuest');
const entryPermissionService = require('../services/entryPermission.service');
const auditLog = require('../services/auditLog.service');
const alertService = require('../services/alert.service');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/helpers');
const { ROLES } = require('../utils/constants');

const getEntryPermissions = async (req, res, next) => {
  try {
    const { data, total, page, limit } = await entryPermissionService.getEntryPermissions(req.query, req.user);
    return res.json(paginatedResponse(data, total, page, limit));
  } catch (err) {
    next(err);
  }
};

const getInbox = async (req, res, next) => {
  try {
    const data = await entryPermissionService.getTodayInbox();
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const getEntryPermissionById = async (req, res, next) => {
  try {
    const ep = await EntryPermission.findById(req.params.id)
      .populate('guideId', 'theme status')
      .populate('createdByUserId', 'name email role')
      .lean();
    if (!ep) return errorResponse(res, 'Entry permission not found', 404);
    return successResponse(res, ep);
  } catch (err) {
    next(err);
  }
};

const createEntryPermission = async (req, res, next) => {
  try {
    const { guideId, date, producerName, programTitle, startTime, endTime } = req.body;
    const isProducteur = req.user.role === ROLES.PRODUCTEUR;
    const ep = await EntryPermission.create({
      guideId,
      date,
      producerName: producerName || '',
      programTitle: programTitle || '',
      startTime: startTime || '',
      endTime: endTime || '',
      createdByUserId: req.user._id,
      status: isProducteur ? 'PENDING_APPROVAL' : 'PENDING',
    });
    await auditLog.log({
      actorId: req.user._id,
      action: 'CREATE_ENTRY_PERMISSION',
      entityType: 'EntryPermission',
      entityId: ep._id,
    });

    try {
      if (isProducteur) {
        // Notify RESPONSABLE_PRODUCTION: needs approval
        await alertService.createOrSkipAlert({
          severity: 'INFO',
          messageKey: 'notifications.newEntryPermissionToApprove',
          params: { programName: programTitle || '' },
          targetRole: ROLES.RESPONSABLE_PRODUCTION,
          relatedEntityType: 'EntryPermission',
          relatedEntityId: ep._id,
          dedupeKey: `ep_to_approve:${ep._id}`,
        });
      } else {
        // Notify RECEPTIONNISTE_POLICIER directly
        await alertService.createOrSkipAlert({
          severity: 'INFO',
          messageKey: 'notifications.newEntryPermissionReceived',
          params: { programName: programTitle || '' },
          targetRole: ROLES.RECEPTIONNISTE_POLICIER,
          relatedEntityType: 'EntryPermission',
          relatedEntityId: ep._id,
          dedupeKey: `ep_created:${ep._id}`,
        });
      }
    } catch (notifErr) {
      console.error('[entryPermission] notification error:', notifErr?.message);
    }

    return successResponse(res, ep, 201);
  } catch (err) {
    next(err);
  }
};

const approveEntryPermission = async (req, res, next) => {
  try {
    const ep = await EntryPermission.findById(req.params.id);
    if (!ep) return errorResponse(res, 'Entry permission not found', 404);
    if (ep.status !== 'PENDING_APPROVAL') return errorResponse(res, 'Cannot approve this permission', 400);

    ep.status = 'PENDING';
    await ep.save();

    try {
      // Notify RECEPTIONNISTE_POLICIER
      await alertService.createOrSkipAlert({
        severity: 'INFO',
        messageKey: 'notifications.newEntryPermissionReceived',
        params: { programName: ep.programTitle || '' },
        targetRole: ROLES.RECEPTIONNISTE_POLICIER,
        relatedEntityType: 'EntryPermission',
        relatedEntityId: ep._id,
        dedupeKey: `ep_created:${ep._id}`,
      });
      // Notify creator
      if (ep.createdByUserId) {
        await alertService.createOrSkipAlert({
          severity: 'SUCCESS',
          messageKey: 'notifications.entryPermissionApproved',
          params: { programName: ep.programTitle || '' },
          targetUserId: ep.createdByUserId,
          relatedEntityType: 'EntryPermission',
          relatedEntityId: ep._id,
          dedupeKey: `ep_approved:${ep._id}`,
        });
      }
    } catch (notifErr) {
      console.error('[entryPermission] approve notification error:', notifErr?.message);
    }

    return successResponse(res, ep);
  } catch (err) {
    next(err);
  }
};

const rejectEntryPermission = async (req, res, next) => {
  try {
    const ep = await EntryPermission.findById(req.params.id);
    if (!ep) return errorResponse(res, 'Entry permission not found', 404);
    if (ep.status !== 'PENDING_APPROVAL') return errorResponse(res, 'Cannot reject this permission', 400);

    ep.status = 'REJECTED';
    await ep.save();

    try {
      if (ep.createdByUserId) {
        await alertService.createOrSkipAlert({
          severity: 'WARNING',
          messageKey: 'notifications.entryPermissionRejected',
          params: { programName: ep.programTitle || '' },
          targetUserId: ep.createdByUserId,
          relatedEntityType: 'EntryPermission',
          relatedEntityId: ep._id,
          dedupeKey: `ep_rejected:${ep._id}`,
        });
      }
    } catch (notifErr) {
      console.error('[entryPermission] reject notification error:', notifErr?.message);
    }

    return successResponse(res, ep);
  } catch (err) {
    next(err);
  }
};

const updateEntryPermission = async (req, res, next) => {
  try {
    const { status, sentToReceiverAt, date, producerName, programTitle, startTime, endTime } = req.body;
    const update = {};
    if (status !== undefined) update.status = status;
    if (sentToReceiverAt !== undefined) update.sentToReceiverAt = sentToReceiverAt;
    if (date !== undefined) update.date = date;
    if (producerName !== undefined) update.producerName = producerName;
    if (programTitle !== undefined) update.programTitle = programTitle;
    if (startTime !== undefined) update.startTime = startTime;
    if (endTime !== undefined) update.endTime = endTime;

    const ep = await EntryPermission.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true,
    });
    if (!ep) return errorResponse(res, 'Entry permission not found', 404);
    return successResponse(res, ep);
  } catch (err) {
    next(err);
  }
};

const deleteEntryPermission = async (req, res, next) => {
  try {
    const ep = await EntryPermission.findByIdAndDelete(req.params.id);
    if (!ep) return errorResponse(res, 'Entry permission not found', 404);
    await auditLog.log({
      actorId: req.user._id,
      action: 'DELETE_ENTRY_PERMISSION',
      entityType: 'EntryPermission',
      entityId: ep._id,
    });
    return successResponse(res, { message: 'Entry permission deleted' });
  } catch (err) {
    next(err);
  }
};

const getPermissionGuests = async (req, res, next) => {
  try {
    const guests = await EntryPermissionGuest.find({
      entryPermissionId: req.params.permId,
    })
      .populate('checkedInBy', 'name email')
      .lean();
    return successResponse(res, guests);
  } catch (err) {
    next(err);
  }
};

const addPermissionGuest = async (req, res, next) => {
  try {
    const { guestName, functionTitle, cin } = req.body;
    const guest = await EntryPermissionGuest.create({
      entryPermissionId: req.params.permId,
      guestName,
      functionTitle,
      cin,
    });
    return successResponse(res, guest, 201);
  } catch (err) {
    next(err);
  }
};

const checkinPermissionGuest = async (req, res, next) => {
  try {
    const updateData = { checkinTime: new Date(), checkedInBy: req.user._id };
    if (req.body.cin) updateData.cin = req.body.cin;
    const guest = await EntryPermissionGuest.findOneAndUpdate(
      { _id: req.params.id, entryPermissionId: req.params.permId },
      updateData,
      { new: true }
    );
    if (!guest) return errorResponse(res, 'Guest not found', 404);

    // Update parent permission status to VALIDATED
    const ep = await EntryPermission.findByIdAndUpdate(
      req.params.permId,
      { status: 'VALIDATED' },
      { new: true }
    );

    await auditLog.log({
      actorId: req.user._id,
      action: 'CHECKIN_GUEST',
      entityType: 'EntryPermissionGuest',
      entityId: guest._id,
      meta: { entryPermissionId: req.params.permId },
    });

    // Notify the EP creator: entry validated
    try {
      if (ep?.createdByUserId) {
        await alertService.createOrSkipAlert({
          severity: 'SUCCESS',
          messageKey: 'notifications.entryValidated',
          params: { guestName: guest.guestName || '' },
          targetUserId: ep.createdByUserId,
          relatedEntityType: 'EntryPermission',
          relatedEntityId: ep._id,
          dedupeKey: `ep_checkin:${guest._id}`,
        });
      }
    } catch (notifErr) {
      console.error('[entryPermission] checkin notification error:', notifErr?.message);
    }

    return successResponse(res, guest);
  } catch (err) {
    next(err);
  }
};

const updateGuestCin = async (req, res, next) => {
  try {
    const { cin } = req.body;
    const guest = await EntryPermissionGuest.findOneAndUpdate(
      { _id: req.params.id, entryPermissionId: req.params.permId },
      { cin: cin || '' },
      { new: true, runValidators: true }
    );
    if (!guest) return errorResponse(res, 'Guest not found', 404);
    return successResponse(res, guest);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getEntryPermissions,
  getInbox,
  getEntryPermissionById,
  createEntryPermission,
  approveEntryPermission,
  rejectEntryPermission,
  updateEntryPermission,
  deleteEntryPermission,
  getPermissionGuests,
  addPermissionGuest,
  checkinPermissionGuest,
  updateGuestCin,
};
