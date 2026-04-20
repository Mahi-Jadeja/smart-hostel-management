// Import supertest — it lets us make HTTP requests to our Express app
// WITHOUT actually starting the server on a port
import request from 'supertest';

// Import our Express app (not server.js!)
// app.js has all the middleware and routes but doesn't call .listen()
// This is WHY we separated app.js from server.js
import app from '../../src/app.js';

// Group all health check tests together
describe('Health Check Endpoint', () => {

  // Test 1: GET /api/health should return 200
  it('should return 200 and success message', async () => {
    // Make a GET request to /api/health
    const response = await request(app)
      .get('/api/health')     // The URL to test
      .expect(200);           // Assert: status code should be 200

    // Assert: response body should match our expected format
    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('message', 'IntelliHostel API is running');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('timestamp');
  });

  // Test 2: Unknown routes should return 404
  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/api/this-does-not-exist')
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.message).toContain('Cannot find');
  });

  // Test 3: The 404 error should include method and path
  it('should include method and path in 404 error message', async () => {
    const response = await request(app)
      .post('/api/nonexistent')
      .expect(404);

    expect(response.body.message).toBe('Cannot find POST /api/nonexistent');
  });
});