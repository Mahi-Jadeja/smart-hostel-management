import mongoose from 'mongoose';
import { BRANCHES, STUDENT_GENDERS } from '../constants/enums.js';

/**
 * Transitional note:
 *
 * We still allow '' in the MODEL enum temporarily so old legacy student
 * records do not immediately break before the migration script runs.
 *
 * BUT:
 * - new registrations will NOT allow ''
 * - profile update validation will NOT allow ''
 *
 * So new data becomes clean immediately,
 * and old data will be cleaned in the migration step.
 */
const LEGACY_SAFE_GENDERS = [...STUDENT_GENDERS, ''];
const LEGACY_SAFE_BRANCHES = [...BRANCHES, ''];

const studentSchema = new mongoose.Schema(
  {
    // ============================================================
    // LINK TO USER (1:1 relationship)
    // ============================================================
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
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
        values: LEGACY_SAFE_GENDERS,
        message: 'Gender must be male or female',
      },
      default: '',
      lowercase: true,
      trim: true,
      // New valid values are only male/female.
      // '' is temporarily allowed here for old legacy records only.
    },

    dob: {
      type: Date,
      default: null,
    },

    profile_pic: {
      type: String,
      default: '',
    },

    // ============================================================
    // ACADEMIC DETAILS
    // ============================================================
    college_id: {
      type: String,
      default: '',
      trim: true,
    },

    branch: {
      type: String,
      enum: {
        values: LEGACY_SAFE_BRANCHES,
        message: `Branch must be one of: ${BRANCHES.join(', ')}`,
      },
      default: '',
      trim: true,
      // Official branch values are enforced in validation for new writes.
      // '' is temporarily allowed in the model for old legacy records.
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

      email: {
        type: String,
        default: '',
        trim: true,
        lowercase: true,
      },
    },
    // ============================================================
    // ROOM PREFERENCE
    // ============================================================
    room_preference: {
      preferred_roommate: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        default: null,
        // Stores the Student _id of the preferred roommate
        // Example:
        // room_preference: { preferred_roommate: ObjectId("...") }
      },
    },
    // ============================================================
    // STATUS
    // ============================================================
    is_active: {
      type: Boolean,
      default: true,
    },

    is_hosteller: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Text search
studentSchema.index({ name: 'text', college_id: 'text' });

// Block filter
studentSchema.index({ hostel_block: 1 });

// Specific room lookup
studentSchema.index({ hostel_block: 1, room_no: 1 });


/**
 * Helpful for future allocation queries:
 * - filter active hostellers
 * - group by gender
 * - branch-based allocation
 * - year-based allocation
 */
studentSchema.index({
  gender: 1,
  branch: 1,
  year: 1,
  is_active: 1,
  is_hosteller: 1,
});
studentSchema.index({ 'room_preference.preferred_roommate': 1 });
const Student = mongoose.model('Student', studentSchema);

export default Student;