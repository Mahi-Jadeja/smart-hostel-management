import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import morgan from 'morgan';
import setupSwagger from './config/swagger.js';
import config from './config/env.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import errorHandler from './middleware/errorHandler.js';
import logger from './config/logger.js';

// Create Express application
const app = express();

// ============================================================
// MIDDLEWARE STACK (order matters!)
// ============================================================

// 1. HELMET — Sets various HTTP security headers
//    Prevents: XSS attacks, clickjacking, MIME sniffing, etc.
//    It does this by adding headers like:
//    X-Content-Type-Options: nosniff
//    X-Frame-Options: DENY
//    Content-Security-Policy: ...
app.use(helmet());

// 2. CORS — Cross-Origin Resource Sharing
//    Your frontend (localhost:5173) and backend (localhost:5000)
//    are on DIFFERENT PORTS = different "origins"
//    Browsers BLOCK requests between different origins by default
//    CORS tells the browser: "It's okay, I trust this origin"
app.use(
  cors({
    origin: true,   // Only allow our frontend(while deployment)config.clientUrl
    credentials: true,           // Allow cookies/auth headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. RATE LIMITER — Prevent abuse
//    Applied to all /api routes
app.use('/api', apiLimiter);

// 4. BODY PARSER — Parse incoming JSON request bodies
//    Without this, req.body would be undefined
//    limit: '10mb' prevents someone from sending a 1GB payload
app.use(express.json({ limit: '10mb' }));

// 5. URL ENCODED PARSER — Parse form-encoded data
//    Used by some forms and OAuth callbacks
app.use(express.urlencoded({ extended: true }));

// 6. MONGO SANITIZE — Prevent NoSQL injection
//    Removes $ and . from req.body, req.query, req.params
//    Without this, an attacker could send:
//    { "email": { "$gt": "" } } to bypass login
//app.use(mongoSanitize());

// 7. MORGAN — HTTP request logging
//    Logs every request to the console in development
//    Format: "POST /api/v1/auth/login 200 12.345 ms"
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// ============================================================
// ROUTES
// ============================================================
// Setup Swagger API documentation
setupSwagger(app);

// Health check endpoint — used to verify the server is running
// This is the simplest possible route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'IntelliHostel API is running',
    environment: config.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});

// API v1 routes will be added here in Phase 2+
// app.use('/api/v1', v1Routes);

// ============================================================
// ERROR HANDLING
// ============================================================

// Handle 404 — No route matched the request
// This MUST come AFTER all routes
// If no route matched above, this catches it
import AppError from './utils/AppError.js';

app.all(/.*/, (req, res, next) => {
  next(new AppError(`Cannot find ${req.method} ${req.originalUrl}`, 404));
});

// Global error handler — MUST be the LAST middleware
// It has 4 parameters (err, req, res, next) — that's how Express
// knows it's an error handler, not a regular middleware
app.use(errorHandler);

export default app;