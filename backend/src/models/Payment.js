import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    // ---- Who this payment is for ----
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: [true, 'Student ID is required'],
    },

    // ---- Payment Details ----
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    type: {
      type: String,
      enum: {
        values: ['hostel_fee', 'mess_fee', 'fine', 'maintenance', 'other'],
        message: 'Invalid payment type',
      },
      default: 'hostel_fee',
    },

    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: [200, 'Description cannot exceed 200 characters'],
      // e.g., "Hostel fee for Jan-Mar 2024"
    },

    // ---- Payment Status ----
    status: {
      type: String,
      enum: {
        values: ['pending', 'paid'],
        message: 'Status must be pending or paid',
      },
      default: 'pending',
    },

    // ---- Dates ----
    due_date: {
      type: Date,
      default: null,
      // When the payment is due
      // Used for the REMINDERS feature:
      //   "Find all pending payments where due_date is within 7 days"
    },

    payment_date: {
      type: Date,
      default: null,
      // When the student actually paid
      // Set automatically when status changes to 'paid'
    },

    // ---- Transaction Reference ----
    transaction_id: {
      type: String,
      default: '',
      trim: true,
      // Reference number from payment gateway
      // In our case, manually entered by student when marking as paid
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Index for "my payments" query
paymentSchema.index({ student_id: 1, createdAt: -1 });

// Index for admin filtering by status
paymentSchema.index({ status: 1 });

// CRITICAL INDEX for payment reminders query
// "Find pending payments due within next 7 days"
paymentSchema.index({ status: 1, due_date: 1 });
// This compound index is optimized for the query:
// Payment.find({ status: 'pending', due_date: { $lte: sevenDaysFromNow } })
// MongoDB uses the index to quickly find pending + upcoming payments

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;