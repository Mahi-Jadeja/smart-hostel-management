import mongoose from 'mongoose';
import User from '../../../src/models/User.js';

// ============================================================
// TEST SUITE: User Model
// ============================================================

describe('User Model', () => {
  // ---- Setup & Teardown ----

  // Connect to test database BEFORE all tests
  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel_test';
    await mongoose.connect(mongoUri);
  });

  // Clean up the users collection BEFORE each test
  // This ensures each test starts with a clean slate
  beforeEach(async () => {
    await User.deleteMany({});
    // deleteMany({}) with empty filter = delete ALL documents
    // This is safe because we're using the TEST database
  });

  // Disconnect AFTER all tests
  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.disconnect();
  });

  // ---- Test: Successful creation ----

  it('should create a user with valid data', async () => {
    const userData = {
      name: 'John Doe',
      email: 'john@test.com',
      password: 'Password123',
      role: 'student',
    };

    const user = await User.create(userData);

    // Verify the user was created with correct data
    expect(user.name).toBe('John Doe');
    expect(user.email).toBe('john@test.com');
    expect(user.role).toBe('student');
    expect(user.provider).toBe('local'); // default value
    expect(user._id).toBeDefined(); // MongoDB assigns an _id
    expect(user.createdAt).toBeDefined(); // timestamps: true
    expect(user.updatedAt).toBeDefined();
  });

  // ---- Test: Password hashing ----

  it('should hash the password before saving', async () => {
    const user = await User.create({
      name: 'John',
      email: 'john@test.com',
      password: 'plaintext123',
    });

    // The stored password should NOT be the original plaintext
    // We need to fetch with +password since select: false
    const savedUser = await User.findById(user._id).select('+password');

    // Password should be hashed (bcrypt hashes start with "$2b$")
    expect(savedUser.password).not.toBe('plaintext123');
    expect(savedUser.password).toMatch(/^\$2[ab]\$/);
    // This regex checks that the password starts with $2a$ or $2b$
    // which is the bcrypt hash prefix
  });

  // ---- Test: Password comparison ----

  it('should correctly compare passwords', async () => {
    const user = await User.create({
      name: 'John',
      email: 'john@test.com',
      password: 'MyPassword123',
    });

    // Fetch with password
    const savedUser = await User.findById(user._id).select('+password');

    // Correct password should return true
    const isMatch = await savedUser.comparePassword('MyPassword123');
    expect(isMatch).toBe(true);

    // Wrong password should return false
    const isWrong = await savedUser.comparePassword('WrongPassword');
    expect(isWrong).toBe(false);
  });

  // ---- Test: Password not re-hashed on update ----

  it('should not re-hash password when updating other fields', async () => {
    const user = await User.create({
      name: 'John',
      email: 'john@test.com',
      password: 'MyPassword123',
    });

    // Get the hashed password
    let savedUser = await User.findById(user._id).select('+password');
    const originalHash = savedUser.password;

    // Update the name (NOT the password)
    savedUser.name = 'John Updated';
    await savedUser.save();

    // Re-fetch and check password hasn't changed
    savedUser = await User.findById(user._id).select('+password');
    expect(savedUser.password).toBe(originalHash);
    // If the pre-save hook re-hashed, this would be DIFFERENT
  });

  // ---- Test: select: false on password ----

  it('should not include password in queries by default', async () => {
    await User.create({
      name: 'John',
      email: 'john@test.com',
      password: 'MyPassword123',
    });

    // Query without explicitly selecting password
    const user = await User.findOne({ email: 'john@test.com' });

    // Password should be undefined (not included)
    expect(user.password).toBeUndefined();
  });

  // ---- Test: Required fields ----

  it('should require name', async () => {
    try {
      await User.create({
        email: 'john@test.com',
        password: 'Password123',
      });
      // If we reach this line, the test should FAIL
      // because create() should have thrown a validation error
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.name).toBeDefined();
    }
  });

  it('should require email', async () => {
    try {
      await User.create({
        name: 'John',
        password: 'Password123',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.email).toBeDefined();
    }
  });

  // ---- Test: Email validation ----

  it('should reject invalid email format', async () => {
    try {
      await User.create({
        name: 'John',
        email: 'not-an-email',
        password: 'Password123',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.email).toBeDefined();
    }
  });

  it('should convert email to lowercase', async () => {
    const user = await User.create({
      name: 'John',
      email: 'JOHN@TEST.COM',
      password: 'Password123',
    });

    expect(user.email).toBe('john@test.com');
  });

  // ---- Test: Unique email ----

  it('should not allow duplicate emails', async () => {
    // Create first user
    await User.create({
      name: 'John',
      email: 'john@test.com',
      password: 'Password123',
    });

    // Try to create second user with same email
    try {
      await User.create({
        name: 'Jane',
        email: 'john@test.com',
        password: 'Password456',
      });
      fail('Should have thrown duplicate key error');
    } catch (error) {
      // Duplicate key error has code 11000
      expect(error.code).toBe(11000);
    }
  });

  // ---- Test: Role enum ----

  it('should only allow valid roles', async () => {
    try {
      await User.create({
        name: 'John',
        email: 'john@test.com',
        password: 'Password123',
        role: 'superadmin', // Invalid role!
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.role).toBeDefined();
    }
  });

  it('should default role to student', async () => {
    const user = await User.create({
      name: 'John',
      email: 'john@test.com',
      password: 'Password123',
      // No role specified
    });

    expect(user.role).toBe('student');
  });

  // ---- Test: Provider enum ----

  it('should only allow valid providers', async () => {
    try {
      await User.create({
        name: 'John',
        email: 'john@test.com',
        password: 'Password123',
        provider: 'facebook', // Invalid!
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.provider).toBeDefined();
    }
  });

  // ---- Test: Google OAuth user (no password) ----

  it('should allow creation without password for Google users', async () => {
    const user = await User.create({
      name: 'Google User',
      email: 'google@test.com',
      googleId: '123456789',
      provider: 'google',
      // No password!
    });

    expect(user.name).toBe('Google User');
    expect(user.provider).toBe('google');
    expect(user.googleId).toBe('123456789');
  });

  // ---- Test: Name length validation ----

  it('should reject names shorter than 2 characters', async () => {
    try {
      await User.create({
        name: 'J',
        email: 'john@test.com',
        password: 'Password123',
      });
      fail('Should have thrown validation error');
    } catch (error) {
      expect(error.name).toBe('ValidationError');
      expect(error.errors.name).toBeDefined();
    }
  });
});