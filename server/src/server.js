require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const env = require('./config/env');
const { startJobs } = require('./jobs/alertCron');
const { initSocket } = require('./socket');
const { warmup: warmupImageProcessor } = require('./services/imageProcessor');

const start = async () => {
  await connectDB();

  const httpServer = http.createServer(app);

  // Attach Socket.io to the HTTP server
  initSocket(httpServer);

  const server = httpServer.listen(env.PORT, () => {
    console.log(
      `Server running in ${env.NODE_ENV} mode on port ${env.PORT}`
    );
  });

  // Start background cron jobs
  startJobs();

  // Warm up face-detection model in the background (non-blocking)
  warmupImageProcessor().catch(() => {});

  // Graceful shutdown
  const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      const mongoose = require('mongoose');
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err.message);
    server.close(() => process.exit(1));
  });
};

start();
