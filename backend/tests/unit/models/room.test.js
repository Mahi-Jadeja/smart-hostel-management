import mongoose from 'mongoose';
import Room from '../../../src/models/Room.js';

describe('Room Model', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await Room.deleteMany({});
  });

  afterAll(async () => {
    await Room.deleteMany({});
    await mongoose.disconnect();
  });

  // ---- Test: Successful creation ----

  it('should create a room with valid data', async () => {
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
      capacity: 3,
    });

    expect(room.room_no).toBe('101');
    expect(room.hostel_block).toBe('A');
    expect(room.floor).toBe(1);
    expect(room.capacity).toBe(3);
    expect(room.occupied).toBe(0);
    expect(room.status).toBe('empty');
    expect(room.students).toHaveLength(0);
  });

  // ---- Test: Auto-status computation ----

  it('should set status to "empty" when no students', async () => {
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
      capacity: 3,
      students: [],
    });

    expect(room.status).toBe('empty');
    expect(room.occupied).toBe(0);
  });

  it('should set status to "partial" when some students', async () => {
    // Create a fake ObjectId (we don't need a real student for this test)
    const fakeStudentId = new mongoose.Types.ObjectId();

    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
      capacity: 3,
      students: [fakeStudentId],
    });

    expect(room.status).toBe('partial');
    expect(room.occupied).toBe(1);
  });

  it('should set status to "full" when at capacity', async () => {
    const fakeIds = [
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
      new mongoose.Types.ObjectId(),
    ];

    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
      capacity: 3,
      students: fakeIds,
    });

    expect(room.status).toBe('full');
    expect(room.occupied).toBe(3);
  });

  it('should update status when students are added', async () => {
    // Create empty room
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
      capacity: 3,
    });
    expect(room.status).toBe('empty');

    // Add a student
    room.students.push(new mongoose.Types.ObjectId());
    await room.save();

    expect(room.status).toBe('partial');
    expect(room.occupied).toBe(1);

    // Add two more students (now full)
    room.students.push(new mongoose.Types.ObjectId());
    room.students.push(new mongoose.Types.ObjectId());
    await room.save();

    expect(room.status).toBe('full');
    expect(room.occupied).toBe(3);
  });

  it('should update status when students are removed', async () => {
    const studentId = new mongoose.Types.ObjectId();

    // Create room with one student
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
      capacity: 3,
      students: [studentId],
    });
    expect(room.status).toBe('partial');

    // Remove the student
    room.students.pull(studentId);
    // .pull() removes an element from a Mongoose array by value
    await room.save();

    expect(room.status).toBe('empty');
    expect(room.occupied).toBe(0);
  });

  it('should not change maintenance status automatically', async () => {
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
      capacity: 3,
      status: 'maintenance',
    });

    expect(room.status).toBe('maintenance');

    // Even with no students, status should stay 'maintenance'
    // because it was manually set by admin
  });

  // ---- Test: Uppercase hostel_block ----

  it('should convert hostel_block to uppercase', async () => {
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'a', // lowercase
      floor: 1,
    });

    expect(room.hostel_block).toBe('A'); // should be uppercase
  });

  // ---- Test: Required fields ----

  it('should require room_no', async () => {
    try {
      await Room.create({
        hostel_block: 'A',
        floor: 1,
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.room_no).toBeDefined();
    }
  });

  it('should require hostel_block', async () => {
    try {
      await Room.create({
        room_no: '101',
        floor: 1,
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.hostel_block).toBeDefined();
    }
  });

  it('should require floor', async () => {
    try {
      await Room.create({
        room_no: '101',
        hostel_block: 'A',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.floor).toBeDefined();
    }
  });

  // ---- Test: Unique compound index ----

  it('should not allow duplicate room_no in same block', async () => {
    await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
    });

    try {
      await Room.create({
        room_no: '101',
        hostel_block: 'A', // Same block!
        floor: 1,
      });
      fail('Should have thrown duplicate error');
    } catch (error) {
      expect(error.code).toBe(11000);
    }
  });

  it('should allow same room_no in different blocks', async () => {
    await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
    });

    // Same room_no but different block — should be fine
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'B',
      floor: 1,
    });

    expect(room.room_no).toBe('101');
    expect(room.hostel_block).toBe('B');
  });

  // ---- Test: Default values ----

  it('should have correct default values', async () => {
    const room = await Room.create({
      room_no: '101',
      hostel_block: 'A',
      floor: 1,
    });

    expect(room.capacity).toBe(3); // default
    expect(room.occupied).toBe(0); // default
    expect(room.status).toBe('empty'); // computed default
    expect(room.students).toHaveLength(0);
  });
});