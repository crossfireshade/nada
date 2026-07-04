const chatService = require('../services/chat.service');
const { successResponse, errorResponse } = require('../utils/helpers');

const getConversations = async (req, res, next) => {
  try {
    const data = await chatService.getConversations(req.user._id);
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const getOrCreateConversation = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return errorResponse(res, 'userId is required', 400);
    const conv = await chatService.getOrCreateConversation(req.user._id, userId);
    return successResponse(res, conv);
  } catch (err) {
    next(err);
  }
};

const getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 60 } = req.query;
    const data = await chatService.getMessages(
      req.params.id,
      parseInt(page),
      parseInt(limit)
    );
    return successResponse(res, data);
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    await chatService.markRead(req.params.id, req.user._id);
    return successResponse(res, { ok: true });
  } catch (err) {
    next(err);
  }
};

const getTotalUnread = async (req, res, next) => {
  try {
    const count = await chatService.getTotalUnread(req.user._id);
    return successResponse(res, { count });
  } catch (err) {
    next(err);
  }
};

const getChatUsers = async (req, res, next) => {
  try {
    const users = await chatService.getChatUsers(req.user._id);
    return successResponse(res, users);
  } catch (err) {
    next(err);
  }
};

const deleteConversation = async (req, res, next) => {
  try {
    await chatService.deleteConversation(req.params.id, req.user._id);
    return successResponse(res, { ok: true });
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const deleteMessage = async (req, res, next) => {
  try {
    await chatService.deleteMessage(req.params.convId, req.params.msgId, req.user._id);
    return successResponse(res, { ok: true });
  } catch (err) {
    if (err.status) return errorResponse(res, err.message, err.status);
    next(err);
  }
};

const uploadChatFile = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 'No file uploaded', 400);
    const mime = req.file.mimetype;
    const fileType = mime.startsWith('image/') ? 'image' : 'pdf';
    // Fix multer encoding: originalname arrives as latin1, convert to utf8
    const fileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
    return successResponse(res, {
      fileUrl: `/uploads/chat/${req.file.filename}`,
      fileName,
      fileType,
      fileSize: req.file.size,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getConversations,
  getOrCreateConversation,
  getMessages,
  markRead,
  getTotalUnread,
  getChatUsers,
  deleteMessage,
  deleteConversation,
  uploadChatFile,
};
