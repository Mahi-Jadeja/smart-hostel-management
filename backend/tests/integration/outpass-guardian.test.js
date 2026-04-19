import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Outpass from '../../src/models/Outpass.js';

// Helper to generate dates that ALWAYS pass the "from_date cannot be in the past" validation
const getFutureDate = (daysFromNow = 1) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(0, 0, 0, 0); // Normalize to midnight to match model validation
  return date;
};

describe('Guardian Outpass Approval Endpoints', () => {
  let studentProfile;
  let validToken;
  let expiredToken;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // 1. Clean DB
    await User.deleteMany({});
    await Student.deleteMany({});
    await Outpass.deleteMany({});

    // 2. Create student
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Student',
        email: 'test@test.com',
        password: 'Password123',
        gender: 'male',
        branch: 'Computer Science',
        guardian: {
          name: 'Guardian',
          phone: '9876543210',
          email: 'guardian@test.com',
        },
      })
      .expect(201); // Ensure registration succeeds

    studentProfile = await Student.findOne({ email: 'test@test.com' });
    if (!studentProfile) throw new Error('Student profile not found after registration');

    // 3. Create valid pending outpass
    // from_date is TOMORROW, so it passes the "not in the past" check
    const validOutpass = await Outpass.create({
      student_id: studentProfile._id,
      from_date: getFutureDate(1),
      to_date: getFutureDate(3),
      reason: 'Family visit',
      guardian_email: 'guardian@test.com',
      status: 'pending',
      email_sent: true,
    });
    validToken = validOutpass.approval_token;

    // 4. Create expired outpass
    // Token expires YESTERDAY, but dates are TOMORROW (valid outpass, expired token)
    const expiredOutpass = await Outpass.create({
      student_id: studentProfile._id,
      from_date: getFutureDate(1),
      to_date: getFutureDate(3),
      reason: 'Expired test',
      guardian_email: 'guardian@test.com',
      status: 'pending',
      token_expires_at: getFutureDate(-1), // Expired token
      email_sent: true,
    });
    expiredToken = expiredOutpass.approval_token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});
    await Outpass.deleteMany({});
    await mongoose.disconnect();
  });

  describe('GET /api/v1/outpass/guardian-action/:token', () => {
    it('should return outpass details for valid token', async () => {
      const res = await request(app)
        .get(`/api/v1/outpass/guardian-action/${validToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.outpass.student_name).toBe('Test Student');
    });

    it('should reject expired token', async () => {
      await request(app)
        .get(`/api/v1/outpass/guardian-action/${expiredToken}`)
        .expect(400); // Controller should reject expired tokens
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/v1/outpass/guardian-action/invalid-token-123')
        .expect(404);
    });
  });

  describe('PATCH /api/v1/outpass/guardian-action/:token/decision', () => {
    it('should approve outpass successfully', async () => {
      const res = await request(app)
        .patch(`/api/v1/outpass/guardian-action/${validToken}/decision`)
        .send({ decision: 'approved' })
        .expect(200);

      expect(res.body.data.status).toBe('approved');

      const dbOutpass = await Outpass.findOne({ approval_token: validToken });
      expect(dbOutpass.status).toBe('approved');
    });

    it('should reject outpass successfully', async () => {
      // Create a fresh outpass for this test to avoid conflicts
      const freshOutpass = await Outpass.create({
        student_id: studentProfile._id,
        from_date: getFutureDate(1),
        to_date: getFutureDate(3),
        reason: 'Another visit',
        guardian_email: 'guardian@test.com',
        status: 'pending',
        email_sent: true,
      });

      const res = await request(app)
        .patch(`/api/v1/outpass/guardian-action/${freshOutpass.approval_token}/decision`)
        .send({ decision: 'rejected' })
        .expect(200);

      expect(res.body.data.status).toBe('guardian_rejected');
    });

    it('should prevent double decision', async () => {
      await request(app)
        .patch(`/api/v1/outpass/guardian-action/${validToken}/decision`)
        .send({ decision: 'approved' })
        .expect(200);

      await request(app)
        .patch(`/api/v1/outpass/guardian-action/${validToken}/decision`)
        .send({ decision: 'rejected' })
        .expect(400); // Should fail because already approved
    });
  });
});