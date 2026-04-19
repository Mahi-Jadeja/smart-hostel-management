import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import request from 'supertest';

// ✅ 1. Use unstable_mockModule for ESM (not jest.mock)
jest.unstable_mockModule('../../src/utils/email.js', () => ({
  __esModule: true,
  sendPaymentReminder: jest.fn().mockResolvedValue({ success: true, messageId: 'test' }),
  sendEmail: jest.fn().mockResolvedValue({ success: true })
}));

// ✅ 2. Dynamically import the mocked module AND your app
const emailUtils = await import('../../src/utils/email.js');
const { default: User } = await import('../../src/models/User.js');
const { default: Student } = await import('../../src/models/Student.js');
const { default: Payment } = await import('../../src/models/Payment.js');

// ✅ 3. Import app dynamically so it uses the mocked email module
const { default: app } = await import('../../src/app.js');

describe('Payment Reminder Endpoints', () => {
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
    
    // ✅ Clear mock history between tests
    jest.clearAllMocks();

    // Create student...
    await request(app).post('/api/v1/auth/register').send({
      name: 'Remind Me',
      email: 'mahijadeja0409@gmail.com',
      password: 'Password123',
      gender: 'male',
      branch: 'Computer Science',
      guardian: { name: 'Guardian', phone: '1234567890', email: 'parent@student.com' },
    });

    studentProfile = await Student.findOne({ email: 'mahijadeja0409@gmail.com' });

    // Create admin...
    await User.create({
      name: 'Admin',
      email: 'admin_reminder@test.com',
      password: 'Admin123',
      role: 'admin',
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin_reminder@test.com', password: 'Admin123' });

    adminToken = res.body.data.token;
  });



  afterAll(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});
    await Payment.deleteMany({});
    await mongoose.disconnect();
  });

  describe('POST /api/v1/payments/reminders', () => {
    it('should send reminder for specific pending payment', async () => {
      const payment = await Payment.create({
        student_id: studentProfile._id,
        amount: 5000,
        type: 'hostel_fee',
        due_date: new Date(),
        status: 'pending',
      });

      const res = await request(app)
        .post('/api/v1/payments/reminders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ payment_id: payment._id.toString() })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.emailsSent).toBe(1);
      
      // ✅ 4. Assert on the NAMESPACE property, NOT a destructured variable
      expect(emailUtils.sendPaymentReminder).toHaveBeenCalled();

      const updated = await Payment.findById(payment._id);
      expect(updated.reminder_count).toBe(1);
      expect(updated.last_reminder_type).toBe('manual');
    });

    it('should reject reminder for paid payment', async () => {
      const payment = await Payment.create({
        student_id: studentProfile._id,
        amount: 5000,
        type: 'hostel_fee',
        due_date: new Date(),
        status: 'paid',
      });

      await request(app)
        .post('/api/v1/payments/reminders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ payment_id: payment._id.toString() })
        .expect(400);
    });

    it('should skip duplicate manual reminders if already sent today', async () => {
      const payment = await Payment.create({
        student_id: studentProfile._id,
        amount: 3000,
        type: 'mess_fee',
        due_date: new Date(),
        status: 'pending',
        last_reminder_sent_at: new Date(),
        last_reminder_type: 'manual',
        reminder_count: 1,
      });

      const res = await request(app)
        .post('/api/v1/payments/reminders')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ payment_id: payment._id.toString() })
        .expect(200);

      expect(res.body.data.emailsSent).toBe(1);

      const updated = await Payment.findById(payment._id);
      expect(updated.reminder_count).toBe(2);
    });
  });
});