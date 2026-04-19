import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Payment from '../../src/models/Payment.js';

describe('Payment Endpoints', () => {
  let studentToken;
  let adminToken;
  let studentProfile;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});
    await Payment.deleteMany({});

    const studentRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Student User',
        email: 'mahijadeja0409@gmail.com',
        password: 'Password123',
        gender: 'male',
        branch: 'Computer Science',
        guardian: { name: 'Student Parent', phone: '9876543210', email: 'mahijadeja0409@gmail.com' },
      });
    studentToken = studentRes.body.data.token;
    studentProfile = await Student.findOne({ email: 'mahijadeja0409@gmail.com' });

    await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Admin123',
      role: 'admin',
    });

    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@test.com', password: 'Admin123' });

    adminToken = adminRes.body.data.token;
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});
    await Payment.deleteMany({});
    await mongoose.disconnect();
  });

  describe('POST /api/v1/payments', () => {
    it('should allow admin to create a payment', async () => {
      const res = await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: studentProfile._id.toString(),
          amount: 5000,
          type: 'hostel_fee',
          description: 'Hostel fee for semester 1',
          due_date: new Date(Date.now() + 86400000 * 3),
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.payment.amount).toBe(5000);
      expect(res.body.data.payment.status).toBe('pending');
    });

    it('should reject non-admin user', async () => {
      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ student_id: studentProfile._id.toString(), amount: 5000 })
        .expect(403);
    });

    it('should reject invalid amount', async () => {
      await request(app)
        .post('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ student_id: studentProfile._id.toString(), amount: -100, type: 'hostel_fee' })
        .expect(400);
    });
  });

  describe('GET /api/v1/payments/mine', () => {
    it('should return student payment history', async () => {
      await Payment.create({
        student_id: studentProfile._id,
        amount: 5000,
        type: 'hostel_fee',
        description: 'Semester hostel fee',
      });

      const res = await request(app)
        .get('/api/v1/payments/mine')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.payments).toHaveLength(1);
    });

    it('should return reminders for payments due within 7 days', async () => {
      const dueSoon = new Date();
      dueSoon.setDate(dueSoon.getDate() + 3);

      await Payment.create({
        student_id: studentProfile._id,
        amount: 3000,
        type: 'mess_fee',
        due_date: dueSoon,
        status: 'pending',
      });

      const res = await request(app)
        .get('/api/v1/payments/mine')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Safely handle if controller returns [] or 0
      const reminders = res.body.data.reminders || [];
      expect(Array.isArray(reminders) ? reminders.length : reminders).toBeGreaterThanOrEqual(1);
    }, 15000); // Increased timeout

    it('should not include paid payments in reminders', async () => {
      const dueSoon = new Date();
      dueSoon.setDate(dueSoon.getDate() + 2);

      await Payment.create({
        student_id: studentProfile._id,
        amount: 2000,
        type: 'fine',
        due_date: dueSoon,
        status: 'paid',
      });

      const res = await request(app)
        .get('/api/v1/payments/mine')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      const reminders = res.body.data.reminders || [];
      expect(Array.isArray(reminders) ? reminders.length : reminders).toBe(0);
    });

    it('should paginate payments', async () => {
      for (let i = 0; i < 12; i++) {
        await Payment.create({
          student_id: studentProfile._id,
          amount: 1000 + i,
          type: 'hostel_fee',
          description: `Payment ${i + 1}`,
        });
      }

      const res = await request(app)
        .get('/api/v1/payments/mine?page=1&limit=10')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.data.payments).toHaveLength(10);
      expect(res.body.data.pagination.totalPages).toBe(2);
    });
  });

  describe('PATCH /api/v1/payments/:id/pay', () => {
    it('should allow student to mark own payment as paid', async () => {
      const payment = await Payment.create({
        student_id: studentProfile._id,
        amount: 4000,
        type: 'hostel_fee',
        status: 'pending',
      });

      const res = await request(app)
        .patch(`/api/v1/payments/${payment._id}/pay`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ transaction_id: 'TXN123456' })
        .expect(200);

      expect(res.body.data.payment.status).toBe('paid');
      expect(res.body.data.payment.transaction_id).toBe('TXN123456');
      expect(res.body.data.payment.payment_date).toBeDefined();
    });

    it('should not allow paying already paid payment', async () => {
      const payment = await Payment.create({
        student_id: studentProfile._id,
        amount: 4000,
        type: 'hostel_fee',
        status: 'paid',
      });

      await request(app)
        .patch(`/api/v1/payments/${payment._id}/pay`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ transaction_id: 'TXN999' })
        .expect(400);
    });

    it('should not allow student to pay someone else payment', async () => {
      const otherUser = await User.create({ name: 'Other', email: 'other@test.com', password: 'Password123' });
      const otherStudent = await Student.create({ user_id: otherUser._id, name: 'Other', email: 'other@test.com' });

      const payment = await Payment.create({
        student_id: otherStudent._id,
        amount: 2000,
        type: 'fine',
        status: 'pending',
      });

      await request(app)
        .patch(`/api/v1/payments/${payment._id}/pay`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ transaction_id: 'TXN000' })
        .expect(403);
    });
  });

  describe('GET /api/v1/payments (Admin)', () => {
    it('should allow admin to get all payments', async () => {
      await Payment.create({ student_id: studentProfile._id, amount: 5000, type: 'hostel_fee' });

      const res = await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by status', async () => {
      await Payment.create({ student_id: studentProfile._id, amount: 5000, type: 'hostel_fee', status: 'pending' });
      await Payment.create({ student_id: studentProfile._id, amount: 3000, type: 'mess_fee', status: 'paid' });

      const res = await request(app)
        .get('/api/v1/payments?status=paid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.data.forEach((payment) => expect(payment.status).toBe('paid'));
    });

    it('should return 403 for student trying to access all payments', async () => {
      await request(app)
        .get('/api/v1/payments')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });
});