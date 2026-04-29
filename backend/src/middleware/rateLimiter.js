import rateLimit from 'express-rate-limit';

/**
 * General API rate limiter
 * Allows 100 requests per 15 minutes per IP
 * This prevents abuse but allows normal usage
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes (in milliseconds)
  max: 100,                    // Max 100 requests per window per IP
  skip: () => process.env.NODE_ENV === 'test',
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
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter specifically for forgot-password endpoint.
 *
 * Why stricter than authLimiter?
 * Each request to forgot-password sends a real email.
 * Without strict limiting, an attacker could spam thousands
 * of emails to any address, causing email abuse and cost.
 *
 * 5 requests per 60 minutes per IP is generous for genuine use
 * (a real user will never need more than 1-2 attempts per hour)
 * but tight enough to prevent automated abuse.
 */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  max: 5,                    // Only 5 attempts per hour per IP
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    success: false,
    message: 'Too many password reset attempts. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});