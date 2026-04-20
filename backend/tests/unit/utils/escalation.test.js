import mongoose from 'mongoose';
import Complaint from '../../../src/models/Complaint.js';
import Student from '../../../src/models/Student.js';
import User from '../../../src/models/User.js';
import checkEscalation from '../../../src/utils/escalation.js';

describe('Auto-Escalation Utility', () => {
  let studentId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);

    // Create a test user and student for complaints
    const user = await User.create({
      name: 'Test Student',
      email: 'escalation-test@test.com',
      password: 'Password123',
      role: 'student',
    });

    const student = await Student.create({
      user_id: user._id,
      name: 'Test Student',
      email: 'escalation-test@test.com',
    });

    studentId = student._id;
  });

  beforeEach(async () => {
    // Clear complaints before each test
    await Complaint.deleteMany({});
  });

  afterAll(async () => {
    await Complaint.deleteMany({});
    await Student.deleteMany({});
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  // ---- Test: No recent complaints → LOW priority ----

  it('should return "low" when no recent complaints of same category', async () => {
    const priority = await checkEscalation('plumbing');
    expect(priority).toBe('low');
  });

  // ---- Test: Few recent complaints → LOW priority ----

  it('should return "low" when fewer than 3 recent complaints', async () => {
    // Create 2 plumbing complaints (below threshold of 3)
    await Complaint.create({
      student_id: studentId,
      category: 'plumbing',
      description: 'Leaking pipe in bathroom 1',
    });
    await Complaint.create({
      student_id: studentId,
      category: 'plumbing',
      description: 'Leaking pipe in bathroom 2',
    });

    const priority = await checkEscalation('plumbing');
    expect(priority).toBe('low');
  });

  // ---- Test: Threshold met → HIGH priority ----

  it('should return "high" when 3 or more recent complaints of same category', async () => {
    // Create 3 plumbing complaints (meets threshold)
    for (let i = 0; i < 3; i++) {
      await Complaint.create({
        student_id: studentId,
        category: 'plumbing',
        description: `Plumbing issue report number ${i + 1}`,
      });
    }

    const priority = await checkEscalation('plumbing');
    expect(priority).toBe('high');
  });

  // ---- Test: Different categories don't affect each other ----

  it('should not count complaints from different categories', async () => {
    // Create 3 complaints but of DIFFERENT categories
    await Complaint.create({
      student_id: studentId,
      category: 'plumbing',
      description: 'Plumbing issue in room',
    });
    await Complaint.create({
      student_id: studentId,
      category: 'electrical',
      description: 'Electrical issue in room',
    });
    await Complaint.create({
      student_id: studentId,
      category: 'food',
      description: 'Food quality issue today',
    });

    // Each category only has 1 complaint → should be LOW
    const plumbingPriority = await checkEscalation('plumbing');
    expect(plumbingPriority).toBe('low');

    const electricalPriority = await checkEscalation('electrical');
    expect(electricalPriority).toBe('low');
  });

  // ---- Test: Old complaints don't count ----

  it('should not count complaints older than 24 hours', async () => {
    // Create 3 complaints with timestamps older than 24 hours
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago

    for (let i = 0; i < 3; i++) {
      await Complaint.create({
        student_id: studentId,
        category: 'plumbing',
        description: `Old plumbing issue number ${i + 1}`,
        createdAt: oldDate,
      });
    }

    // Even though there are 3 plumbing complaints,
    // they're all older than 24 hours → should be LOW
    const priority = await checkEscalation('plumbing');
    expect(priority).toBe('low');
  });

  // ---- Test: Exactly at threshold ----

  it('should return "high" at exactly 3 complaints (threshold boundary)', async () => {
    // Create exactly 3 complaints
    for (let i = 0; i < 3; i++) {
      await Complaint.create({
        student_id: studentId,
        category: 'electrical',
        description: `Electrical issue number ${i + 1}`,
      });
    }

    const priority = await checkEscalation('electrical');
    expect(priority).toBe('high');
  });

  // ---- Test: Above threshold ----

  it('should return "high" when well above threshold', async () => {
    // Create 10 complaints of same category
    for (let i = 0; i < 10; i++) {
      await Complaint.create({
        student_id: studentId,
        category: 'food',
        description: `Food quality complaint number ${i + 1}`,
      });
    }

    const priority = await checkEscalation('food');
    expect(priority).toBe('high');
  });
});