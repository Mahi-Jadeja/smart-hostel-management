// Jest configuration for ES Modules
// By default, Jest uses CommonJS (require/module.exports)
// We need to tell it to work with ES Modules (import/export)

export default {
  // Use the experimental ES Modules support
  transform: {},

  // File extensions Jest should look for
  moduleFileExtensions: ['js', 'json'],

  // Pattern to find test files
  // Matches any file ending in .test.js inside the tests/ folder
  testMatch: ['**/tests/**/*.test.js'],

  // Run this file before all tests (setup test database)
  globalSetup: './tests/setup.js',

  // Timeout for each test (10 seconds)
  // Some integration tests need time for DB operations
  testTimeout: 10000,

  // Show verbose output (each test name + pass/fail)
  verbose: true,
};