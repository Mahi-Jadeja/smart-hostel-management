import mongoose from 'mongoose';

const outpassSchema = new mongoose.Schema(
  {
    // ---- Who is requesting ----
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },

    // ---- Leave Details ----
    from_date: {
      type: Date,
      required: [true, 'From date is required'],
      // When the student wants to LEAVE
    },

    to_date: {
      type: Date,
      required: [true, 'To date is required'],
      // When the student plans to RETURN
    },

    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters'],
      maxlength: [300, 'Reason cannot exceed 300 characters'],
    },

    // ---- Approval Status ----
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'rejected'],
        message: 'Status must be pending, approved, or rejected',
      },
      default: 'pending',
    },

    // ---- Who approved/rejected ----
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // FIXED from teammate's code!
      // She referenced 'Student' here, but admins approve outpasses
      // and admins don't have Student profiles
      // So we reference 'User' instead
      default: null,
    },

    // ---- Admin's comment (optional) ----
    admin_remark: {
      type: String,
      default: '',
      trim: true,
      maxlength: [300, 'Admin remark cannot exceed 300 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Index for "my outpasses" query
outpassSchema.index({ student_id: 1, createdAt: -1 });

// Index for admin filtering by status
outpassSchema.index({ status: 1, createdAt: -1 });

// ============================================================
// VALIDATION — from_date must be before to_date
// ============================================================
// This is a custom validator that runs before saving
// It checks that the leave date is before the return date

outpassSchema.pre('validate', function (next) {
  if (this.from_date && this.to_date) {
    if (this.from_date >= this.to_date) {
      // Create a validation error
      this.invalidate(
        'to_date',
        'Return date must be after leave date'
      );
    }
  }
  next();
});

const Outpass = mongoose.model('Outpass', outpassSchema);

export default Outpass;