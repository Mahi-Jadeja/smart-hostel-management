import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

// ============================================================
// SCHEMA DEFINITION
// ============================================================
// A Schema defines the SHAPE of documents in a collection
// Think of it as the "form template" — what fields exist and their rules

const userSchema = new mongoose.Schema(
  {
    // ---- Name ----
    name: {
      type: String,          // Must be a string
      required: [true, 'Name is required'],  // Can't be empty
      // The [true, 'message'] format gives a custom error message
      // Instead of generic "Path `name` is required"
      trim: true,            // Removes whitespace from start/end
      // " John " → "John"
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    // ---- Email ----
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,          // No two users can have the same email
      // MongoDB creates an INDEX on this field for fast lookups
      lowercase: true,       // "John@Gmail.COM" → "john@gmail.com"
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
      // match: [regex, message] — validates against a pattern
      // This regex checks for valid email format (something@domain.com)
    },

    // ---- Password ----
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
      // select: false is CRITICAL for security
      // It means: when you query users, password is NOT included by default
      //
      // User.find() → returns users WITHOUT password field
      // User.findById(id).select('+password') → explicitly includes password
      //
      // This prevents accidentally sending passwords to the frontend
    },

    // ---- Google OAuth ID ----
    googleId: {
      type: String,
      default: null,
      // Only set when user logs in via Google
      // null for email/password users
    },

    // ---- Auth Provider ----
    provider: {
      type: String,
      enum: {
        values: ['local', 'google'],
        message: 'Provider must be either local or google',
      },
      // enum restricts the value to ONLY these options
      // If someone tries to set provider: "facebook" → validation error
      default: 'local',
    },

    // ---- Role ----
    role: {
      type: String,
      enum: {
        values: ['student', 'admin'],
        message: 'Role must be either student or admin',
      },
      default: 'student',
      // IMPORTANT: We NEVER let users set their own role from the API
      // The registration endpoint will IGNORE any role in the request body
      // Only the seed script or direct DB access can create admins
    },
  },
  {
    // ---- Schema Options ----
    timestamps: true,
    // timestamps: true automatically adds TWO fields:
    //   createdAt: Date (set once when document is created)
    //   updatedAt: Date (updated every time document is modified)
    // You don't need to manage these manually — Mongoose handles it
  }
);

// ============================================================
// INDEXES
// ============================================================
// Indexes make queries faster (like a book's index helps you find pages)
// Without an index, MongoDB scans EVERY document (slow for large collections)

// email already has unique: true which creates an index automatically
// googleId needs an index for OAuth lookups
userSchema.index({ googleId: 1 }, { sparse: true });
// sparse: true → only index documents where googleId EXISTS
// This saves space because most users won't have a googleId


// ============================================================
// PRE-SAVE MIDDLEWARE (Hook)
// ============================================================
// This runs AUTOMATICALLY before every .save() call
// We use it to hash the password

userSchema.pre('save', async function (next) {
  // 'this' refers to the document being saved
  // 'function' keyword (not arrow =>) is required because we need 'this'
  // Arrow functions don't have their own 'this'

  // Only hash if password was modified (or is new)
  // Without this check, the password would be RE-HASHED every time
  // you update ANY field (name, email, etc.)
  // Already hashed password would get hashed AGAIN → can never login
  if (!this.isModified('password')) return next();

  // Don't hash if password is null (Google OAuth users have no password)
  if (!this.password) return next();

  // Hash the password
  // bcrypt.hash(plaintext, saltRounds)
  //
  // What is a salt?
  // A salt is random data added to the password BEFORE hashing
  // Without salt: hash("password123") always = "abc123..."
  //   → Attacker can pre-compute hashes for common passwords
  // With salt: hash("password123" + "random_salt") = unique hash
  //   → Each user gets a different hash even if passwords are same
  //
  // saltRounds = 12 means the hashing algorithm runs 2^12 = 4096 iterations
  // More rounds = slower but more secure (harder to brute force)
  // 10-12 is standard. Your teammate used 10, we use 12 for better security.
  this.password = await bcrypt.hash(this.password, 12);

  next(); // Continue with the save
});

// ============================================================
// INSTANCE METHODS
// ============================================================
// Methods that can be called on individual user documents

/**
 * Compare a plain text password with the hashed password
 *
 * Usage:
 *   const user = await User.findOne({ email }).select('+password');
 *   const isMatch = await user.comparePassword('typed_password');
 *   if (!isMatch) throw new Error('Wrong password');
 *
 * @param {string} candidatePassword - The plain text password to check
 * @returns {boolean} true if passwords match, false otherwise
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  // bcrypt.compare() hashes the candidate with the same salt
  // and compares the result with the stored hash
  // We NEVER decrypt the stored password (one-way hashing)
  return await bcrypt.compare(candidatePassword, this.password);
};

// ============================================================
// CREATE AND EXPORT THE MODEL
// ============================================================
// mongoose.model('ModelName', schema)
// 'User' → Mongoose will create/use a collection called 'users' (lowercase + plural)

const User = mongoose.model('User', userSchema);

export default User;