import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';

describe('Student Room Preference Endpoints', () => {
  let studentToken1;
  let studentToken2;
  let student1;
  let student2;
  let student3;

  beforeAll(async () => {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});

    // Student 1 - male
    const res1 = await request(app).post('/api/v1/auth/register').send({
      name: 'Rahul Student',
      email: 'rahul@test.com',
      password: 'Password123',
      gender: 'male',
      branch: 'Computer Science',
      guardian: {
        name: 'Guardian Rahul',
        phone: '9876543210',
        email: 'guardian.rahul@test.com',
      },
    });

    studentToken1 = res1.body.data.token;
    student1 = await Student.findOne({ email: 'rahul@test.com' });

    // Student 2 - male
    const res2 = await request(app).post('/api/v1/auth/register').send({
      name: 'Amit Student',
      email: 'amit@test.com',
      password: 'Password123',
      gender: 'male',
      branch: 'Mechanical Engineering',
      guardian: {
        name: 'Guardian Amit',
        phone: '9876543211',
        email: 'guardian.amit@test.com',
      },
    });

    studentToken2 = res2.body.data.token;
    student2 = await Student.findOne({ email: 'amit@test.com' });

    // Student 3 - female (should not appear in male search results)
    await request(app).post('/api/v1/auth/register').send({
      name: 'Priya Student',
      email: 'priya@test.com',
      password: 'Password123',
      gender: 'female',
      branch: 'Civil Engineering',
      guardian: {
        name: 'Guardian Priya',
        phone: '9876543212',
        email: 'guardian.priya@test.com',
      },
    });

    student3 = await Student.findOne({ email: 'priya@test.com' });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});
    await mongoose.disconnect();
  });

  describe('GET /api/v1/student/room-preference', () => {
    it('should return empty preference initially', async () => {
      const res = await request(app)
        .get('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken1}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.preference.preferred_roommate).toBeNull();
      expect(res.body.data.preference.is_mutual).toBe(false);
    });
  });

  describe('GET /api/v1/student/roommate-options', () => {
    it('should return only same-gender students and exclude self', async () => {
      const res = await request(app)
        .get('/api/v1/student/roommate-options?q=student')
        .set('Authorization', `Bearer ${studentToken1}`)
        .expect(200);

      expect(res.body.success).toBe(true);

      const optionIds = res.body.data.options.map((item) => item._id.toString());

      expect(optionIds).toContain(student2._id.toString());
      expect(optionIds).not.toContain(student1._id.toString());
      expect(optionIds).not.toContain(student3._id.toString());
    });
  });

  describe('PUT /api/v1/student/room-preference', () => {
    it('should save preferred roommate successfully', async () => {
      const res = await request(app)
        .put('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({
          preferred_roommate_id: student2._id.toString(),
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.preference.preferred_roommate._id).toBe(
        student2._id.toString()
      );
      expect(res.body.data.preference.is_mutual).toBe(false);
    });

    it('should detect mutual preference correctly', async () => {
      await request(app)
        .put('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken2}`)
        .send({
          preferred_roommate_id: student1._id.toString(),
        })
        .expect(200);

      const res = await request(app)
        .put('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({
          preferred_roommate_id: student2._id.toString(),
        })
        .expect(200);

      expect(res.body.data.preference.is_mutual).toBe(true);
    });

    it('should clear preference when null is sent', async () => {
      await request(app)
        .put('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({
          preferred_roommate_id: student2._id.toString(),
        })
        .expect(200);

      const res = await request(app)
        .put('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({
          preferred_roommate_id: null,
        })
        .expect(200);

      expect(res.body.data.preference.preferred_roommate).toBeNull();
      expect(res.body.data.preference.is_mutual).toBe(false);
    });

    it('should reject selecting opposite-gender roommate', async () => {
      await request(app)
        .put('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({
          preferred_roommate_id: student3._id.toString(),
        })
        .expect(400);
    });

    it('should reject selecting self as preferred roommate', async () => {
      await request(app)
        .put('/api/v1/student/room-preference')
        .set('Authorization', `Bearer ${studentToken1}`)
        .send({
          preferred_roommate_id: student1._id.toString(),
        })
        .expect(400);
    });
  });
});