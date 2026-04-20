import mongoose from 'mongoose';
import { BLOCK_GENDERS } from '../constants/enums.js';

const hostelConfigSchema = new mongoose.Schema(
  {
    hostel_name: {
      type: String,
      required: [true, 'Hostel name is required'],
      trim: true,
      // Example: "Boys Hostel", "Girls Hostel"
    },

    hostel_block: {
      type: String,
      required: [true, 'Hostel block is required'],
      unique: true,
      trim: true,
      uppercase: true,
      // Example: "A", "B", "C"
    },

    block_gender: {
      type: String,
      required: [true, 'Block gender is required'],
      enum: {
        values: BLOCK_GENDERS,
        message: 'Block gender must be either male or female',
      },
      trim: true,
      lowercase: true,
      // Example: "male" or "female"
      // This is the critical new field for gender-based allocation
    },

    total_floors: {
      type: Number,
      required: [true, 'Total floors is required'],
      min: [1, 'Must have at least 1 floor'],
      max: [10, 'Cannot exceed 10 floors'],
    },

    rooms_per_floor: {
      type: Number,
      required: [true, 'Rooms per floor is required'],
      min: [1, 'Must have at least 1 room per floor'],
      max: [20, 'Cannot exceed 20 rooms per floor'],
    },

    default_capacity: {
      type: Number,
      default: 3,
      min: [1, 'Capacity must be at least 1'],
      max: [6, 'Capacity cannot exceed 6'],
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Helpful index for future allocation queries.
 *
 * Example:
 * "Find all female blocks"
 * "Find all male blocks"
 */
hostelConfigSchema.index({ block_gender: 1, hostel_block: 1 });

const HostelConfig = mongoose.model('HostelConfig', hostelConfigSchema);

export default HostelConfig;