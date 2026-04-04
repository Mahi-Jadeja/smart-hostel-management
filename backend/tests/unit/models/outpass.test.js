import mongoose from 'mongoose';
import Outpass from '../../../src/models/Outpass.js';

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

  // ---- Test: Successful creation ----

  it('should create an outpass with valid data', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    const outpass = await Outpass.create({
      student_id: new mongoose.Types.ObjectId(),
      from_date: tomorrow,
      to_date: dayAfter,
      reason: 'Going home for weekend',
    });

    expect(outpass.status).toBe('pending');
    expect(outpass.reason).toBe('Going home for weekend');
    expect(outpass.approved_by).toBeNull();
  });

  // ---- Test: Date validation ----

  it('should reject when from_date is after to_date', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: tomorrow,   // AFTER to_date!
        to_date: yesterday,
        reason: 'Invalid date range test',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.to_date).toBeDefined();
    }
  });

  it('should reject when from_date equals to_date', async () => {
    const sameDate = new Date();

    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: sameDate,
        to_date: sameDate,     // Same date!
        reason: 'Same date test for validation',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
    }
  });

  // ---- Test: Required fields ----

  it('should require reason', async () => {
    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: new Date(),
        to_date: new Date(Date.now() + 86400000), // +1 day
        // No reason!
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.reason).toBeDefined();
    }
  });

  // ---- Test: Status enum ----

  it('should reject invalid status values', async () => {
    try {
      await Outpass.create({
        student_id: new mongoose.Types.ObjectId(),
        from_date: new Date(),
        to_date: new Date(Date.now() + 86400000),
        reason: 'Testing invalid status',
        status: 'maybe', // Invalid!
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.status).toBeDefined();
    }
  });

  // ---- Test: Default values ----

  it('should have correct default values', async () => {
    const outpass = await Outpass.create({
      student_id: new mongoose.Types.ObjectId(),
      from_date: new Date(),
      to_date: new Date(Date.now() + 86400000),
      reason: 'Testing defaults here',
    });

    expect(outpass.status).toBe('pending');
    expect(outpass.approved_by).toBeNull();
    expect(outpass.admin_remark).toBe('');
  });
});