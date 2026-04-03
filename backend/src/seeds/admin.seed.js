// ============================================================
// ADMIN SEED SCRIPT
// ============================================================
// Run this script to create the default admin account
// Usage: npm run seed (from the backend folder)
//
// This script is IDEMPOTENT — you can run it multiple times safely
// If the admin already exists, it skips creation (doesn't duplicate)

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Default admin credentials
// In production, these should come from environment variables
const ADMIN_DATA = {
  name: 'Admin Warden',
  email: 'admin@intellihostel.com',
  password: 'Admin@123',
  role: 'admin',
  provider: 'local',
};

const seedAdmin = async () => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: ADMIN_DATA.email });

    if (existingAdmin) {
      console.log('ℹ️  Admin user already exists:');
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role:  ${existingAdmin.role}`);
      console.log('   Skipping creation.\n');
    } else {
      // Create the admin user
      // The pre-save hook will automatically hash the password
      const admin = await User.create(ADMIN_DATA);

      console.log('✅ Admin user created successfully!');
      console.log(`   Name:     ${admin.name}`);
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: ${ADMIN_DATA.password}`);
      console.log(`   Role:     ${admin.role}`);
      console.log('\n⚠️  Change the password after first login!\n');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seed function
seedAdmin();