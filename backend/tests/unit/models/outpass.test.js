import mongoose from 'mongoose';
import Outpass from '../../../src/models/Outpass.js';

const getFutureDate = (daysFromNow = 1) => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(0, 0, 0, 0);
  return date;
};

describe('Outpass Model', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await Outpass.deleteMany({});
  });

  afterAll(async () => {
    await Outpass.deleteMany({});
    await mongoose.disconnect();
  });

  it('should create an outpass with valid data', async () => {
    const outpass = await Outpass.create({
      student_id: new mongoose.Types.ObjectId(),
      from_date: getFutureDate(1),
      to_date: getFutureDate(3),
      reason: 'Going home for weekend',
      guardian_email: 'test@guardian.com',
    });

    expect(outpass.status).toBe('pending');
    expect(outpass.reason).toBe('Going home for weekend');
    expect(outpass.approved_by).toBeNull();
  });

  it('should reject when from_date is after to_date', async () => {
    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: getFutureDate(3),
        to_date: getFutureDate(1),
        reason: 'Invalid date range test',
        guardian_email: 'test@guardian.com',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.to_date).toBeDefined();
    }
  });

  it('should reject when from_date equals to_date', async () => {
    const sameDate = getFutureDate(1);
    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: sameDate,
        to_date: sameDate,
        reason: 'Same date test for validation',
        guardian_email: 'test@guardian.com',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
    }
  });

  it('should require reason', async () => {
    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: getFutureDate(1),
        to_date: getFutureDate(3),
        guardian_email: 'test@guardian.com',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.reason).toBeDefined();
    }
  });

  it('should reject invalid status values', async () => {
    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: getFutureDate(1),
        to_date: getFutureDate(3),
        reason: 'Testing invalid status',
        status: 'maybe',
        guardian_email: 'test@guardian.com',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.status).toBeDefined();
    }
  });

  it('should have correct default values', async () => {
    const outpass = await Outpass.create({
      student_id: new mongoose.Types.ObjectId(),
      from_date: getFutureDate(1),
      to_date: getFutureDate(3),
      reason: 'Testing defaults here',
      guardian_email: 'test@guardian.com',
    });

    expect(outpass.status).toBe('pending');
    expect(outpass.approved_by).toBeNull();
    expect(outpass.admin_remark).toBe('');
  });
});