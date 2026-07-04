const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Get all conversations for a user, with unread counts
const getConversations = async (userId) => {
  const conversations = await Conversation.find({ participants: userId })
    .populate('participants', 'name email role active')
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .lean();

  const withUnread = await Promise.all(
    conversations.map(async (conv) => {
      const unread = await Message.countDocuments({
        conversationId: conv._id,
        senderId: { $ne: userId },
        isRead: false,
      });
      const other = conv.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );
      return { ...conv, unreadCount: unread, other };
    })
  );

  return withUnread;
};

// Get or create a 1-on-1 conversation between two users
const getOrCreateConversation = async (userId1, userId2) => {
  let conv = await Conversation.findOne({
    participants: { $all: [userId1, userId2], $size: 2 },
  }).populate('participants', 'name email role active');

  if (!conv) {
    conv = await Conversation.create({ participants: [userId1, userId2] });
    conv = await Conversation.findById(conv._id)
      .populate('participants', 'name email role active')
      .lean();
  }

  const unread = await Message.countDocuments({
    conversationId: conv._id,
    senderId: { $ne: userId1 },
    isRead: false,
  });

  const other = conv.participants
    ? conv.participants.find((p) => p._id.toString() !== userId1.toString())
    : null;

  return { ...conv.toObject?.() ?? conv, unreadCount: unread, other };
};

// Get paginated messages for a conversation
const getMessages = async (conversationId, page = 1, limit = 60) => {
  const total = await Message.countDocuments({ conversationId });
  // Load last `limit` messages (most recent page)
  const skip = Math.max(0, total - page * limit);
  const messages = await Message.find({ conversationId })
    .populate('senderId', 'name email role')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(limit)
    .lean();
  return { messages, total, page, limit };
};

// Mark all unread messages in a conversation as read
const markRead = async (conversationId, userId) => {
  await Message.updateMany(
    { conversationId, senderId: { $ne: userId }, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Get total unread count across all conversations for a user
const getTotalUnread = async (userId) => {
  const convIds = (
    await Conversation.find({ participants: userId }).select('_id').lean()
  ).map((c) => c._id);

  const count = await Message.countDocuments({
    conversationId: { $in: convIds },
    senderId: { $ne: userId },
    isRead: false,
  });
  return count;
};

// Get all users (except current) available to chat with
const getChatUsers = async (currentUserId) => {
  return User.find({ _id: { $ne: currentUserId }, active: true })
    .select('name email role')
    .sort({ name: 1 })
    .lean();
};

// Delete a conversation and all its messages (any participant can delete)
const deleteConversation = async (conversationId, userId) => {
  const conv = await Conversation.findOne({ _id: conversationId, participants: userId });
  if (!conv) throw Object.assign(new Error('Conversation not found'), { status: 404 });
  await Message.deleteMany({ conversationId });
  await conv.deleteOne();
  return { ok: true };
};

// Delete a message (only the sender can delete their own message)
const deleteMessage = async (conversationId, messageId, userId) => {
  const msg = await Message.findOne({ _id: messageId, conversationId });
  if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
  if (msg.senderId.toString() !== userId.toString())
    throw Object.assign(new Error('Forbidden'), { status: 403 });
  await msg.deleteOne();
  return { ok: true };
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
};
