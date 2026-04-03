import app from './app.js';
import config from './config/env.js';
import connectDB from './config/db.js';
import logger from './config/logger.js';

// Variable to hold the server reference
// We need this for graceful shutdown
let server;

/**
 * Start the application
 *
 * Order matters:
 * 1. Connect to database FIRST
 * 2. THEN start listening for requests
 *
 * Why? If we start the server before DB is connected,
 * the first few requests might fail because the DB isn't ready yet
 */
const startServer = async () => {
  try {
    // Step 1: Connect to MongoDB
    await connectDB();

    // Step 2: Start Express server
    server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port} in ${config.nodeEnv} mode`);
      logger.info(`📚 API Docs: http://localhost:${config.port}/api-docs`);
      logger.info(`❤️  Health:   http://localhost:${config.port}/api/health`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

/**
 * When the server needs to stop (Ctrl+C, deployment restart, crash),
 * we don't just kill it immediately. We:
 * 1. Stop accepting new requests
 * 2. Wait for ongoing requests to finish
 * 3. Close the database connection
 * 4. THEN exit
 *
 * Without this, ongoing requests get cut off mid-way,
 * and database connections are left hanging (resource leak)
 */
const gracefulShutdown = (signal) => {
  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  if (server) {
    // server.close() stops accepting NEW connections
    // but lets existing connections finish
    server.close(() => {
      logger.info('HTTP server closed');

      // Import mongoose here to close DB connection
      import('mongoose').then((mongoose) => {
        mongoose.default.connection.close(false).then(() => {
          logger.info('MongoDB connection closed');
          logger.info('Graceful shutdown complete ✅');
          process.exit(0); // Exit code 0 = clean exit
        });
      });
    });
  } else {
    process.exit(0);
  }
};

// Listen for termination signals
// SIGTERM = "please stop" (sent by deployment platforms like Heroku, Docker)
// SIGINT  = "interrupt" (sent when you press Ctrl+C in terminal)
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
// If an async function throws and nobody catches it, this catches it
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server!
startServer();