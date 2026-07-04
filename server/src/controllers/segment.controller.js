const path = require('path');
const Segment = require('../models/Segment');
const auditLog = require('../services/auditLog.service');
const { successResponse, errorResponse } = require('../utils/helpers');
const { processGuestPhoto } = require('../services/imageProcessor');

const getSegments = async (req, res, next) => {
  try {
    const segments = await Segment.find({ guideId: req.params.guideId })
      .sort({ order: 1 })
      .lean();
    return successResponse(res, segments);
  } catch (err) {
    next(err);
  }
};

const createSegment = async (req, res, next) => {
  try {
    const { order, rowType, startTime, duration, content, guestFullName, guestTitleFunction, guestAttendanceMode, guestPhone, streaming } = req.body;
    const segment = await Segment.create({
      guideId: req.params.guideId,
      order,
      rowType,
      startTime,
      duration,
      content,
      guestFullName,
      guestTitleFunction,
      guestAttendanceMode,
      guestPhone,
      streaming: !!streaming,
    });
    await auditLog.log({
      actorId: req.user._id,
      action: 'CREATE_SEGMENT',
      entityType: 'Segment',
      entityId: segment._id,
      meta: { guideId: req.params.guideId },
    });
    return successResponse(res, segment, 201);
  } catch (err) {
    next(err);
  }
};

const updateSegment = async (req, res, next) => {
  try {
    const { order, rowType, startTime, duration, content, guestFullName, guestTitleFunction, guestAttendanceMode, guestPhone, streaming } = req.body;
    const update = {};
    if (order !== undefined) update.order = order;
    if (rowType !== undefined) update.rowType = rowType;
    if (startTime !== undefined) update.startTime = startTime;
    if (duration !== undefined) update.duration = duration;
    if (content !== undefined) update.content = content;
    if (guestFullName !== undefined) update.guestFullName = guestFullName;
    if (guestTitleFunction !== undefined) update.guestTitleFunction = guestTitleFunction;
    if (guestAttendanceMode !== undefined) update.guestAttendanceMode = guestAttendanceMode;
    if (guestPhone !== undefined) update.guestPhone = guestPhone;
    if (streaming !== undefined) update.streaming = !!streaming;

    const segment = await Segment.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      update,
      { new: true, runValidators: true }
    );
    if (!segment) return errorResponse(res, 'Segment not found', 404);
    return successResponse(res, segment);
  } catch (err) {
    next(err);
  }
};

const deleteSegment = async (req, res, next) => {
  try {
    const segment = await Segment.findOneAndDelete({
      _id: req.params.id,
      guideId: req.params.guideId,
    });
    if (!segment) return errorResponse(res, 'Segment not found', 404);
    return successResponse(res, { message: 'Segment deleted' });
  } catch (err) {
    next(err);
  }
};

const completeSegment = async (req, res, next) => {
  try {
    const current = await Segment.findOne({ _id: req.params.id, guideId: req.params.guideId });
    if (!current) return errorResponse(res, 'Segment not found', 404);
    const segment = await Segment.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      { completedLive: !current.completedLive },
      { new: true }
    );
    return successResponse(res, segment);
  } catch (err) {
    next(err);
  }
};

const uploadSegmentPhoto = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    const outputPath = await processGuestPhoto(req.file.path);
    const guestPhotoUrl = `/uploads/${path.basename(outputPath)}`;
    const segment = await Segment.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      { guestPhotoUrl },
      { new: true }
    );
    if (!segment) return errorResponse(res, 'Segment not found', 404);
    return successResponse(res, segment);
  } catch (err) {
    next(err);
  }
};

module.exports = { getSegments, createSegment, updateSegment, deleteSegment, completeSegment, uploadSegmentPhoto };
