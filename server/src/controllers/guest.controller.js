const Guest = require('../models/Guest');
const EntryPermission = require('../models/EntryPermission');
const Guide = require('../models/Guide');
const path = require('path');
const auditLog = require('../services/auditLog.service');
const alertService = require('../services/alert.service');
const { successResponse, errorResponse } = require('../utils/helpers');
const env = require('../config/env');
const { ROLES } = require('../utils/constants');
const { processGuestPhoto } = require('../services/imageProcessor');

// Roles that receive "entry permission missing" alerts.
// RECEPTIONNISTE_POLICIER is excluded because they receive the
// "new entry permission received" notification when an EP is created —
// they do not create entry permissions themselves.
const ENTRY_MISSING_ROLES = [
  ROLES.RESPONSABLE_PRODUCTION,
  ROLES.TECHNICIEN_COORDINATEUR,
  ROLES.RESPONSABLE_ADMINISTRATIF,
  ROLES.RESPONSABLE_PUBLICITE,
];

/**
 * Send "entry permission missing" alerts when a studio guest exists
 * for a guide that has no entry permission yet.
 */
const notifyEntryPermissionMissing = async (guideId, guestId, guestName) => {
  try {
    const epExists = await EntryPermission.exists({ guideId });
    if (epExists) return; // EP already created, no alert needed

    const guide = await Guide.findById(guideId).lean();
    if (!guide) return;
    const programName = guide.programTitle || guide.theme;

    // Notify the guide creator (PRODUCTEUR)
    if (guide.createdBy) {
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'notifications.entryPermissionMissing',
        params: { guestName, programName },
        targetUserId: guide.createdBy,
        relatedEntityType: 'Guide',
        relatedEntityId: guideId,
        relatedMeta: { guestName, programName },
        dedupeKey: `entry_missing:${guideId}:${guestId}:creator`,
      });
    }

    // Notify each role that can manage entry permissions
    for (const role of ENTRY_MISSING_ROLES) {
      await alertService.createOrSkipAlert({
        severity: 'WARNING',
        messageKey: 'notifications.entryPermissionMissing',
        params: { guestName, programName },
        targetRole: role,
        relatedEntityType: 'Guide',
        relatedEntityId: guideId,
        relatedMeta: { guestName, programName },
        dedupeKey: `entry_missing:${guideId}:${guestId}:${role}`,
      });
    }
  } catch (err) {
    console.error('[guest] entry-missing notification error:', err?.message);
  }
};

const getGuests = async (req, res, next) => {
  try {
    const guests = await Guest.find({ guideId: req.params.guideId }).lean();
    // Normalize: ensure photoUrls is populated from photoUrl for old records
    const normalized = guests.map(g => ({
      ...g,
      photoUrls: (g.photoUrls && g.photoUrls.length > 0) ? g.photoUrls : (g.photoUrl ? [g.photoUrl] : []),
    }));
    return successResponse(res, normalized);
  } catch (err) {
    next(err);
  }
};

const createGuest = async (req, res, next) => {
  try {
    const { fullName, titleFunction, participationMode, phone } = req.body;
    const guest = await Guest.create({
      guideId: req.params.guideId,
      fullName,
      titleFunction,
      participationMode,
      phone,
    });
    await auditLog.log({
      actorId: req.user._id,
      action: 'CREATE_GUEST',
      entityType: 'Guest',
      entityId: guest._id,
      meta: { guideId: req.params.guideId },
    });

    // If studio guest, check for missing entry permission
    if (participationMode === 'PRESENT_STUDIO') {
      await notifyEntryPermissionMissing(req.params.guideId, guest._id, fullName);
    }

    return successResponse(res, guest, 201);
  } catch (err) {
    next(err);
  }
};

const updateGuest = async (req, res, next) => {
  try {
    const { fullName, titleFunction, participationMode, phone } = req.body;
    const update = {};
    if (fullName !== undefined) update.fullName = fullName;
    if (titleFunction !== undefined) update.titleFunction = titleFunction;
    if (participationMode !== undefined) update.participationMode = participationMode;
    if (phone !== undefined) update.phone = phone;

    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      update,
      { new: true, runValidators: true }
    );
    if (!guest) return errorResponse(res, 'Guest not found', 404);

    // If updated to studio mode, check for missing entry permission
    if (participationMode === 'PRESENT_STUDIO') {
      await notifyEntryPermissionMissing(req.params.guideId, guest._id, guest.fullName);
    }

    return successResponse(res, guest);
  } catch (err) {
    next(err);
  }
};

const deleteGuest = async (req, res, next) => {
  try {
    const guest = await Guest.findOneAndDelete({
      _id: req.params.id,
      guideId: req.params.guideId,
    });
    if (!guest) return errorResponse(res, 'Guest not found', 404);
    return successResponse(res, { message: 'Guest deleted' });
  } catch (err) {
    next(err);
  }
};

const uploadGuestPhoto = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    const outputPath = await processGuestPhoto(req.file.path);
    const photoUrl = `/uploads/${path.basename(outputPath)}`;
    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      {
        $push: { photoUrls: photoUrl },
        $set: { photoUrl: photoUrl },
      },
      { new: true }
    );
    if (!guest) return errorResponse(res, 'Guest not found', 404);
    return successResponse(res, guest);
  } catch (err) {
    next(err);
  }
};

const deleteGuestPhoto = async (req, res, next) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) return errorResponse(res, 'photoUrl required', 400);
    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      { $pull: { photoUrls: photoUrl } },
      { new: true }
    );
    if (!guest) return errorResponse(res, 'Guest not found', 404);
    const lastPhoto = guest.photoUrls.length > 0 ? guest.photoUrls[guest.photoUrls.length - 1] : '';
    await Guest.findByIdAndUpdate(guest._id, { photoUrl: lastPhoto });
    guest.photoUrl = lastPhoto;
    return successResponse(res, guest);
  } catch (err) {
    next(err);
  }
};

const replaceGuestPhoto = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    const { oldPhotoUrl } = req.body;
    const outputPath = await processGuestPhoto(req.file.path);
    const newPhotoUrl = `/uploads/${path.basename(outputPath)}`;
    let guest;
    if (oldPhotoUrl) {
      guest = await Guest.findOne({ _id: req.params.id, guideId: req.params.guideId });
      if (!guest) return errorResponse(res, 'Guest not found', 404);
      const idx = guest.photoUrls.indexOf(oldPhotoUrl);
      if (idx >= 0) {
        guest.photoUrls.set(idx, newPhotoUrl);
      } else {
        guest.photoUrls.push(newPhotoUrl);
      }
      guest.photoUrl = newPhotoUrl;
      await guest.save();
    } else {
      guest = await Guest.findOneAndUpdate(
        { _id: req.params.id, guideId: req.params.guideId },
        { $push: { photoUrls: newPhotoUrl }, $set: { photoUrl: newPhotoUrl } },
        { new: true }
      );
    }
    if (!guest) return errorResponse(res, 'Guest not found', 404);
    return successResponse(res, guest);
  } catch (err) {
    next(err);
  }
};

const markGuestPresent = async (req, res, next) => {
  try {
    const guest = await Guest.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      { presentLive: true },
      { new: true }
    );
    if (!guest) return errorResponse(res, 'Guest not found', 404);

    // If marked present in studio, check for missing entry permission
    if (guest.participationMode === 'PRESENT_STUDIO') {
      await notifyEntryPermissionMissing(req.params.guideId, guest._id, guest.fullName);
    }

    return successResponse(res, guest);
  } catch (err) {
    next(err);
  }
};

module.exports = { getGuests, createGuest, updateGuest, deleteGuest, uploadGuestPhoto, deleteGuestPhoto, replaceGuestPhoto, markGuestPresent };
