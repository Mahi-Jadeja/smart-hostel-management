import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Complaint from '../../src/models/Complaint.js';

describe('Complaint Endpoints', () => {
  let studentToken;
  let adminToken;
  let studentProfile;
  let adminUser;

  beforeAll(async () => {
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Clean up
    await User.deleteMany({});
    await Student.deleteMany({});
    await Complaint.deleteMany({});

    // Create student
    const studentRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Student User',
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
    studentProfile = await Student.findOne({ email: 'mahijadeja0409@gmail.com' });

    // Update student with room info
    studentProfile.room_no = '101';
    studentProfile.hostel_block = 'A';
    await studentProfile.save();

    // Create admin
    adminUser = await User.create({
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
    await Complaint.deleteMany({});
    await mongoose.disconnect();
  });

  // ============================================================
  // CREATE COMPLAINT
  // ============================================================

  describe('POST /api/v1/complaints', () => {
    it('should create a complaint with valid data', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          category: 'plumbing',
          description: 'There is a water leak in the bathroom near the sink.',
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.complaint).toHaveProperty('_id');
      expect(res.body.data.complaint.category).toBe('plumbing');
      expect(res.body.data.complaint.status).toBe('pending');
      expect(res.body.data.complaint.priority).toBe('low');
      expect(res.body.data.complaint.room_no).toBe('101');
      expect(res.body.data.complaint.hostel_block).toBe('A');
    });

    it('should auto-fill room info from student profile', async () => {
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          category: 'electrical',
          description: 'Light bulb is flickering in the room continuously.',
        })
        .expect(201);

      expect(res.body.data.complaint.room_no).toBe('101');
      expect(res.body.data.complaint.hostel_block).toBe('A');
    });

    it('should reject complaint with description too short', async () => {
      await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          category: 'plumbing',
          description: 'Short',
        })
        .expect(400);
    });

    it('should reject complaint with invalid category', async () => {
      await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          category: 'invalid_category',
          description: 'This is a valid description for the complaint.',
        })
        .expect(400);
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/v1/complaints')
        .send({
          category: 'plumbing',
          description: 'There is a water leak in the bathroom.',
        })
        .expect(401);
    });
  });

  // ============================================================
  // AUTO-ESCALATION
  // ============================================================

  describe('Auto-Escalation', () => {
    it('should auto-escalate to HIGH when 3+ similar complaints exist', async () => {
      // Create 3 plumbing complaints
      for (let i = 0; i < 3; i++) {
        await Complaint.create({
          student_id: studentProfile._id,
          category: 'plumbing',
          description: `Plumbing issue number ${i + 1} in the hostel building.`,
        });
      }

      // Create a 4th plumbing complaint — should be auto-escalated
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          category: 'plumbing',
          description: 'Another plumbing issue that should be escalated automatically.',
        })
        .expect(201);

      expect(res.body.data.complaint.priority).toBe('high');
      expect(res.body.message).toContain('HIGH priority');
    });

    it('should NOT escalate when different categories', async () => {
      // Create 3 complaints of DIFFERENT categories
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Plumbing issue in the bathroom area.',
      });
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'electrical',
        description: 'Electrical issue with the lights.',
      });
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'food',
        description: 'Food quality issue in mess today.',
      });

      // Create another plumbing complaint — should NOT be escalated
      // (only 1 previous plumbing complaint)
      const res = await request(app)
        .post('/api/v1/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          category: 'plumbing',
          description: 'Another plumbing issue but should not escalate.',
        })
        .expect(201);

      expect(res.body.data.complaint.priority).toBe('low');
    });
  });

  // ============================================================
  // GET MY COMPLAINTS
  // ============================================================

  describe('GET /api/v1/complaints/mine', () => {
    it('should return only the student\'s own complaints', async () => {
      // Create complaints for our student
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'My plumbing complaint description here.',
      });
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'electrical',
        description: 'My electrical complaint description here.',
      });

      // Create another student with a complaint
      const otherUser = await User.create({
        name: 'Other',
        email: 'other@test.com',
        password: 'Password123',
      });
      const otherStudent = await Student.create({
        user_id: otherUser._id,
        name: 'Other',
        email: 'other@test.com',
      });
      await Complaint.create({
        student_id: otherStudent._id,
        category: 'food',
        description: 'Other student food complaint here.',
      });

      const res = await request(app)
        .get('/api/v1/complaints/mine')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Should only see 2 complaints (not the other student's)
      expect(res.body.data.data).toHaveLength(2);
      expect(res.body.data.pagination.totalItems).toBe(2);
    });

    it('should return paginated results', async () => {
      // Create 15 complaints
      for (let i = 0; i < 15; i++) {
        await Complaint.create({
          student_id: studentProfile._id,
          category: 'plumbing',
          description: `Complaint number ${i + 1} for pagination test.`,
        });
      }

      const res = await request(app)
        .get('/api/v1/complaints/mine?page=1&limit=10')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(res.body.data.data).toHaveLength(10);
      expect(res.body.data.pagination.totalItems).toBe(15);
      expect(res.body.data.pagination.totalPages).toBe(2);
      expect(res.body.data.pagination.hasNextPage).toBe(true);
    });
  });

  // ============================================================
  // GET ALL COMPLAINTS (Admin)
  // ============================================================

  describe('GET /api/v1/complaints (Admin)', () => {
    it('should return all complaints for admin', async () => {
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'First complaint for admin view test.',
      });
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'electrical',
        description: 'Second complaint for admin view test.',
      });

      const res = await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.data.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by status', async () => {
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Pending complaint for filter test here.',
        status: 'pending',
      });
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'electrical',
        description: 'Resolved complaint for filter test here.',
        status: 'resolved',
      });

      const res = await request(app)
        .get('/api/v1/complaints?status=pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.data.forEach((complaint) => {
        expect(complaint.status).toBe('pending');
      });
    });

    it('should filter by priority', async () => {
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'High priority complaint for filter test.',
        priority: 'high',
      });
      await Complaint.create({
        student_id: studentProfile._id,
        category: 'electrical',
        description: 'Low priority complaint for filter test.',
        priority: 'low',
      });

      const res = await request(app)
        .get('/api/v1/complaints?priority=high')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.data.forEach((complaint) => {
        expect(complaint.priority).toBe('high');
      });
    });

    it('should return 403 for non-admin', async () => {
      await request(app)
        .get('/api/v1/complaints')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });

  // ============================================================
  // UPDATE COMPLAINT (Admin)
  // ============================================================

  describe('PATCH /api/v1/complaints/:id (Admin)', () => {
    it('should update complaint status', async () => {
      const complaint = await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Complaint to be updated by admin.',
      });

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(res.body.data.complaint.status).toBe('in_progress');
    });

    it('should set resolved_at when status changes to resolved', async () => {
      const complaint = await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Complaint to be resolved by admin.',
      });

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved' })
        .expect(200);

      expect(res.body.data.complaint.status).toBe('resolved');
      expect(res.body.data.complaint.resolved_at).not.toBeNull();
    });

    it('should update admin_remark', async () => {
      const complaint = await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Complaint needing admin remark.',
      });

      const res = await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          status: 'in_progress',
          admin_remark: 'Maintenance team has been notified.',
        })
        .expect(200);

      expect(res.body.data.complaint.admin_remark).toBe(
        'Maintenance team has been notified.'
      );
    });

    it('should return 403 for non-admin', async () => {
      const complaint = await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Complaint that student cannot update.',
      });

      await request(app)
        .patch(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ status: 'resolved' })
        .expect(403);
    });
  });

  // ============================================================
  // DELETE COMPLAINT (Student)
  // ============================================================

  describe('DELETE /api/v1/complaints/:id (Student)', () => {
    it('should delete own pending complaint', async () => {
      const complaint = await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Pending complaint to delete by owner.',
        status: 'pending',
      });

      await request(app)
        .delete(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      // Verify it's deleted
      const found = await Complaint.findById(complaint._id);
      expect(found).toBeNull();
    });

    it('should NOT delete in_progress complaint', async () => {
      const complaint = await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'In progress complaint cannot be deleted.',
        status: 'in_progress',
      });

      const res = await request(app)
        .delete(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);

      expect(res.body.message).toContain('in_progress');
    });

    it('should NOT delete resolved complaint', async () => {
      const complaint = await Complaint.create({
        student_id: studentProfile._id,
        category: 'plumbing',
        description: 'Resolved complaint cannot be deleted.',
        status: 'resolved',
      });

      await request(app)
        .delete(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(400);
    });

    it('should NOT delete another student\'s complaint', async () => {
      // Create another student
      const otherUser = await User.create({
        name: 'Other',
        email: 'other2@test.com',
        password: 'Password123',
      });
      const otherStudent = await Student.create({
        user_id: otherUser._id,
        name: 'Other',
        email: 'other2@test.com',
      });

      const complaint = await Complaint.create({
        student_id: otherStudent._id,
        category: 'plumbing',
        description: 'Other student complaint cannot delete.',
        status: 'pending',
      });

      await request(app)
        .delete(`/api/v1/complaints/${complaint._id}`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });
});