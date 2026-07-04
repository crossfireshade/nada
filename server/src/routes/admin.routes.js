const { Router } = require('express');
const mongoose = require('mongoose');
const auth = require('../middlewares/auth');
const rbac = require('../middlewares/rbac');
const { ROLES } = require('../utils/constants');
const User = require('../models/User');
const Guide = require('../models/Guide');
const Segment = require('../models/Segment');
const { successResponse } = require('../utils/helpers');

const router = Router();
router.use(auth, rbac([ROLES.RESPONSABLE_ADMINISTRATIF]));

// GET /api/admin/producers
// Returns all PRODUCTEUR users with guide stats
router.get('/producers', async (req, res, next) => {
  try {
    const producers = await User.find({ role: ROLES.PRODUCTEUR, active: true })
      .select('name email createdAt')
      .lean();

    // For each producer, compute guide stats
    const stats = await Promise.all(
      producers.map(async (p) => {
        const [total, draft, submitted, validated, lastGuide] = await Promise.all([
          Guide.countDocuments({ createdBy: p._id }),
          Guide.countDocuments({ createdBy: p._id, status: 'DRAFT' }),
          Guide.countDocuments({ createdBy: p._id, status: 'SUBMITTED' }),
          Guide.countDocuments({
            createdBy: p._id,
            status: { $in: ['FINAL_PUBLISHED', 'LIVE_IN_PROGRESS', 'LIVE_STOPPED', 'ARCHIVED'] },
          }),
          Guide.findOne({ createdBy: p._id })
            .sort({ createdAt: -1 })
            .select('createdAt programTitle')
            .lean(),
        ]);
        return {
          _id: p._id,
          name: p.name,
          email: p.email,
          createdAt: p.createdAt,
          stats: {
            total,
            draft,
            submitted,
            validated,
          },
          lastActivity: lastGuide?.createdAt || null,
          lastProgramTitle: lastGuide?.programTitle || null,
        };
      })
    );

    return successResponse(res, stats);
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/producers/:id/guides
// Returns guides for a specific producer with optional date range + status filter
router.get('/producers/:id/guides', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dateFrom, dateTo, status, page = 1, limit = 50, sort = 'createdAt', order = 'desc' } = req.query;

    const filter = { createdBy: new mongoose.Types.ObjectId(id) };

    if (status) {
      const statuses = String(status).split(',').map(s => s.trim()).filter(Boolean);
      filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setDate(end.getDate() + 1);
        filter.createdAt.$lt = end;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortDir = order === 'asc' ? 1 : -1;
    const sortField = ['createdAt', 'programTitle', 'status', 'broadcastDate'].includes(sort) ? sort : 'createdAt';

    const [guides, total] = await Promise.all([
      Guide.find(filter)
        .sort({ [sortField]: sortDir })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Guide.countDocuments(filter),
    ]);

    // Count guests per guide (segments with guestFullName)
    const guideIds = guides.map(g => g._id);
    const guestCounts = await Segment.aggregate([
      {
        $match: {
          guideId: { $in: guideIds },
          guestFullName: { $ne: '' },
        },
      },
      { $group: { _id: '$guideId', count: { $sum: 1 } } },
    ]);
    const guestMap = {};
    guestCounts.forEach(gc => { guestMap[gc._id.toString()] = gc.count; });

    const enriched = guides.map(g => ({
      ...g,
      guestCount: guestMap[g._id.toString()] || 0,
    }));

    // Compute filtered stats (status breakdown for entire filtered set, not just current page)
    const statusAgg = await Guide.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const sc = {};
    statusAgg.forEach(s => { sc[s._id] = s.count; });
    const filteredStats = {
      total,
      draft: sc['DRAFT'] || 0,
      submitted: sc['SUBMITTED'] || 0,
      validated: (sc['FINAL_PUBLISHED'] || 0) + (sc['LIVE_IN_PROGRESS'] || 0) + (sc['LIVE_STOPPED'] || 0) + (sc['ARCHIVED'] || 0),
    };

    return successResponse(res, { data: enriched, total, page: parseInt(page), limit: parseInt(limit), filteredStats });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/producers/:id
// Returns a single producer info + stats
router.get('/producers/:id', async (req, res, next) => {
  try {
    const producer = await User.findOne({ _id: req.params.id, role: ROLES.PRODUCTEUR })
      .select('name email createdAt')
      .lean();
    if (!producer) return res.status(404).json({ success: false, message: 'Producer not found' });

    const [total, draft, submitted, validated] = await Promise.all([
      Guide.countDocuments({ createdBy: producer._id }),
      Guide.countDocuments({ createdBy: producer._id, status: 'DRAFT' }),
      Guide.countDocuments({ createdBy: producer._id, status: 'SUBMITTED' }),
      Guide.countDocuments({
        createdBy: producer._id,
        status: { $in: ['FINAL_PUBLISHED', 'LIVE_IN_PROGRESS', 'LIVE_STOPPED', 'ARCHIVED'] },
      }),
    ]);

    return successResponse(res, {
      ...producer,
      stats: { total, draft, submitted, validated },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
