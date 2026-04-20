import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema(
  {
    // ---- Who filed the complaint ----
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
      // References the Student model (not User)
      // Because complaints are about HOSTEL issues,
      // and hostel info is in the Student model
    },

    // ---- Room where the issue is ----
    room_no: {
      type: String,
      default: '',
      // Auto-filled from the student's room when creating complaint
    },

    hostel_block: {
      type: String,
      default: '',
      // Auto-filled from the student's hostel block
    },

    // ---- Complaint Details ----
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: {
        values: [
          'plumbing',
          'electrical',
          'furniture',
          'cleaning',
          'food',
          'laundry',
          'internet',
          'security',
          'medical',
          'noise',
          'other',
        ],
        message: 'Invalid complaint category',
      },
      // Fixed categories make it easy to:
      // 1. Filter complaints by type
      // 2. Count complaints by type (for auto-escalation)
      // 3. Show category-based statistics
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },

    // ---- Status Tracking ----
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'resolved'],
        message: 'Status must be pending, in_progress, or resolved',
      },
      default: 'pending',
    },

    // ---- Priority ----
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: 'Priority must be low, medium, or high',
      },
      default: 'low',
      // Can be set manually by admin OR auto-escalated
      // Auto-escalation: if 4+ complaints of same category in 24h → HIGH
    },

    // ---- Admin Response ----
    admin_remark: {
      type: String,
      default: '',
      trim: true,
      maxlength: [500, 'Admin remark cannot exceed 500 characters'],
      // The admin's response/comment when updating the complaint
    },

    // ---- Resolution Date ----
    resolved_at: {
      type: Date,
      default: null,
      // Set automatically when status changes to 'resolved'
      // This lets us calculate resolution time:
      //   resolution_time = resolved_at - createdAt
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Index for "my complaints" query (student viewing their own)
complaintSchema.index({ student_id: 1, createdAt: -1 });
// -1 = descending (newest first)
// Compound index: fast for "complaints by this student, sorted by date"

// Index for auto-escalation query
// "How many complaints of category X in the last 24 hours?"
complaintSchema.index({ category: 1, createdAt: -1 });

// Index for admin filtering
complaintSchema.index({ status: 1, priority: 1 });

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;