const env = require('../config/env');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message =
    env.NODE_ENV === 'production' && statusCode === 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  if (env.NODE_ENV !== 'test') {
    console.error(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${err.message}`);
    if (err.stack && env.NODE_ENV === 'development') {
      console.error(err.stack);
    }
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(422).json({ success: false, message: errors.join(', ') });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ success: false, message: `Duplicate value for ${field}` });
  }

  // Multer file size
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File size exceeds the limit' });
  }

  return res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
