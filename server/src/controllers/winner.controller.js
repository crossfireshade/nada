const Winner = require('../models/Winner');
const winnerService = require('../services/winner.service');
const auditLog = require('../services/auditLog.service');
const alertService = require('../services/alert.service');
const { getSettingValue } = require('./setting.controller');
const { ROLES } = require('../utils/constants');
const { successResponse, errorResponse } = require('../utils/helpers');

const getWinners = async (req, res, next) => {
  try {
    const winners = await Winner.find({ guideId: req.params.guideId })
      .populate('filledByUserId', 'name email')
      .sort({ createdAt: -1 })
      .lean();
    return successResponse(res, winners);
  } catch (err) {
    next(err);
  }
};

const createWinner = async (req, res, next) => {
  try {
    const { winnerName, prize, phone } = req.body;
    const winner = await Winner.create({
      guideId: req.params.guideId,
      winnerName,
      prize,
      phone,
      filledByUserId: req.user._id,
    });
    await auditLog.log({
      actorId: req.user._id,
      action: 'CREATE_WINNER',
      entityType: 'Winner',
      entityId: winner._id,
      meta: { guideId: req.params.guideId },
    });
    return successResponse(res, winner, 201);
  } catch (err) {
    next(err);
  }
};

const updateWinner = async (req, res, next) => {
  try {
    const { winnerName, prize, phone } = req.body;
    const update = {};
    if (winnerName !== undefined) update.winnerName = winnerName;
    if (prize !== undefined) update.prize = prize;
    if (phone !== undefined) update.phone = phone;

    const winner = await Winner.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      update,
      { new: true, runValidators: true }
    );
    if (!winner) return errorResponse(res, 'Winner not found', 404);
    return successResponse(res, winner);
  } catch (err) {
    next(err);
  }
};

const sendToPublicity = async (req, res, next) => {
  try {
    const results = await winnerService.sendWinnersToPublicity(
      req.params.guideId,
      req.user._id
    );
    await auditLog.log({
      actorId: req.user._id,
      action: 'SEND_WINNERS_TO_PUBLICITY',
      entityType: 'Guide',
      entityId: req.params.guideId,
      meta: { results },
    });
    return successResponse(res, { results });
  } catch (err) {
    next(err);
  }
};

const receiveWinner = async (req, res, next) => {
  try {
    const { cin } = req.body;
    const winner = await Winner.findOne({ _id: req.params.id, guideId: req.params.guideId });
    if (!winner) return errorResponse(res, 'Winner not found', 404);

    if (cin && cin.trim()) {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const monthlyCount = await Winner.countDocuments({
        cin: cin.trim(),
        receivedByPublicityAt: { $gte: monthStart, $lt: monthEnd },
        blacklisted: { $ne: true },
        _id: { $ne: winner._id },
      });

      const maxWins = await getSettingValue('maxWinsPerMonth');
      if (monthlyCount >= maxWins) {
        const blacklisted = await Winner.findByIdAndUpdate(
          winner._id,
          { cin: cin.trim(), blacklisted: true, blacklistedAt: new Date() },
          { new: true }
        );
        try {
          await alertService.createOrSkipAlert({
            severity: 'WARNING',
            messageKey: 'notifications.winnerBlacklisted',
            params: { winnerName: winner.winnerName, count: monthlyCount + 1 },
            targetRole: ROLES.RESPONSABLE_PUBLICITE,
            relatedEntityType: 'Winner',
            relatedEntityId: winner._id,
            dedupeKey: `winner_blacklisted:${winner._id}`,
          });
        } catch (notifErr) {
          console.error('[winner] blacklist notification error:', notifErr?.message);
        }
        return successResponse(res, { ...blacklisted.toObject(), blacklistedNow: true });
      }
    }

    const updated = await Winner.findByIdAndUpdate(
      winner._id,
      { receivedByPublicityAt: new Date(), ...(cin ? { cin: cin.trim() } : {}) },
      { new: true }
    );
    return successResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

const getBlacklist = async (req, res, next) => {
  try {
    const { dateFrom, dateTo, name } = req.query;
    const filter = { blacklisted: true };
    if (name && name.trim()) {
      filter.winnerName = { $regex: name.trim(), $options: 'i' };
    }
    if (dateFrom || dateTo) {
      filter.blacklistedAt = {};
      if (dateFrom) filter.blacklistedAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        filter.blacklistedAt.$lt = end;
      }
    }
    const winners = await Winner.find(filter)
      .populate('guideId', 'programTitle broadcastDate')
      .sort({ blacklistedAt: -1 })
      .lean();
    return successResponse(res, winners);
  } catch (err) {
    next(err);
  }
};

const deleteWinner = async (req, res, next) => {
  try {
    const winner = await Winner.findOneAndDelete({ _id: req.params.id, guideId: req.params.guideId });
    if (!winner) return errorResponse(res, 'Winner not found', 404);
    return successResponse(res, { message: 'Winner deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getWinners, createWinner, updateWinner, sendToPublicity, receiveWinner, deleteWinner, getBlacklist };
