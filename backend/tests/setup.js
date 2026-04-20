// This file runs ONCE before all tests start
// It's the perfect place to setup the test database

// Global setup for Jest
// We just log that tests are starting
// Individual test files will handle their own DB connections
export default async function globalSetup() {
  // Set environment to test
  process.env.NODE_ENV = 'test';
  // Use a separate database for testing
  process.env.MONGODB_URI = 'mongodb://localhost:27017/intellihostel_test';
  process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
  process.env.JWT_EXPIRES_IN = '1h';
  process.env.PORT = '5001';
  process.env.CLIENT_URL = 'http://localhost:5173';

  console.log('\n🧪 Test environment configured');
  console.log('📦 Using database: intellihostel_test\n');
}