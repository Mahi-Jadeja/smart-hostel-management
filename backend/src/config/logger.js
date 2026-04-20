import winston from 'winston';
import config from './env.js';

// Define how log messages should look
// Example output: "2024-01-15 14:30:22 [INFO]: Server started on port 5001"
const logFormat = winston.format.printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level.toUpperCase()}]: ${message}`;
});

// Create the logger
const logger = winston.createLogger({
  // Log level determines minimum severity to log
  // 'debug' in development (show everything)
  // 'info' in production (hide debug messages)
  level: config.nodeEnv === 'development' ? 'debug' : 'info',

  // Format: add timestamp + our custom format
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),

  // Transports = WHERE to send the logs
  transports: [
    // Transport 1: Print to console (terminal)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(), // Colors! Red for errors, yellow for warnings
        logFormat
      ),
    }),

    // Transport 2: Save errors to a file
    // Only errors go here (not info or debug)
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error', // Only 'error' level messages
    }),

    // Transport 3: Save everything to another file
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});

export default logger;