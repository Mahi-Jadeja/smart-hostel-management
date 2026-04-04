import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Allows 100 requests per 15 minutes per IP
 * This prevents abuse but allows normal usage
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes (in milliseconds)
  max: 100,                    // Max 100 requests per window per IP
  message: {
    success: false,
    message: 'Too many requests. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Returns rate limit info in headers (X-RateLimit-*)
  legacyHeaders: false,  // Disables old X-RateLimit-* headers
});

/**
 * Stricter rate limiter for auth routes (login, register)
 * Allows only 20 requests per 15 minutes per IP
 * This prevents brute-force password attacks
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                     // Only 20 attempts
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});