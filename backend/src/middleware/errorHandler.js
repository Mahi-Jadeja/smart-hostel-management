import config from '../config/env.js';
import logger from '../config/logger.js';

/**
 * Global error handling middleware
 *
 * This is the LAST middleware in the chain.
 * Any error thrown anywhere in the app ends up here.
 *
 * Express knows this is an error handler because it has
 * 4 parameters (err, req, res, next) instead of the usual 3.
 */
const errorHandler = (err, req, res, next) => {
  // Default values if not set
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log the error
  // In development, log the full stack trace (helpful for debugging)
  // In production, just log the message (less noise)
  if (err.statusCode >= 500) {
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`);
    if (config.nodeEnv === 'development') {
      logger.error(err.stack);
    }
  } else {
    logger.warn(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method}`);
  }

  // Handle specific Mongoose errors
  // These are common database errors that we want to show friendly messages for

  // 1. Duplicate key error (e.g., registering with an email that already exists)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    err.statusCode = 409; // 409 = Conflict
    err.message = `${field} already exists`;
  }

  // 2. Validation error (e.g., missing required field)
  if (err.name === 'ValidationError') {
    err.statusCode = 400;
    const messages = Object.values(err.errors).map((e) => e.message);
    err.message = messages.join('. ');
  }

  // 3. Invalid ObjectId (e.g., /api/v1/students/not-a-real-id)
  if (err.name === 'CastError') {
    err.statusCode = 400;
    err.message = `Invalid ${err.path}: ${err.value}`;
  }

  // 4. JWT errors
  if (err.name === 'JsonWebTokenError') {
    err.statusCode = 401;
    err.message = 'Invalid token. Please log in again.';
  }
  if (err.name === 'TokenExpiredError') {
    err.statusCode = 401;
    err.message = 'Token expired. Please log in again.';
  }

  // Send response
  const response = {
    success: false,
    message: err.message,
  };

  // In development, include the stack trace in the response
  // This helps you debug from the browser/Postman
  // In production, NEVER show stack traces (security risk)
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
  }

  res.status(err.statusCode).json(response);
};

export default errorHandler;