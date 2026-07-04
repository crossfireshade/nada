const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const env = require('./config/env');
const errorHandler = require('./middlewares/errorHandler');

// Route imports
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const guideRoutes = require('./routes/guide.routes');
const segmentRoutes = require('./routes/segment.routes');
const guestRoutes = require('./routes/guest.routes');
const songRoutes = require('./routes/song.routes');
const noteRoutes = require('./routes/note.routes');
const winnerRoutes = require('./routes/winner.routes');
const globalWinnerRoutes = require('./routes/globalWinner.routes');
const entryPermissionRoutes = require('./routes/entryPermission.routes');
const alertRoutes = require('./routes/alert.routes');
const auditLogRoutes = require('./routes/auditLog.routes');
const songHistoryRoutes = require('./routes/songHistory.routes');
const chatRoutes = require('./routes/chat.routes');
const adminRoutes = require('./routes/admin.routes');
const recurringGuideRoutes = require('./routes/recurringGuide.routes');
const settingRoutes = require('./routes/setting.routes');

const app = express();

// ── Security / CORS ──────────────────────────────────────────────────────────
const allowedOrigins = env.CLIENT_URL
  ? env.CLIENT_URL.split(',').map(o => o.trim())
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no origin header) and listed origins
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(null, true); // Allow all in case CLIENT_URL not set yet
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// ── Body parsers ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Static files ─────────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.resolve(env.UPLOAD_DIR)));

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ success: true, data: { status: 'OK', timestamp: new Date().toISOString() } })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', apiLimiter, userRoutes);
app.use('/api/guides', apiLimiter, guideRoutes);

// Nested guide sub-resources
app.use('/api/guides/:guideId/segments', segmentRoutes);
app.use('/api/guides/:guideId/guests', guestRoutes);
app.use('/api/guides/:guideId/songs', songRoutes);
app.use('/api/guides/:guideId/notes', noteRoutes);
app.use('/api/guides/:guideId/winners', winnerRoutes);
app.use('/api/winners', globalWinnerRoutes);

app.use('/api/songs', apiLimiter, songHistoryRoutes);
app.use('/api/entry-permissions', apiLimiter, entryPermissionRoutes);
app.use('/api/alerts', apiLimiter, alertRoutes);
app.use('/api/audit-logs', apiLimiter, auditLogRoutes);
app.use('/api/chat', apiLimiter, chatRoutes);
app.use('/api/admin', apiLimiter, adminRoutes);
app.use('/api/recurring-guides', apiLimiter, recurringGuideRoutes);
app.use('/api/settings', apiLimiter, settingRoutes);

// ── Serve React frontend ─────────────────────────────────────────────────────
const clientBuild = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientBuild));
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientBuild, 'index.html'), err => {
    if (err) res.status(404).json({ success: false, message: 'Route not found' });
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
