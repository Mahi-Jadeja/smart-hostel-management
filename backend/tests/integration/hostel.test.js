import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Room from '../../src/models/Room.js';
import HostelConfig from '../../src/models/HostelConfig.js';

describe('Hostel Endpoints', () => {
  let adminToken;
  let studentToken;
  let student1;
  let student2;

  beforeAll(async () => {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});
    await Room.deleteMany({});
    await HostelConfig.deleteMany({});

    // Create admin
    await User.create({
      name: 'Admin User',
      email: 'admin@test.com',
      password: 'Admin123',
      role: 'admin',
    });

    const adminRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin123',
      });

    adminToken = adminRes.body.data.token;

    // Create student 1
    const studentRes1 = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Student One',
        email: 'student1@test.com',
        password: 'Password123',
        gender: 'male',
        branch: 'Computer Science',
        guardian: {
          name: 'Parent One',
          phone: '9876543210',
          email: 'mahijadeja0409@gmail.com',
        },
      });

    studentToken = studentRes1.body.data.token;
    student1 = await Student.findOne({ email: 'student1@test.com' });

    // Create student 2
        await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Student Two',
        email: 'student2@test.com',
        password: 'Password123',
        gender: 'male',
        branch: 'Mechanical Engineering',
        guardian: {
          name: 'Parent Two',
          phone: '9876543211',
          email: 'mahijadeja0409@gmail.com',
        },
      });

    student2 = await Student.findOne({ email: 'student2@test.com' });
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Student.deleteMany({});
    await Room.deleteMany({});
    await HostelConfig.deleteMany({});
    await mongoose.disconnect();
  });

  describe('POST /api/v1/hostel/config', () => {
    it('should allow admin to create hostel config', async () => {
      const res = await request(app)
        .post('/api/v1/hostel/config')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          hostel_name: 'Boys Hostel',
          hostel_block: 'A',
          total_floors: 2,
          rooms_per_floor: 3,
          default_capacity: 2,
          block_gender: 'male',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.config.hostel_block).toBe('A');
      expect(res.body.data.config.total_floors).toBe(2);
    });

    it('should reject student access', async () => {
      await request(app)
        .post('/api/v1/hostel/config')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          hostel_name: 'Boys Hostel',
          hostel_block: 'A',
          total_floors: 2,
          rooms_per_floor: 3,
          default_capacity: 2,
          block_gender: 'male',
        })
        .expect(403);
    });
  });

  describe('POST /api/v1/hostel/generate-rooms', () => {
    beforeEach(async () => {
      await HostelConfig.create({
        hostel_name: 'Boys Hostel',
        hostel_block: 'A',
        total_floors: 2,
        rooms_per_floor: 3,
        default_capacity: 2,
        block_gender: 'male',
      });
    });

    it('should generate correct number of rooms', async () => {
      const res = await request(app)
        .post('/api/v1/hostel/generate-rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hostel_block: 'A' })
        .expect(201);

      expect(res.body.data.generatedCount).toBe(6);

      const rooms = await Room.find({ hostel_block: 'A' }).sort({ room_no: 1 });
      expect(rooms).toHaveLength(6);
    });

    it('should generate correct room numbers', async () => {
      await request(app)
        .post('/api/v1/hostel/generate-rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hostel_block: 'A' })
        .expect(201);

      const rooms = await Room.find({ hostel_block: 'A' }).sort({ room_no: 1 });

      const roomNumbers = rooms.map((room) => room.room_no);
      expect(roomNumbers).toEqual(['101', '102', '103', '201', '202', '203']);
    });

    it('should not regenerate occupied rooms', async () => {
      const room = await Room.create({
        room_no: '101',
        hostel_block: 'A',
        floor: 1,
        capacity: 2,
        students: [student1._id],
      });

      await request(app)
        .post('/api/v1/hostel/generate-rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ hostel_block: 'A' })
        .expect(400);
    });
  });

  describe('GET /api/v1/hostel/layout', () => {
    beforeEach(async () => {
      await HostelConfig.create({
        hostel_name: 'Boys Hostel',
        hostel_block: 'A',
        total_floors: 2,
        rooms_per_floor: 2,
        default_capacity: 2,
        block_gender: 'male',
      });

      await Room.insertMany([
        {
          room_no: '101',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '102',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [student1._id],
        },
        {
          room_no: '201',
          hostel_block: 'A',
          floor: 2,
          capacity: 2,
          students: [student1._id, student2._id],
        },
        {
          room_no: '202',
          hostel_block: 'A',
          floor: 2,
          capacity: 2,
          students: [],
        },
      ]);
    });

    it('should return grouped floor layout and stats', async () => {
      const res = await request(app)
        .get('/api/v1/hostel/layout?block=A')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.block).toBe('A');
      expect(res.body.data.floors).toHaveLength(2);
      expect(res.body.data.stats.totalRooms).toBe(4);
    });
  });

  describe('POST /api/v1/hostel/allocate', () => {
    let room1;
    let room2;

    beforeEach(async () => {
      room1 = await Room.create({
        room_no: '101',
        hostel_block: 'A',
        floor: 1,
        capacity: 2,
        students: [],
      });

      room2 = await Room.create({
        room_no: '102',
        hostel_block: 'A',
        floor: 1,
        capacity: 2,
        students: [],
      });
    });

    it('should allocate student to room and assign bed number', async () => {
      const res = await request(app)
        .post('/api/v1/hostel/allocate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: student1._id.toString(),
          room_id: room1._id.toString(),
        })
        .expect(200);

      expect(res.body.success).toBe(true);

      const updatedStudent = await Student.findById(student1._id);
      const updatedRoom = await Room.findById(room1._id);

      expect(updatedStudent.room_no).toBe('101');
      expect(updatedStudent.hostel_block).toBe('A');
      expect(updatedStudent.bed_no).toBe(1);
      expect(updatedRoom.students).toHaveLength(1);
    });

    it('should move student from old room to new room automatically', async () => {
      // First allocation
      await request(app)
        .post('/api/v1/hostel/allocate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: student1._id.toString(),
          room_id: room1._id.toString(),
        })
        .expect(200);

      // Move to another room
      await request(app)
        .post('/api/v1/hostel/allocate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: student1._id.toString(),
          room_id: room2._id.toString(),
        })
        .expect(200);

      const updatedStudent = await Student.findById(student1._id);
      const updatedRoom1 = await Room.findById(room1._id);
      const updatedRoom2 = await Room.findById(room2._id);

      expect(updatedStudent.room_no).toBe('102');
      expect(updatedRoom1.students).toHaveLength(0);
      expect(updatedRoom2.students).toHaveLength(1);
    });

    it('should not allow allocation to full room', async () => {
      room1.students = [student1._id, student2._id];
      await room1.save();

      await request(app)
        .post('/api/v1/hostel/allocate')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          student_id: student1._id.toString(),
          room_id: room1._id.toString(),
        })
        .expect(400);
    });
  });

  describe('DELETE /api/v1/hostel/deallocate/:studentId', () => {
    let room;

    beforeEach(async () => {
      room = await Room.create({
        room_no: '101',
        hostel_block: 'A',
        floor: 1,
        capacity: 2,
        students: [student1._id],
      });

      student1.room_no = '101';
      student1.hostel_block = 'A';
      student1.floor = 1;
      student1.bed_no = 1;
      await student1.save();
    });

    it('should deallocate student and clear room fields', async () => {
      await request(app)
        .delete(`/api/v1/hostel/deallocate/${student1._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const updatedStudent = await Student.findById(student1._id);
      const updatedRoom = await Room.findById(room._id);

      expect(updatedStudent.room_no).toBe('');
      expect(updatedStudent.hostel_block).toBe('');
      expect(updatedStudent.bed_no).toBeNull();
      expect(updatedRoom.students).toHaveLength(0);
    });
  });

  describe('GET /api/v1/hostel/eligible-students', () => {
    it('should return only unallocated active hostellers', async () => {
      // Allocate student1 manually
      student1.room_no = '101';
      student1.hostel_block = 'A';
      await student1.save();

      const res = await request(app)
        .get('/api/v1/hostel/eligible-students')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ids = res.body.data.students.map((student) => student._id);

      expect(ids).toContain(student2._id.toString());
      expect(ids).not.toContain(student1._id.toString());
    });
  });

  describe('POST /api/v1/hostel/allocate/preview and /execute', () => {
    beforeEach(async () => {
      // Update student2 to female for gender-separation test
      student2.gender = 'female';
      student2.branch = 'Civil Engineering';
      await student2.save();

      await HostelConfig.create([
        {
          hostel_name: 'Boys Hostel',
          hostel_block: 'A',
          block_gender: 'male',
          total_floors: 1,
          rooms_per_floor: 2,
          default_capacity: 2,
        },
        {
          hostel_name: 'Girls Hostel',
          hostel_block: 'B',
          block_gender: 'female',
          total_floors: 1,
          rooms_per_floor: 2,
          default_capacity: 2,
        },
      ]);

      await Room.insertMany([
        {
          room_no: '101',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '102',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '101',
          hostel_block: 'B',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '102',
          hostel_block: 'B',
          floor: 1,
          capacity: 2,
          students: [],
        },
      ]);
    });

    it('should preview random bulk allocation with gender-correct blocks', async () => {
      const res = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'random',
          scope: 'unallocated',
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.preview.seed).toBeDefined();
      expect(res.body.data.preview.summary.totalEligibleStudents).toBeGreaterThanOrEqual(2);
      expect(res.body.data.preview.allocations).toHaveLength(2);

      const student1Allocation = res.body.data.preview.allocations.find(
        (item) => item.student_id === student1._id.toString()
      );
      const student2Allocation = res.body.data.preview.allocations.find(
        (item) => item.student_id === student2._id.toString()
      );

      expect(student1Allocation.hostel_block).toBe('A');
      expect(student2Allocation.hostel_block).toBe('B');
    });

    it('should execute random bulk allocation and persist student room data', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'random',
          scope: 'unallocated',
        })
        .expect(200);

      const seed = previewRes.body.data.preview.seed;

      const executeRes = await request(app)
        .post('/api/v1/hostel/allocate/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'random',
          scope: 'unallocated',
          seed,
        })
        .expect(200);

      expect(executeRes.body.success).toBe(true);
      expect(executeRes.body.data.executed.studentsAllocated).toBe(2);

      const updatedStudent1 = await Student.findById(student1._id);
      const updatedStudent2 = await Student.findById(student2._id);

      expect(updatedStudent1.hostel_block).toBe('A');
      expect(updatedStudent1.room_no).toBeTruthy();
      expect(updatedStudent1.bed_no).toBeTruthy();

      expect(updatedStudent2.hostel_block).toBe('B');
      expect(updatedStudent2.room_no).toBeTruthy();
      expect(updatedStudent2.bed_no).toBeTruthy();
    });
  });
    describe('Preference mode bulk allocation and selected-block scope S2', () => {
    let student3;

    beforeEach(async () => {
      // Make current students standardized for this test
      student1.gender = 'male';
      student1.branch = 'Computer Science';
      student1.year = 2;
      await student1.save();

      student2.gender = 'male';
      student2.branch = 'Computer Science';
      student2.year = 2;
      await student2.save();

      // Additional male unallocated student
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Student Three',
          email: 'student3@test.com',
          password: 'Password123',
          gender: 'male',
          branch: 'Mechanical Engineering',
          guardian: {
            name: 'Parent Three',
            phone: '9876543222',
            email: 'mahijadeja0409@gmail.com',
          },
        });

      student3 = await Student.findOne({ email: 'student3@test.com' });

      // Male block A and female block B
      await HostelConfig.create([
        {
          hostel_name: 'Boys Hostel',
          hostel_block: 'A',
          block_gender: 'male',
          total_floors: 1,
          rooms_per_floor: 3,
          default_capacity: 2,
        },
        {
          hostel_name: 'Girls Hostel',
          hostel_block: 'B',
          block_gender: 'female',
          total_floors: 1,
          rooms_per_floor: 2,
          default_capacity: 2,
        },
      ]);

      await Room.insertMany([
        {
          room_no: '101',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '102',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '103',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '101',
          hostel_block: 'B',
          floor: 1,
          capacity: 2,
          students: [],
        },
      ]);
    });

    it('should honor clean mutual roommate pair in preference mode', async () => {
      // Mutual preference: student1 <-> student2
      student1.room_preference = {
        preferred_roommate: student2._id,
      };
      await student1.save();

      student2.room_preference = {
        preferred_roommate: student1._id,
      };
      await student2.save();

      const previewRes = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'preference',
          scope: 'unallocated',
        })
        .expect(200);

      expect(previewRes.body.success).toBe(true);
      expect(previewRes.body.data.preview.summary.preferencePairsHonored).toBe(1);

      const allocations = previewRes.body.data.preview.allocations;

      const allocation1 = allocations.find(
        (item) => item.student_id === student1._id.toString()
      );
      const allocation2 = allocations.find(
        (item) => item.student_id === student2._id.toString()
      );

      expect(allocation1).toBeDefined();
      expect(allocation2).toBeDefined();

      expect(allocation1.hostel_block).toBe('A');
      expect(allocation2.hostel_block).toBe('A');
      expect(allocation1.room_no).toBe(allocation2.room_no);
      expect(allocation1.allocation_stage).toBe('preferred_pair');
      expect(allocation2.allocation_stage).toBe('preferred_pair');
    });

    it('should execute preference mode and persist mutual pair in same room', async () => {
      student1.room_preference = {
        preferred_roommate: student2._id,
      };
      await student1.save();

      student2.room_preference = {
        preferred_roommate: student1._id,
      };
      await student2.save();

      const previewRes = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'preference',
          scope: 'unallocated',
        })
        .expect(200);

      const seed = previewRes.body.data.preview.seed;

      const executeRes = await request(app)
        .post('/api/v1/hostel/allocate/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'preference',
          scope: 'unallocated',
          seed,
        })
        .expect(200);

      expect(executeRes.body.success).toBe(true);

      const updatedStudent1 = await Student.findById(student1._id);
      const updatedStudent2 = await Student.findById(student2._id);

      expect(updatedStudent1.hostel_block).toBe('A');
      expect(updatedStudent2.hostel_block).toBe('A');
      expect(updatedStudent1.room_no).toBe(updatedStudent2.room_no);
      expect(updatedStudent1.bed_no).not.toBe(updatedStudent2.bed_no);
    });

    it('should include matching unallocated students in selected-block reshuffle scope S2', async () => {
      // Allocate student1 into selected male block A
      const roomA101 = await Room.findOne({
        hostel_block: 'A',
        room_no: '101',
      });

      roomA101.students = [student1._id];
      await roomA101.save();

      student1.room_no = '101';
      student1.hostel_block = 'A';
      student1.floor = 1;
      student1.bed_no = 1;
      await student1.save();

      // student2 stays unallocated male
      student2.gender = 'male';
      student2.branch = 'Mechanical Engineering';
      await student2.save();

      const previewRes = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'random',
          scope: 'reshuffle_selected_blocks',
          selected_blocks: ['A'],
        })
        .expect(200);

      expect(previewRes.body.success).toBe(true);

      const candidateIds = previewRes.body.data.preview.meta.candidate_student_ids;

      // student1 is already in selected block A
      expect(candidateIds).toContain(student1._id.toString());

      // student2 is unallocated male and block A is male → included under S2
      expect(candidateIds).toContain(student2._id.toString());

      // student3 is also male unallocated, so also included
      expect(candidateIds).toContain(student3._id.toString());
    });
  });
    describe('Branch mode bulk allocation', () => {
    let student3;
    let student4;

    beforeEach(async () => {
      // Standardize existing students
      student1.gender = 'male';
      student1.branch = 'Computer Science';
      student1.year = 2;
      await student1.save();

      student2.gender = 'male';
      student2.branch = 'Computer Science';
      student2.year = 2;
      await student2.save();

      // Additional male student: Civil, same year
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Student Three',
          email: 'student3@test.com',
          password: 'Password123',
          gender: 'male',
          branch: 'Civil Engineering',
          guardian: {
            name: 'Parent Three',
            phone: '9876543222',
            email: 'mahijadeja0409@gmail.com',
          },
        });

      student3 = await Student.findOne({ email: 'student3@test.com' });
      student3.year = 2;
      await student3.save();

      // Additional male student: Mechanical, same year
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Student Four',
          email: 'student4@test.com',
          password: 'Password123',
          gender: 'male',
          branch: 'Mechanical Engineering',
          guardian: {
            name: 'Parent Four',
            phone: '9876543223',
            email: 'mahijadeja0409@gmail.com',
          },
        });

      student4 = await Student.findOne({ email: 'student4@test.com' });
      student4.year = 2;
      await student4.save();

      await HostelConfig.create([
        {
          hostel_name: 'Boys Hostel',
          hostel_block: 'A',
          block_gender: 'male',
          total_floors: 1,
          rooms_per_floor: 3,
          default_capacity: 2,
        },
      ]);

      await Room.insertMany([
        {
          room_no: '101',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '102',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
        {
          room_no: '103',
          hostel_block: 'A',
          floor: 1,
          capacity: 2,
          students: [],
        },
      ]);
    });

    it('should keep same-year same-branch students together first in branch mode', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'branch',
          scope: 'unallocated',
        })
        .expect(200);

      expect(previewRes.body.success).toBe(true);

      const allocations = previewRes.body.data.preview.allocations;

      const allocation1 = allocations.find(
        (item) => item.student_id === student1._id.toString()
      );
      const allocation2 = allocations.find(
        (item) => item.student_id === student2._id.toString()
      );

      expect(allocation1).toBeDefined();
      expect(allocation2).toBeDefined();
      expect(allocation1.room_no).toBe(allocation2.room_no);
      expect(allocation1.allocation_stage).toBe('same_year_same_branch');
      expect(allocation2.allocation_stage).toBe('same_year_same_branch');
    });

    it('should allow same-year fallback mixing for leftover branches', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'branch',
          scope: 'unallocated',
        })
        .expect(200);

      const allocations = previewRes.body.data.preview.allocations;

      const allocation3 = allocations.find(
        (item) => item.student_id === student3._id.toString()
      );
      const allocation4 = allocations.find(
        (item) => item.student_id === student4._id.toString()
      );

      expect(allocation3).toBeDefined();
      expect(allocation4).toBeDefined();

      // These two different-branch students are same year,
      // so one of them should reach same_year or same_gender_mixed stage.
      expect(
        ['same_year', 'same_gender_mixed', 'same_year_same_branch']
      ).toContain(allocation3.allocation_stage);

      expect(
        ['same_year', 'same_gender_mixed', 'same_year_same_branch']
      ).toContain(allocation4.allocation_stage);
    });

    it('should execute branch mode and persist room allocation', async () => {
      const previewRes = await request(app)
        .post('/api/v1/hostel/allocate/preview')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'branch',
          scope: 'unallocated',
        })
        .expect(200);

      const seed = previewRes.body.data.preview.seed;

      const executeRes = await request(app)
        .post('/api/v1/hostel/allocate/execute')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          mode: 'branch',
          scope: 'unallocated',
          seed,
        })
        .expect(200);

      expect(executeRes.body.success).toBe(true);
      expect(executeRes.body.data.executed.studentsAllocated).toBe(4);

      const updatedStudent1 = await Student.findById(student1._id);
      const updatedStudent2 = await Student.findById(student2._id);
      const updatedStudent3 = await Student.findById(student3._id);
      const updatedStudent4 = await Student.findById(student4._id);

      expect(updatedStudent1.hostel_block).toBe('A');
      expect(updatedStudent2.hostel_block).toBe('A');
      expect(updatedStudent3.hostel_block).toBe('A');
      expect(updatedStudent4.hostel_block).toBe('A');

      expect(updatedStudent1.room_no).toBeTruthy();
      expect(updatedStudent2.room_no).toBeTruthy();
      expect(updatedStudent3.room_no).toBeTruthy();
      expect(updatedStudent4.room_no).toBeTruthy();
    });
  });
});
