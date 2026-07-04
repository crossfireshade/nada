const Note = require('../models/Note');
const { successResponse, errorResponse } = require('../utils/helpers');

const getNotes = async (req, res, next) => {
  try {
    const notes = await Note.find({ guideId: req.params.guideId })
      .populate('authorId', 'name email role')
      .sort({ createdAt: -1 })
      .lean();
    return successResponse(res, notes);
  } catch (err) {
    next(err);
  }
};

const createNote = async (req, res, next) => {
  try {
    const { content } = req.body;
    const note = await Note.create({
      guideId: req.params.guideId,
      authorId: req.user._id,
      content,
    });
    const populated = await Note.findById(note._id)
      .populate('authorId', 'name email role')
      .lean();
    return successResponse(res, populated, 201);
  } catch (err) {
    next(err);
  }
};

const updateNote = async (req, res, next) => {
  try {
    const { content } = req.body;
    const note = await Note.findOneAndUpdate(
      { _id: req.params.noteId, guideId: req.params.guideId },
      { content },
      { new: true }
    ).populate('authorId', 'name email role').lean();
    if (!note) return errorResponse(res, 'Note not found', 404);
    return successResponse(res, note);
  } catch (err) {
    next(err);
  }
};

const deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.noteId,
      guideId: req.params.guideId,
    });
    if (!note) return errorResponse(res, 'Note not found', 404);
    return successResponse(res, { message: 'Note deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getNotes, createNote, updateNote, deleteNote };
