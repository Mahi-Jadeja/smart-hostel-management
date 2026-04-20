import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    // ---- Room Identification ----
    room_no: {
      type: String,
      required: [true, 'Room number is required'],
      trim: true,
      // e.g., "101" = Floor 1, Room 01
      // e.g., "305" = Floor 3, Room 05
    },

    hostel_block: {
      type: String,
      required: [true, 'Hostel block is required'],
      trim: true,
      uppercase: true,
      // uppercase: true → "a" becomes "A" automatically
      // Ensures consistency — you don't end up with block "A" and block "a"
    },

    floor: {
      type: Number,
      required: [true, 'Floor is required'],
      min: [1, 'Floor must be at least 1'],
    },

    // ---- Capacity & Occupancy ----
    capacity: {
      type: Number,
      default: 3,
      min: [1, 'Capacity must be at least 1'],
      max: [6, 'Capacity cannot exceed 6'],
      // Most hostel rooms have 2-4 beds
    },

    occupied: {
      type: Number,
      default: 0,
      min: [0, 'Occupied cannot be negative'],
      // This MUST always match students.length
      // But we keep it as a separate field for easy querying
      // (faster than counting array length for every query)
    },

    // ---- Students in this room ----
    students: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
      },
    ],
    // Square brackets [] mean this is an ARRAY of ObjectIds
    // Each element references a Student document
    //
    // Example value: ["507f1f77...", "60d5ec49...", "61a2bc3f..."]
    //
    // With populate:
    // [
    //   { name: "John", branch: "CS", year: 2 },
    //   { name: "Jane", branch: "IT", year: 3 },
    //   { name: "Bob",  branch: "CS", year: 2 }
    // ]

    // ---- Room Status ----
    status: {
      type: String,
      enum: {
        values: ['empty', 'partial', 'full', 'maintenance'],
        message: 'Status must be empty, partial, full, or maintenance',
      },
      default: 'empty',
      // This is AUTO-COMPUTED by the pre-save hook below
      // You should never set this manually
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// INDEXES
// ============================================================

// Compound unique index: room_no + hostel_block
// This means Room 101 in Block A and Room 101 in Block B are DIFFERENT rooms
// But you can't have TWO Room 101s in Block A
roomSchema.index({ room_no: 1, hostel_block: 1 }, { unique: true });

// Index for filtering rooms by block and floor
roomSchema.index({ hostel_block: 1, floor: 1 });

// Index for finding rooms by status (e.g., show all empty rooms)
roomSchema.index({ status: 1 });

// ============================================================
// PRE-SAVE MIDDLEWARE — Auto-compute status
// ============================================================
// Every time a room is saved (after allocation/deallocation),
// this automatically updates the status field

roomSchema.pre('save', function () {
  // Keep occupied in sync with students array length
  this.occupied = this.students.length;

  // Determine status based on occupancy
  if (this.status === 'maintenance') {
    // If room is manually set to maintenance, don't change it
    // (admin might be marking a room as under repair)
    return ;
  }

  if (this.occupied === 0) {
    this.status = 'empty';
  } else if (this.occupied >= this.capacity) {
    this.status = 'full';
  } else {
    this.status = 'partial';
  }

  
});

const Room = mongoose.model('Room', roomSchema);

export default Room;