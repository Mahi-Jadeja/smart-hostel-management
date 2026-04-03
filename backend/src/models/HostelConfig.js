import mongoose from 'mongoose';

const hostelConfigSchema = new mongoose.Schema(
  {
    hostel_name: {
      type: String,
      required: [true, 'Hostel name is required'],
      trim: true,
      // e.g., "Boys Hostel 1", "Girls Hostel A"
    },

    hostel_block: {
      type: String,
      required: [true, 'Hostel block is required'],
      unique: true,
      // unique: true → Only ONE config per block letter
      // You can't have two configs for Block "A"
      trim: true,
      uppercase: true,
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
      // How many beds per room in this block
    },
  },
  {
    timestamps: true,
  }
);

const HostelConfig = mongoose.model('HostelConfig', hostelConfigSchema);

export default HostelConfig;