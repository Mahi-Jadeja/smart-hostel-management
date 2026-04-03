import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema(
  {
    // ============================================================
    // LINK TO USER (1:1 relationship)
    // ============================================================
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      // ObjectId is MongoDB's unique identifier type
      // Every document in MongoDB gets an _id field automatically
      // ObjectId looks like: "507f1f77bcf86cd799439011" (24 hex chars)

      ref: 'User',
      // ref: 'User' tells Mongoose this field REFERENCES the User collection
      // This enables .populate() which replaces the ID with the actual document
      //
      // Without populate: { user_id: "507f1f77..." }
      // With populate:    { user_id: { name: "John", email: "john@test.com" } }

      required: [true, 'User ID is required'],
      unique: true,
      // unique: true → One User can have only ONE Student profile
      // Prevents duplicate profiles for the same user
    },

    // ============================================================
    // PERSONAL DETAILS
    // ============================================================
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      default: '',
      trim: true,
    },
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'other', ''],
        message: 'Gender must be male, female, or other',
      },
      default: '',
    },
    dob: {
      type: Date,
      default: null,
      // Date of Birth — stored as a JavaScript Date object
      // MongoDB stores it in ISO format: 2000-05-15T00:00:00.000Z
    },
    profile_pic: {
      type: String,
      default: '',
      // For now, we'll store a URL string
      // Could be a base64 string or a URL to a file storage service
      // In production, you'd use AWS S3 or Cloudinary
    },

    // ============================================================
    // ACADEMIC DETAILS
    // ============================================================
    college_id: {
      type: String,
      default: '',
      trim: true,
      // PRN / Roll Number / Registration Number
    },
    branch: {
      type: String,
      default: '',
      trim: true,
      // e.g., "Computer Science", "Mechanical", "Electronics"
    },
    year: {
      type: Number,
      default: 1,
      min: [1, 'Year must be between 1 and 5'],
      max: [5, 'Year must be between 1 and 5'],
    },
    semester: {
      type: Number,
      default: 1,
      min: [1, 'Semester must be between 1 and 10'],
      max: [10, 'Semester must be between 1 and 10'],
    },

    // ============================================================
    // HOSTEL DETAILS
    // ============================================================
    // These fields are updated when the admin allocates a room
    room_no: {
      type: String,
      default: '',
    },
    hostel_block: {
      type: String,
      default: '',
    },
    floor: {
      type: Number,
      default: null,
    },
    bed_no: {
      type: Number,
      default: null,
    },

    // ============================================================
    // GUARDIAN DETAILS
    // ============================================================
    guardian: {
      name: {
        type: String,
        default: '',
        trim: true,
      },
      phone: {
        type: String,
        default: '',
        trim: true,
      },
      // This is a "nested object" in Mongoose
      // In MongoDB, it's stored as:
      // { guardian: { name: "Mrs. Smith", phone: "+91..." } }
    },

    // ============================================================
    // STATUS
    // ============================================================
    is_active: {
      type: Boolean,
      default: true,
      // false = student has left the hostel / graduated
    },
    is_hosteller: {
      type: Boolean,
      default: true,
      // false = day scholar (not living in hostel)
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================
// user_id already has unique: true (creates index automatically)

// Index for searching students by name or college_id
studentSchema.index({ name: 'text', college_id: 'text' });
// 'text' index enables full-text search:
// Student.find({ $text: { $search: "John" } })
// This searches across BOTH name and college_id fields

// Index for filtering by hostel block
studentSchema.index({ hostel_block: 1 });
// 1 = ascending order index
// Makes queries like Student.find({ hostel_block: 'A' }) fast

// Compound index for finding students in a specific room
studentSchema.index({ hostel_block: 1, room_no: 1 });

const Student = mongoose.model('Student', studentSchema);

export default Student;