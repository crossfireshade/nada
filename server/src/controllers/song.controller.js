const Song = require('../models/Song');
const Guide = require('../models/Guide');
const auditLog = require('../services/auditLog.service');
const { successResponse, errorResponse } = require('../utils/helpers');
const { classifySong } = require('../services/musicClassifier.service');

const getSongs = async (req, res, next) => {
  try {
    const songs = await Song.find({ guideId: req.params.guideId }).sort({ order: 1 }).lean();
    return successResponse(res, songs);
  } catch (err) {
    next(err);
  }
};

const createSong = async (req, res, next) => {
  try {
    const { title, artist, duration, order, passageTime, streaming } = req.body;
    const song = await Song.create({
      guideId: req.params.guideId,
      title,
      artist,
      duration,
      order,
      passageTime,
      streaming: !!streaming,
    });
    await auditLog.log({
      actorId: req.user._id,
      action: 'CREATE_SONG',
      entityType: 'Song',
      entityId: song._id,
      meta: { guideId: req.params.guideId },
    });
    return successResponse(res, song, 201);
  } catch (err) {
    next(err);
  }
};

const updateSong = async (req, res, next) => {
  try {
    const { title, artist, duration, order, passageTime, streaming } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (artist !== undefined) update.artist = artist;
    if (duration !== undefined) update.duration = duration;
    if (order !== undefined) update.order = order;
    if (passageTime !== undefined) update.passageTime = passageTime;
    if (streaming !== undefined) update.streaming = !!streaming;

    const song = await Song.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      update,
      { new: true, runValidators: true }
    );
    if (!song) return errorResponse(res, 'Song not found', 404);
    return successResponse(res, song);
  } catch (err) {
    next(err);
  }
};

const deleteSong = async (req, res, next) => {
  try {
    const song = await Song.findOneAndDelete({
      _id: req.params.id,
      guideId: req.params.guideId,
    });
    if (!song) return errorResponse(res, 'Song not found', 404);
    return successResponse(res, { message: 'Song deleted' });
  } catch (err) {
    next(err);
  }
};

const validateSong = async (req, res, next) => {
  try {
    const current = await Song.findOne({ _id: req.params.id, guideId: req.params.guideId });
    if (!current) return errorResponse(res, 'Song not found', 404);
    const song = await Song.findOneAndUpdate(
      { _id: req.params.id, guideId: req.params.guideId },
      { validatedLive: !current.validatedLive, validatedAt: !current.validatedLive ? new Date() : null },
      { new: true }
    );
    return successResponse(res, song);
  } catch (err) {
    next(err);
  }
};

const checkDuplicateSong = async (req, res, next) => {
  try {
    const { title } = req.query;
    if (!title) return successResponse(res, { inCurrentGuide: false, inTodayGuides: false });

    const guideId = req.params.guideId;
    const titleRegex = new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

    // Check in current guide
    const inCurrentGuide = await Song.findOne({ guideId, title: titleRegex }).lean();

    // Check in today's guides
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayGuides = await Guide.find({
      _id: { $ne: guideId },
      createdAt: { $gte: today, $lt: tomorrow },
    }).select('_id').lean();

    const todayGuideIds = todayGuides.map(g => g._id);
    const inTodayGuide = todayGuideIds.length > 0
      ? await Song.findOne({ guideId: { $in: todayGuideIds }, title: titleRegex }).lean()
      : null;

    return successResponse(res, {
      inCurrentGuide: !!inCurrentGuide,
      inTodayGuides: !!inTodayGuide,
    });
  } catch (err) {
    next(err);
  }
};

const updateSongGenre = async (req, res, next) => {
  try {
    const { genre } = req.body;
    const song = await Song.findByIdAndUpdate(
      req.params.id,
      { genre: genre ?? '' },
      { new: true, runValidators: true }
    );
    if (!song) return errorResponse(res, 'Song not found', 404);
    return successResponse(res, song);
  } catch (err) {
    next(err);
  }
};

function buildDateFilter(query) {
  const { date, dateFrom, dateTo } = query;
  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) range.$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setDate(end.getDate() + 1);
      range.$lt = end;
    }
    return range;
  }
  if (date) {
    const d = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return { $gte: d, $lt: dayEnd };
  }
  return null;
}

const getGenreStats = async (req, res, next) => {
  try {
    const filter = { validatedLive: true };
    const dateRange = buildDateFilter(req.query);
    if (dateRange) filter.validatedAt = dateRange;
    const agg = await Song.aggregate([
      { $match: filter },
      { $group: { _id: '$genre', count: { $sum: 1 } } },
    ]);
    const total = agg.reduce((acc, s) => acc + s.count, 0);
    return successResponse(res, { stats: agg, total });
  } catch (err) {
    next(err);
  }
};

const getValidatedSongs = async (req, res, next) => {
  try {
    const filter = { validatedLive: true };
    const dateRange = buildDateFilter(req.query);
    if (dateRange) filter.validatedAt = dateRange;
    const songs = await Song.find(filter)
      .populate('guideId', 'programTitle producerName broadcastDate')
      .sort({ validatedAt: -1 })
      .lean();
    return successResponse(res, songs);
  } catch (err) {
    next(err);
  }
};

const deleteHistorySong = async (req, res, next) => {
  try {
    const song = await Song.findByIdAndDelete(req.params.id);
    if (!song) return errorResponse(res, 'Song not found', 404);
    return successResponse(res, { message: 'Song deleted' });
  } catch (err) {
    next(err);
  }
};

const classifySongById = async (req, res, next) => {
  try {
    const song = await Song.findById(req.params.id).lean();
    if (!song) return errorResponse(res, 'Song not found', 404);

    const result = await classifySong(song.title, song.artist || '');

    const update = {};
    if (result.genre) update.genre = result.genre;
    if (result.artistCountry) update.artistCountry = result.artistCountry;
    if (result.spotifyId) update.spotifyId = result.spotifyId;

    const updated = await Song.findByIdAndUpdate(req.params.id, update, { new: true });
    return successResponse(res, {
      song: updated,
      artistCountry: result.artistCountry,
      genre: result.genre,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSongs, createSong, updateSong, deleteSong, validateSong, checkDuplicateSong, getValidatedSongs, updateSongGenre, getGenreStats, deleteHistorySong, classifySongById };
