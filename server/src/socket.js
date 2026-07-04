const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');
const env = require('./config/env');

// userId → Set of socketIds (supports multiple tabs)
const onlineUsers = new Map();

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: [
        env.CLIENT_URL,
        'http://localhost:4173',
        'http://localhost:5173',
        'http://127.0.0.1:4173',
        'http://127.0.0.1:5173',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // ── Auth middleware ──────────────────────────────────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token provided'));
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-passwordHash -refreshToken');
      if (!user || !user.active) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch {
      next(new Error('Invalid or expired token'));
    }
  });

  // ── Connection ───────────────────────────────────────────────────────────────
  io.on('connection', (socket) => {
    const userId = socket.user._id.toString();

    // Track online status
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Join own notification room
    socket.join(`user:${userId}`);

    // Broadcast online status to all connected users
    io.emit('user:online', { userId });

    // ── Join a conversation room ───────────────────────────────────────────────
    socket.on('conv:join', (conversationId) => {
      if (conversationId) socket.join(`conv:${conversationId}`);
    });

    // ── Send a message ────────────────────────────────────────────────────────
    socket.on('message:send', async ({ conversationId, content, fileUrl, fileName, fileType, fileSize }, ack) => {
      try {
        const hasText = content?.trim();
        const hasFile = fileUrl && fileName;
        if (!conversationId || (!hasText && !hasFile)) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Invalid data' });
          return;
        }

        const msg = await Message.create({
          conversationId,
          senderId: userId,
          content: hasText ? content.trim() : '',
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          fileType: fileType || null,
          fileSize: fileSize || null,
        });

        const lastMsg = hasText ? content.trim() : (fileType === 'image' ? '📷 Image' : '📎 ' + fileName);
        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: lastMsg,
          lastMessageAt: new Date(),
        });

        const populated = await Message.findById(msg._id)
          .populate('senderId', 'name email role')
          .lean();

        // Deliver to all participants in the conversation room
        io.to(`conv:${conversationId}`).emit('message:new', populated);

        if (typeof ack === 'function') ack({ ok: true, message: populated });
      } catch (err) {
        console.error('[socket] message:send error:', err.message);
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    // ── Mark messages as read ─────────────────────────────────────────────────
    socket.on('mark:read', async ({ conversationId }) => {
      try {
        await Message.updateMany(
          { conversationId, senderId: { $ne: userId }, isRead: false },
          { isRead: true, readAt: new Date() }
        );
        io.to(`conv:${conversationId}`).emit('message:read', {
          conversationId,
          readBy: userId,
        });
      } catch (err) {
        console.error('[socket] mark:read error:', err.message);
      }
    });

    // ── Typing indicators ─────────────────────────────────────────────────────
    socket.on('typing:start', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:start', {
        userId,
        name: socket.user.name,
        conversationId,
      });
    });

    socket.on('typing:stop', ({ conversationId }) => {
      socket.to(`conv:${conversationId}`).emit('typing:stop', {
        userId,
        conversationId,
      });
    });

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          io.emit('user:offline', { userId });
        }
      }
    });
  });

  return io;
}

module.exports = { initSocket, onlineUsers };
