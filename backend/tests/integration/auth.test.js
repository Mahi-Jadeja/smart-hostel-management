import mongoose from 'mongoose';
import request from 'supertest';
import app from '../../src/app.js';
import User from '../../src/models/User.js';
import Student from '../../src/models/Student.js';
import bcrypt from 'bcrypt';

describe('Auth Endpoints', () => {
  // Reusable valid payload for all registration calls
  const validUser = {
    name: 'John Doe',
    email: 'john@test.com',
    password: 'Password123',
    gender: 'male',
    branch: 'Computer Science',
    guardian: {
      name: 'Suresh Patil',
      phone: '9876543210',
      email: 'mahijadeja0409@gmail.com',
    },
  };

  // ---- Setup & Teardown ----

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  beforeEach(async () => {
    // Safe, reliable cleanup. Only touches the connected test DB.
    await User.deleteMany({});
    await Student.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  // ============================================================
  // REGISTRATION TESTS
  // ============================================================

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Registration successful');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data).toHaveProperty('user');

      expect(res.body.data.user.name).toBe('John Doe');
      expect(res.body.data.user.email).toBe('john@test.com');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should create a Student profile alongside the User', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      const student = await Student.findOne({ email: 'john@test.com' });
      expect(student).not.toBeNull();
      expect(student.name).toBe('John Doe');
      expect(student.email).toBe('john@test.com');

      const user = await User.findOne({ email: 'john@test.com' });
      expect(student.user_id.toString()).toBe(user._id.toString());
    });

    it('should hash the password before saving', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      const user = await User.findOne({ email: 'john@test.com' }).select('+password');
      expect(user.password).not.toBe('Password123');
      expect(user.password).toMatch(/^\$2[ab]\$/);
    });

    it('should convert email to lowercase', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, email: 'JOHN@TEST.COM' })
        .expect(201);

      expect(res.body.data.user.email).toBe('john@test.com');
    });

    it('should ALWAYS register as student, even if role:admin is sent', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validUser, role: 'admin' })
        .expect(201);

      expect(res.body.data.user.role).toBe('student');

      const user = await User.findOne({ email: 'john@test.com' });
      expect(user.role).toBe('student');
    });

    it('should return 400 if name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'john@test.com', password: 'Password123' })
        .expect(400);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should return 400 if email is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'John', password: 'Password123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'John', email: 'john@test.com' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if email format is invalid', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'John', email: 'not-an-email', password: 'Password123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if password is too short', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'John', email: 'john@test.com', password: '12345' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 400 if name is too short', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'J', email: 'john@test.com', password: 'Password123' })
        .expect(400);

      expect(res.body.success).toBe(false);
    });

    it('should return 409 if email already exists', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(409);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Email already registered');
    });
  });

  // ============================================================
  // LOGIN TESTS
  // ============================================================

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // ✅ FIXED: Send COMPLETE payload matching backend validation
      await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);
    });

    it('should login with correct credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john@test.com', password: 'Password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Login successful');
      expect(res.body.data).toHaveProperty('token');
    });

    it('should return a valid JWT token', async () => {
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john@test.com', password: 'Password123' })
        .expect(200);

      const token = loginRes.body.data.token;
      expect(token).toBeDefined();

      const meRes = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(meRes.body.data.user.email).toBe('john@test.com');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john@test.com', password: 'WrongPassword' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@test.com', password: 'Password123' })
        .expect(401);

      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should return 400 if email is missing', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'Password123' })
        .expect(400);
    });

    it('should return 400 if password is missing', async () => {
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'john@test.com' })
        .expect(400);
    });

    it('should login with email in different case', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'JOHN@TEST.COM', password: 'Password123' })
        .expect(200);

      expect(res.body.success).toBe(true);
    });
  });

  // ============================================================
  // GET /me TESTS
  // ============================================================

  describe('GET /api/v1/auth/me', () => {
    let token;

    beforeEach(async () => {
      // ✅ FIXED: Send COMPLETE payload
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser)
        .expect(201);

      token = res.body.data.token;
      expect(token).toBeDefined();
    });

    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('John Doe');
      expect(res.body.data.user.email).toBe('john@test.com');
      expect(res.body.data.user.role).toBe('student');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should return 401 without token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 with invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401);

      expect(res.body.success).toBe(false);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'NotBearer token')
        .expect(401);

      expect(res.body.success).toBe(false);
    });
  });

  // ============================================================
  // ROLE-BASED ACCESS TESTS
  // ============================================================

  describe('Role-Based Access Control', () => {
    let studentToken;
    let adminToken;

    beforeEach(async () => {
      // 1. Create student via registration
      const studentRes = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Student User',
          email: 'mahijadeja0409@gmail.com',
          password: 'Password123',
          gender: 'male',
          branch: 'Computer Science',
          guardian: { name: 'Test Guardian', phone: '9876543210', email: 'guard@test.com' },
        })
        .expect(201);

      studentToken = studentRes.body.data.token;

      // 2. Create admin directly in DB
      // ⚠️ FIXED: Pass PLAIN TEXT password. Your User model's pre('save') hook
      // automatically hashes it. Manual hashing causes double-hashing → 401.
      await User.create({
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'Admin123',
        role: 'admin',
      });

      // 3. Login as admin to get token
      const adminRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'Admin123' })
        .expect(200);

      adminToken = adminRes.body.data.token;
    });

    it('should allow student to access /me', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
    });

    it('should allow admin to access /me', async () => {
      await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('admin /me should return role as admin', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data.user.role).toBe('admin');
    });
  });
});