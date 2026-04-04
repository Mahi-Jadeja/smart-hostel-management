// This file loads environment variables from the .env file
// and validates that all required ones exist.
// If anything is missing, the server crashes IMMEDIATELY
// with a clear message telling you exactly what's wrong.

import dotenv from 'dotenv';

// dotenv.config() reads the .env file and puts all the
// key=value pairs into process.env (a global Node.js object)
dotenv.config();

// List of environment variables that MUST exist
// If any of these are missing, the app cannot function
const requiredVars = [
  'PORT',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'CLIENT_URL',
];

// Check each required variable
const missing = requiredVars.filter((key) => !process.env[key]);

// If any are missing, crash immediately with a helpful message
if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach((key) => console.error(`   - ${key}`));
  console.error('\n📝 Create a .env file in the backend/ folder.');
  console.error('   Use .env.example as a template.\n');
  process.exit(1); // Exit code 1 = error
}

// Export a clean config object
// Instead of writing process.env.PORT everywhere in our code,
// we import this object and use config.port
// This gives us ONE place to manage all config
const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  },
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

export default config;