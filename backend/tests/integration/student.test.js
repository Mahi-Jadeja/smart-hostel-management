import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Room from '../../src/models/Room.js';

describe('Student Endpoints', () => {
  let studentToken;
  let adminToken;
  let studentUser;
  let studentProfile;

  beforeAll(async () => {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Student.deleteMany({});
    await Room.deleteMany({});

    // Create a student via registration endpoint
    const studentRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Student',
        email: 'mahijadeja0409@gmail.com',
        password: 'Password123',
        gender: 'male',
        branch: 'Computer Science',
        guardian: {
          name: 'Student Parent',
          phone: '9876543210',
          email: 'mahijadeja0409@gmail.com',
        },
      });
    studentToken = studentRes.body.data.token;
    studentUser = studentRes.body.data.user;

    // Get the student profile
    studentProfile = await Student.findOne({ user_id: studentUser.id });

    // Create an admin
    const admin = await User.create({
      name: 'Admin',
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
    await Room.deleteMany({});
    await mongoose.disconnect();
  });

  // ============================================================
  // GET /api/v1/student/profile
  // ============================================================

  describe('GET /api/v1/student/profile', () => {
    it('should return student profile', async () => {
      const res = await request(app)
        .get('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.student).toHaveProperty('name', 'Test Student');
      expect(res.body.data.student).toHaveProperty('email', 'mahijadeja0409@gmail.com');
      expect(res.body.data.student).toHaveProperty('user_id');
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/v1/student/profile')
        .expect(401);
    });
  });

  // ============================================================
  // PUT /api/v1/student/profile
  // ============================================================

  describe('PUT /api/v1/student/profile', () => {
    it('should update student profile with valid data', async () => {
      const res = await request(app)
        .put('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          phone: '9876543210',
          branch: 'Computer Science',
          year: 2,
          semester: 3,
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.student.phone).toBe('9876543210');
      expect(res.body.data.student.branch).toBe('Computer Science');
      expect(res.body.data.student.year).toBe(2);
      expect(res.body.data.student.semester).toBe(3);
    });

    it('should update guardian info', async () => {
      const res = await request(app)
        .put('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          guardian: {
            name: 'Mrs. Smith',
            phone: '1234567890',
          },
        })
        .expect(200);

      expect(res.body.data.student.guardian.name).toBe('Mrs. Smith');
      expect(res.body.data.student.guardian.phone).toBe('1234567890');
    });

    it('should update name in both Student and User', async () => {
      await request(app)
        .put('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      // Check Student document
      const student = await Student.findOne({ user_id: studentUser.id });
      expect(student.name).toBe('Updated Name');

      // Check User document
      const user = await User.findById(studentUser.id);
      expect(user.name).toBe('Updated Name');
    });

    it('should NOT allow updating room fields', async () => {
      const res = await request(app)
        .put('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          room_no: '101',
          hostel_block: 'A',
          floor: 1,
          bed_no: 2,
          phone: '9999999999',
        })
        .expect(200);

      // room fields should be stripped by Zod
      // Only phone should be updated
      const student = await Student.findOne({ user_id: studentUser.id });
      expect(student.phone).toBe('9999999999');
      expect(student.room_no).toBe('');  // Still empty
      expect(student.hostel_block).toBe('');  // Still empty
    });

    it('should NOT allow updating is_active or is_hosteller', async () => {
      await request(app)
        .put('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          is_active: false,
          is_hosteller: false,
        })
        .expect(200);

      const student = await Student.findOne({ user_id: studentUser.id });
      expect(student.is_active).toBe(true);  // Unchanged
      expect(student.is_hosteller).toBe(true);  // Unchanged
    });

    it('should reject invalid year', async () => {
      await request(app)
        .put('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ year: 7 })
        .expect(400);
    });

    it('should reject invalid gender', async () => {
      await request(app)
        .put('/api/v1/student/profile')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ gender: 'alien' })
        .expect(400);
    });
  });

  // ============================================================
  // GET /api/v1/student/room
  // ============================================================

  describe('GET /api/v1/student/room', () => {
    it('should return null when no room is allocated', async () => {
      const res = await request(app)
        .get('/api/v1/student/room')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.data.room).toBeNull();
    });

    it('should return room details when allocated', async () => {
      // Manually allocate a room
      const room = await Room.create({
        room_no: '101',
        hostel_block: 'A',
        floor: 1,
        capacity: 3,
        students: [studentProfile._id],
      });

      // Update student's hostel info
      studentProfile.room_no = '101';
      studentProfile.hostel_block = 'A';
      studentProfile.floor = 1;
      studentProfile.bed_no = 1;
      await studentProfile.save();

      const res = await request(app)
        .get('/api/v1/student/room')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.data.room).not.toBeNull();
      expect(res.body.data.room.room_no).toBe('101');
      expect(res.body.data.room.hostel_block).toBe('A');
      expect(res.body.data.room.capacity).toBe(3);
      expect(res.body.data.bed_no).toBe(1);
    });

    it('should include roommates but exclude current student', async () => {
      // Create another student
      const roommateUser = await User.create({
        name: 'Roommate',
        email: 'roommate@test.com',
        password: 'Password123',
      });
      const roommate = await Student.create({
        user_id: roommateUser._id,
        name: 'Roommate',
        email: 'roommate@test.com',
      });

      // Create room with both students
      await Room.create({
        room_no: '101',
        hostel_block: 'A',
        floor: 1,
        capacity: 3,
        students: [studentProfile._id, roommate._id],
      });

      // Update both students' hostel info
      studentProfile.room_no = '101';
      studentProfile.hostel_block = 'A';
      await studentProfile.save();

      const res = await request(app)
        .get('/api/v1/student/room')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Roommates should only contain the OTHER student
      expect(res.body.data.room.roommates).toHaveLength(1);
      expect(res.body.data.room.roommates[0].name).toBe('Roommate');
    });
  });

  // ============================================================
  // GET /api/v1/student/dashboard-stats
  // ============================================================

  describe('GET /api/v1/student/dashboard-stats', () => {
    it('should return empty stats for new student', async () => {
      const res = await request(app)
        .get('/api/v1/student/dashboard-stats')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.data.complaints.total).toBe(0);
      expect(res.body.data.outpasses.total).toBe(0);
      expect(res.body.data.payments.pendingCount).toBe(0);
      expect(res.body.data.payments.totalPendingAmount).toBe(0);
      expect(res.body.data.recent.complaints).toHaveLength(0);
      expect(res.body.data.recent.outpasses).toHaveLength(0);
    });

    it('should return 401 without token', async () => {
      await request(app)
        .get('/api/v1/student/dashboard-stats')
        .expect(401);
    });
  });
});