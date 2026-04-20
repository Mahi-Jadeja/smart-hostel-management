import mongoose from 'mongoose';
import crypto from 'crypto';

const outpassSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },

    from_date: {
      type: Date,
      required: [true, 'From date is required'],
    },

    to_date: {
      type: Date,
      required: [true, 'To date is required'],
    },

    reason: {
      type: String,
      required: [true, 'Reason is required'],
      trim: true,
      minlength: [5, 'Reason must be at least 5 characters'],
      maxlength: [300, 'Reason cannot exceed 300 characters'],
    },

    // ---- Guardian Approval Flow ----
    guardian_email: {
      type: String,
      required: [true, 'Guardian email is required'],
      trim: true,
      lowercase: true,
      // We snapshot the email at request time
      // so future profile changes don't break pending requests
    },

    approval_token: {
      type: String,
      default: () => crypto.randomBytes(32).toString('hex'),
      unique: true,
      // Secure random token used in the no-login approval link
    },

    token_expires_at: {
      type: Date,
      // Will be set to from_date 00:00:00 in the controller
      default: null,
    },
    email_sent: {
      type: Boolean,
      default: false,
      // Tracks whether the initial guardian email was successfully sent
    },
    // ---- Approval Status ----
    status: {
      type: String,
      enum: {
        values: ['pending', 'approved', 'guardian_rejected', 'expired'],
        message: 'Invalid outpass status',
      },
      default: 'pending',
    },

    // ---- Who approved/rejected (admin or guardian flow) ----
    approved_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },

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
outpassSchema.index({ student_id: 1, createdAt: -1 });
outpassSchema.index({ status: 1, createdAt: -1 });
outpassSchema.index({ approval_token: 1 }, { unique: true });
outpassSchema.index({ token_expires_at: 1 });

// ============================================================
// VALIDATION — Date rules
// ============================================================
outpassSchema.pre('validate', function () {
  if (this.from_date && this.to_date) {
    // from_date cannot be before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fromDate = new Date(this.from_date);
    fromDate.setHours(0, 0, 0, 0);

    if (fromDate < today) {
      this.invalidate('from_date', 'From date cannot be in the past');
    }

    // to_date must be strictly after from_date
    const toDate = new Date(this.to_date);
    toDate.setHours(0, 0, 0, 0);

    if (toDate <= fromDate) {
      this.invalidate('to_date', 'Return date must be at least one day after leave date');
    }
  }
});

const Outpass = mongoose.model('Outpass', outpassSchema);

export default Outpass;