import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import Outpass from '../../src/models/Outpass.js';

// Helper to generate dates that ALWAYS pass model validation
const getFutureDate = (daysFromNow = 1) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(0, 0, 0, 0);
    return date;
};

describe('Outpass Endpoints', () => {
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
        await Outpass.deleteMany({});

        // 1. Create Student
        const studentRes = await request(app)
            .post('/api/v1/auth/register')
            .send({
                name: 'Student User',
                email: 'mahijadeja0409@gmail.com',
                password: 'Password123',
                gender: 'male',
                branch: 'Computer Science',
                guardian: { name: 'Student Parent', phone: '9876543210', email: 'parent@student.com' },
            });

        studentToken = studentRes.body.data.token;
        studentProfile = await Student.findOne({ email: 'mahijadeja0409@gmail.com' });

        // 2. ✅ FIXED: Create Admin with a DIFFERENT email
        await User.create({
            name: 'Admin User',
            email: 'admin@test.com', // <-- Changed from mahijadeja0409@gmail.com
            password: 'Admin123',
            role: 'admin',
        });

        // 3. ✅ FIXED: Login with the new admin email
        const adminRes = await request(app)
            .post('/api/v1/auth/login')
            .send({ email: 'admin@test.com', password: 'Admin123' });

        adminToken = adminRes.body.data.token;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Student.deleteMany({});
        await Outpass.deleteMany({});
        await mongoose.disconnect();
    });

    describe('POST /api/v1/outpass', () => {
        it('should create outpass with valid data', async () => {
            const res = await request(app)
                .post('/api/v1/outpass')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    from_date: getFutureDate(1),
                    to_date: getFutureDate(3),
                    reason: 'Going home for family function',
                    guardian_email: 'parent@student.com',
                })
                .expect(201);

            expect(res.body.success).toBe(true);
            expect(res.body.data.outpass.reason).toBe('Going home for family function');
            expect(res.body.data.outpass.status).toBe('pending');
        });

        it('should reject invalid date range', async () => {
            await request(app)
                .post('/api/v1/outpass')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    from_date: getFutureDate(3),
                    to_date: getFutureDate(1),
                    reason: 'Invalid date range test',
                    guardian_email: 'parent@student.com',
                })
                .expect(400);
        });

        it('should reject missing reason', async () => {
            await request(app)
                .post('/api/v1/outpass')
                .set('Authorization', `Bearer ${studentToken}`)
                .send({
                    from_date: getFutureDate(1),
                    to_date: getFutureDate(3),
                    guardian_email: 'parent@student.com',
                })
                .expect(400);
        });

        it('should return 401 without token', async () => {
            await request(app)
                .post('/api/v1/outpass')
                .send({
                    from_date: getFutureDate(1),
                    to_date: getFutureDate(3),
                    reason: 'Unauthorized test',
                    guardian_email: 'parent@student.com',
                })
                .expect(401);
        });
    });

    describe('GET /api/v1/outpass/mine', () => {
        it('should return only current student outpasses', async () => {
            await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(1),
                to_date: getFutureDate(3),
                reason: 'My first outpass',
                guardian_email: 'parent@student.com',
            });

            await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(5),
                to_date: getFutureDate(6),
                reason: 'My second outpass',
                guardian_email: 'parent@student.com',
            });

            const otherUser = await User.create({ name: 'Other', email: 'other@test.com', password: 'Password123' });
            const otherStudent = await Student.create({ user_id: otherUser._id, name: 'Other', email: 'other@test.com' });

            await Outpass.create({
                student_id: otherStudent._id,
                from_date: getFutureDate(10),
                to_date: getFutureDate(11),
                reason: 'Other student outpass',
                guardian_email: 'other@guardian.com',
            });

            const res = await request(app)
                .get('/api/v1/outpass/mine')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(res.body.data.data).toHaveLength(2);
            expect(res.body.data.pagination.totalItems).toBe(2);
        });

        it('should return paginated results', async () => {
            for (let i = 0; i < 12; i++) {
                await Outpass.create({
                    student_id: studentProfile._id,
                    from_date: getFutureDate(1),
                    to_date: getFutureDate(3),
                    reason: `Outpass number ${i + 1}`,
                    guardian_email: 'parent@student.com',
                });
            }

            const res = await request(app)
                .get('/api/v1/outpass/mine?page=1&limit=10')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(200);

            expect(res.body.data.data).toHaveLength(10);
            expect(res.body.data.pagination.totalPages).toBe(2);
        });
    });

    describe('GET /api/v1/outpass (Admin)', () => {
        it('should allow admin to get all outpasses', async () => {
            await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(1),
                to_date: getFutureDate(3),
                reason: 'Admin can see this',
                guardian_email: 'parent@student.com',
            });

            const res = await request(app)
                .get('/api/v1/outpass')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            expect(res.body.success).toBe(true);
            expect(res.body.data.data.length).toBeGreaterThanOrEqual(1);
        });

        it('should filter by status', async () => {
            await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(1),
                to_date: getFutureDate(3),
                reason: 'Pending request',
                status: 'pending',
                guardian_email: 'parent@student.com',
            });

            await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(4),
                to_date: getFutureDate(5),
                reason: 'Approved request',
                status: 'approved',
                guardian_email: 'parent@student.com',
            });

            const res = await request(app)
                .get('/api/v1/outpass?status=pending')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(200);

            res.body.data.data.forEach((item) => expect(item.status).toBe('pending'));
        });

        it('should return 403 for student trying to see all outpasses', async () => {
            await request(app)
                .get('/api/v1/outpass')
                .set('Authorization', `Bearer ${studentToken}`)
                .expect(403);
        });
    });

    describe('PATCH /api/v1/outpass/:id/decision', () => {
        it('should allow admin to approve outpass', async () => {
            const outpass = await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(1),
                to_date: getFutureDate(3),
                reason: 'Approve this request',
                guardian_email: 'parent@student.com',
            });

            const res = await request(app)
                .patch(`/api/v1/outpass/${outpass._id}/decision`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'approved', admin_remark: 'Approved for travel' })
                .expect(200);

            expect(res.body.data.outpass.status).toBe('approved');
            expect(res.body.data.outpass.admin_remark).toBe('Approved for travel');
            expect(res.body.data.outpass.approved_by).toBeDefined();
        });

                it('should allow admin to reject outpass', async () => {
            const outpass = await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(1),
                to_date: getFutureDate(3),
                reason: 'Reject this request',
                guardian_email: 'parent@student.com',
            });

            // ✅ FIXED: Use 'status' field (matches your passing approve test)
            const res = await request(app)
                .patch(`/api/v1/outpass/${outpass._id}/decision`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'rejected', admin_remark: 'Insufficient reason' })
                .expect(200);

            // Controller internally maps 'rejected' -> 'guardian_rejected' before saving
            expect(res.body.data.outpass.status).toBe('guardian_rejected');
            expect(res.body.data.outpass.admin_remark).toBe('Insufficient reason');
        });

        it('should not allow re-deciding an already approved outpass', async () => {
            const outpass = await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(1),
                to_date: getFutureDate(3),
                reason: 'Already approved request',
                status: 'approved',
                guardian_email: 'parent@student.com',
            });

            await request(app)
                .patch(`/api/v1/outpass/${outpass._id}/decision`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ status: 'rejected' })
                .expect(400);
        });

        it('should return 403 when student tries to decide outpass', async () => {
            const outpass = await Outpass.create({
                student_id: studentProfile._id,
                from_date: getFutureDate(1),
                to_date: getFutureDate(3),
                reason: 'Student should not decide this',
                guardian_email: 'parent@student.com',
            });

            await request(app)
                .patch(`/api/v1/outpass/${outpass._id}/decision`)
                .set('Authorization', `Bearer ${studentToken}`)
                .send({ status: 'approved' })
                .expect(403);
        });
    });
});