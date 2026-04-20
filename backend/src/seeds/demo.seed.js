// ============================================================
// DEMO SEED SCRIPT
// ============================================================
// Populates the database with realistic demo data for presentation.
//
// Creates:
//   - 1 Admin account
//   - 2 Hostel blocks (Block A = Male, Block B = Female)
//   - Rooms for both blocks
//   - 6 Male students + 6 Female students (with complete profiles)
//   - Room allocations (mix of full/partial/empty rooms)
//   - Room preferences (mutual pairs + one-way)
//   - Complaints (pending, in_progress, resolved — different categories)
//   - Outpasses (pending, approved, guardian_rejected)
//   - Payments (paid, pending, overdue)
//
// Usage (from project root):
//   cd backend
//   node src/seeds/demo.seed.js
//
// This script is IDEMPOTENT — safe to run multiple times.
// It clears existing demo data before re-seeding.
// The admin account from admin.seed.js is preserved.
// ============================================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import User from '../models/User.js';
import Student from '../models/Student.js';
import Room from '../models/Room.js';
import HostelConfig from '../models/HostelConfig.js';
import Complaint from '../models/Complaint.js';
import Outpass from '../models/Outpass.js';
import Payment from '../models/Payment.js';

dotenv.config();

// ============================================================
// HELPER UTILITIES
// ============================================================

/**
 * Returns a date N days from today
 * @param {number} days - positive = future, negative = past
 */
const daysFromNow = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Returns a date N days ago
 * @param {number} days - always positive (we negate internally)
 */
const daysAgo = (days) => daysFromNow(-days);

/**
 * Log a section header to console
 */
const section = (title) => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('='.repeat(50));
};

// ============================================================
// DEMO DATA DEFINITIONS
// ============================================================

// Admin credentials (same as admin.seed.js — skipped if exists)
const ADMIN = {
  name: 'Admin Warden',
  email: 'admin@intellihostel.com',
  password: 'Admin@123',
  role: 'admin',
  provider: 'local',
};

// Hostel block configurations
const HOSTEL_CONFIGS = [
  {
    hostel_name: 'Boys Hostel',
    hostel_block: 'A',
    block_gender: 'male',
    total_floors: 3,
    rooms_per_floor: 4,
    default_capacity: 3,
  },
  {
    hostel_name: 'Girls Hostel',
    hostel_block: 'B',
    block_gender: 'female',
    total_floors: 3,
    rooms_per_floor: 4,
    default_capacity: 3,
  },
];

// Male students — will be allocated to Block A
const MALE_STUDENTS = [
  {
    name: 'Arjun Sharma',
    email: 'arjun.sharma@student.com',
    password: 'Student@123',
    gender: 'male',
    branch: 'Computer Science',
    year: 2,
    semester: 3,
    college_id: 'CS2022001',
    phone: '9876543201',
    guardian: {
      name: 'Rajesh Sharma',
      phone: '9876543200',
      email: 'rajesh.sharma@gmail.com',
    },
  },
  {
    name: 'Viraj Sheoran',
    email: 'viraj.sheoran@student.com',
    password: 'Student@123',
    gender: 'male',
    branch: 'Artificial Intelligence and Machine Learning',
    year: 3,
    semester: 5,
    college_id: 'AI2021002',
    phone: '9876543202',
    guardian: {
      name: 'Harpal Sheoran',
      phone: '9876543203',
      email: 'harpal.sheoran@gmail.com',
    },
  },
  {
    name: 'Rohan Mehta',
    email: 'rohan.mehta@student.com',
    password: 'Student@123',
    gender: 'male',
    branch: 'Mechanical Engineering',
    year: 1,
    semester: 2,
    college_id: 'ME2023003',
    phone: '9876543204',
    guardian: {
      name: 'Suresh Mehta',
      phone: '9876543205',
      email: 'suresh.mehta@gmail.com',
    },
  },
  {
    name: 'Karan Patel',
    email: 'karan.patel@student.com',
    password: 'Student@123',
    gender: 'male',
    branch: 'Electronics and Telecommunication',
    year: 2,
    semester: 4,
    college_id: 'ET2022004',
    phone: '9876543206',
    guardian: {
      name: 'Dinesh Patel',
      phone: '9876543207',
      email: 'dinesh.patel@gmail.com',
    },
  },
  {
    name: 'Aditya Kumar',
    email: 'aditya.kumar@student.com',
    password: 'Student@123',
    gender: 'male',
    branch: 'Robotics and Automation',
    year: 4,
    semester: 7,
    college_id: 'RA2020005',
    phone: '9876543208',
    guardian: {
      name: 'Vijay Kumar',
      phone: '9876543209',
      email: 'vijay.kumar@gmail.com',
    },
  },
  {
    name: 'Dev Joshi',
    email: 'dev.joshi@student.com',
    password: 'Student@123',
    gender: 'male',
    branch: 'Civil Engineering',
    year: 3,
    semester: 6,
    college_id: 'CE2021006',
    phone: '9876543210',
    guardian: {
      name: 'Mahesh Joshi',
      phone: '9876543211',
      email: 'mahesh.joshi@gmail.com',
    },
  },
];

// Female students — will be allocated to Block B
const FEMALE_STUDENTS = [
  {
    name: 'Priya Desai',
    email: 'priya.desai@student.com',
    password: 'Student@123',
    gender: 'female',
    branch: 'Computer Science',
    year: 2,
    semester: 4,
    college_id: 'CS2022007',
    phone: '9876543212',
    guardian: {
      name: 'Ramesh Desai',
      phone: '9876543213',
      email: 'ramesh.desai@gmail.com',
    },
  },
  {
    name: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@student.com',
    password: 'Student@123',
    gender: 'female',
    branch: 'Artificial Intelligence and Machine Learning',
    year: 1,
    semester: 2,
    college_id: 'AI2023008',
    phone: '9876543214',
    guardian: {
      name: 'Prakash Kulkarni',
      phone: '9876543215',
      email: 'prakash.kulkarni@gmail.com',
    },
  },
  {
    name: 'Anjali Singh',
    email: 'anjali.singh@student.com',
    password: 'Student@123',
    gender: 'female',
    branch: 'Electronics and Telecommunication',
    year: 3,
    semester: 5,
    college_id: 'ET2021009',
    phone: '9876543216',
    guardian: {
      name: 'Rakesh Singh',
      phone: '9876543217',
      email: 'rakesh.singh@gmail.com',
    },
  },
  {
    name: 'Meera Nair',
    email: 'meera.nair@student.com',
    password: 'Student@123',
    gender: 'female',
    branch: 'Mechanical Engineering',
    year: 2,
    semester: 3,
    college_id: 'ME2022010',
    phone: '9876543218',
    guardian: {
      name: 'Suresh Nair',
      phone: '9876543219',
      email: 'suresh.nair@gmail.com',
    },
  },
  {
    name: 'Riya Verma',
    email: 'riya.verma@student.com',
    password: 'Student@123',
    gender: 'female',
    branch: 'Civil Engineering',
    year: 4,
    semester: 8,
    college_id: 'CE2020011',
    phone: '9876543220',
    guardian: {
      name: 'Arun Verma',
      phone: '9876543221',
      email: 'arun.verma@gmail.com',
    },
  },
  {
    name: 'Kavya Reddy',
    email: 'kavya.reddy@student.com',
    password: 'Student@123',
    gender: 'female',
    branch: 'Robotics and Automation',
    year: 1,
    semester: 1,
    college_id: 'RA2023012',
    phone: '9876543222',
    guardian: {
      name: 'Krishna Reddy',
      phone: '9876543223',
      email: 'krishna.reddy@gmail.com',
    },
  },
];

// ============================================================
// MAIN SEED FUNCTION
// ============================================================
const seedDemo = async () => {
  try {
    // Connect to MongoDB
    const mongoUri =
      process.env.MONGODB_URI || 'mongodb://localhost:27017/intellihostel';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // ============================================================
    // STEP 0: CLEAN EXISTING DEMO DATA
    // ============================================================
    // We delete everything EXCEPT the admin user
    // so the seed is safe to re-run multiple times

    section('STEP 0: Cleaning existing demo data');

    // Find admin user to preserve it
    const adminUser = await User.findOne({ role: 'admin' });

    // Delete all non-admin users and their student profiles
    const nonAdminUsers = await User.find({ role: 'student' });
    const nonAdminUserIds = nonAdminUsers.map((u) => u._id);

    await Student.deleteMany({ user_id: { $in: nonAdminUserIds } });
    await User.deleteMany({ role: 'student' });
    await Room.deleteMany({});
    await HostelConfig.deleteMany({});
    await Complaint.deleteMany({});
    await Outpass.deleteMany({});
    await Payment.deleteMany({});

    console.log('✅ Existing demo data cleared');
    console.log('✅ Admin account preserved');

    // ============================================================
    // STEP 1: CREATE ADMIN (if not exists)
    // ============================================================
    section('STEP 1: Admin Account');

    let admin = await User.findOne({ email: ADMIN.email });
    if (!admin) {
      admin = await User.create(ADMIN);
      console.log(`✅ Admin created: ${ADMIN.email} / ${ADMIN.password}`);
    } else {
      console.log(`ℹ️  Admin already exists: ${ADMIN.email}`);
    }

    // ============================================================
    // STEP 2: CREATE HOSTEL CONFIGS
    // ============================================================
    section('STEP 2: Hostel Block Configurations');

    const createdConfigs = [];
    for (const config of HOSTEL_CONFIGS) {
      const created = await HostelConfig.findOneAndUpdate(
        { hostel_block: config.hostel_block },
        config,
        { upsert: true, returnDocument: 'after', runValidators: true }
      );
      createdConfigs.push(created);
      console.log(
        `✅ Block ${config.hostel_block} (${config.block_gender}) — ` +
        `${config.total_floors} floors × ${config.rooms_per_floor} rooms × ` +
        `${config.default_capacity} beds`
      );
    }

    // ============================================================
    // STEP 3: GENERATE ROOMS FOR BOTH BLOCKS
    // ============================================================
    section('STEP 3: Generating Rooms');

    const allRooms = {};  // { 'A': [...rooms], 'B': [...rooms] }

    for (const config of createdConfigs) {
      const roomsToCreate = [];

      for (let floor = 1; floor <= config.total_floors; floor++) {
        for (let roomIndex = 1; roomIndex <= config.rooms_per_floor; roomIndex++) {
          const paddedRoomNumber = String(roomIndex).padStart(2, '0');
          const room_no = `${floor}${paddedRoomNumber}`;
          // e.g., floor=1, roomIndex=1 → "101"
          //        floor=2, roomIndex=3 → "203"

          roomsToCreate.push({
            room_no,
            hostel_block: config.hostel_block,
            floor,
            capacity: config.default_capacity,
            students: [],
            occupied: 0,
            status: 'empty',
          });
        }
      }

      const rooms = await Room.insertMany(roomsToCreate);
      allRooms[config.hostel_block] = rooms;

      console.log(
        `✅ Block ${config.hostel_block}: ${rooms.length} rooms created ` +
        `(${config.total_floors} floors × ${config.rooms_per_floor} rooms)`
      );
    }

    // ============================================================
    // STEP 4: CREATE MALE STUDENTS + ALLOCATE TO BLOCK A
    // ============================================================
    section('STEP 4: Male Students → Block A');

    const createdMaleStudents = [];

    for (let i = 0; i < MALE_STUDENTS.length; i++) {
      const data = MALE_STUDENTS[i];

      // Create User
      const user = await User.create({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'student',
        provider: 'local',
      });

      // Determine room allocation
      // We want to show mix of statuses:
      // Room 101 → 3 students (full)
      // Room 102 → 2 students (partial)
      // Room 103 → 1 student  (partial)
      // Room 104 → 0 students (empty) ← intentionally left empty
      // Students 0,1,2 → room 101 | Students 3,4 → room 102 | Student 5 → room 103

      let assignedRoom = null;
      let bedNo = null;

      const blockARooms = allRooms['A'];

      if (i < 3) {
        // First 3 students → Room 101 (will be FULL)
        assignedRoom = blockARooms.find((r) => r.room_no === '101');
        bedNo = i + 1;
      } else if (i < 5) {
        // Next 2 students → Room 102 (will be PARTIAL)
        assignedRoom = blockARooms.find((r) => r.room_no === '102');
        bedNo = i - 2;
      } else {
        // Last 1 student → Room 103 (will be PARTIAL)
        assignedRoom = blockARooms.find((r) => r.room_no === '103');
        bedNo = 1;
      }

      // Create Student with hostel details
      const student = await Student.create({
        user_id: user._id,
        name: data.name,
        email: data.email,
        gender: data.gender,
        branch: data.branch,
        year: data.year,
        semester: data.semester,
        college_id: data.college_id,
        phone: data.phone,
        guardian: data.guardian,
        room_no: assignedRoom.room_no,
        hostel_block: 'A',
        floor: assignedRoom.floor,
        bed_no: bedNo,
        is_active: true,
        is_hosteller: true,
      });

      // Add student to room
      assignedRoom.students.push(student._id);
      await assignedRoom.save();

      createdMaleStudents.push(student);

      console.log(
        `✅ ${data.name} → Block A, Room ${assignedRoom.room_no}, ` +
        `Floor ${assignedRoom.floor}, Bed ${bedNo}`
      );
    }

    // ============================================================
    // STEP 5: CREATE FEMALE STUDENTS + ALLOCATE TO BLOCK B
    // ============================================================
    section('STEP 5: Female Students → Block B');

    const createdFemaleStudents = [];

    for (let i = 0; i < FEMALE_STUDENTS.length; i++) {
      const data = FEMALE_STUDENTS[i];

      const user = await User.create({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'student',
        provider: 'local',
      });

      // Same allocation pattern as male block:
      // Room 101 → 3 students (full)
      // Room 102 → 2 students (partial)
      // Room 103 → 1 student  (partial)
      // Room 104 → empty

      let assignedRoom = null;
      let bedNo = null;

      const blockBRooms = allRooms['B'];

      if (i < 3) {
        assignedRoom = blockBRooms.find((r) => r.room_no === '101');
        bedNo = i + 1;
      } else if (i < 5) {
        assignedRoom = blockBRooms.find((r) => r.room_no === '102');
        bedNo = i - 2;
      } else {
        assignedRoom = blockBRooms.find((r) => r.room_no === '103');
        bedNo = 1;
      }

      const student = await Student.create({
        user_id: user._id,
        name: data.name,
        email: data.email,
        gender: data.gender,
        branch: data.branch,
        year: data.year,
        semester: data.semester,
        college_id: data.college_id,
        phone: data.phone,
        guardian: data.guardian,
        room_no: assignedRoom.room_no,
        hostel_block: 'B',
        floor: assignedRoom.floor,
        bed_no: bedNo,
        is_active: true,
        is_hosteller: true,
      });

      assignedRoom.students.push(student._id);
      await assignedRoom.save();

      createdFemaleStudents.push(student);

      console.log(
        `✅ ${data.name} → Block B, Room ${assignedRoom.room_no}, ` +
        `Floor ${assignedRoom.floor}, Bed ${bedNo}`
      );
    }

    // All students combined for easy reference
    const allStudents = [...createdMaleStudents, ...createdFemaleStudents];

    // ============================================================
    // STEP 6: SET ROOM PREFERENCES (Mutual pairs)
    // ============================================================
    section('STEP 6: Room Preferences');

    // Mutual pair 1 (male): Arjun ↔ Viraj
    const arjun = createdMaleStudents[0];
    const viraj = createdMaleStudents[1];

    await Student.findByIdAndUpdate(arjun._id, {
      room_preference: { preferred_roommate: viraj._id },
    });
    await Student.findByIdAndUpdate(viraj._id, {
      room_preference: { preferred_roommate: arjun._id },
    });
    console.log(`✅ Mutual pair (male): ${arjun.name} ↔ ${viraj.name}`);

    // Mutual pair 2 (female): Priya ↔ Sneha
    const priya = createdFemaleStudents[0];
    const sneha = createdFemaleStudents[1];

    await Student.findByIdAndUpdate(priya._id, {
      room_preference: { preferred_roommate: sneha._id },
    });
    await Student.findByIdAndUpdate(sneha._id, {
      room_preference: { preferred_roommate: priya._id },
    });
    console.log(`✅ Mutual pair (female): ${priya.name} ↔ ${sneha.name}`);

    // One-way preference: Rohan → Karan (Karan hasn't selected back)
    const rohan = createdMaleStudents[2];
    const karan = createdMaleStudents[3];

    await Student.findByIdAndUpdate(rohan._id, {
      room_preference: { preferred_roommate: karan._id },
    });
    console.log(
      `✅ One-way preference: ${rohan.name} → ${karan.name} (not mutual)`
    );

    // ============================================================
    // STEP 7: CREATE COMPLAINTS
    // ============================================================
    section('STEP 7: Complaints');

    const complaints = [
      // Pending complaints
      {
        student_id: createdMaleStudents[0]._id,       // Arjun
        room_no: createdMaleStudents[0].room_no,
        hostel_block: 'A',
        category: 'plumbing',
        description: 'The washroom tap is leaking continuously since 3 days. Water is getting wasted and the floor remains wet causing safety hazard.',
        status: 'pending',
        priority: 'high',
        createdAt: daysAgo(2),
      },
      {
        student_id: createdMaleStudents[2]._id,       // Rohan
        room_no: createdMaleStudents[2].room_no,
        hostel_block: 'A',
        category: 'electrical',
        description: 'One of the tube lights in the room is not working. We have been studying with half lighting for the past week.',
        status: 'pending',
        priority: 'medium',
        createdAt: daysAgo(5),
      },
      {
        student_id: createdFemaleStudents[0]._id,     // Priya
        room_no: createdFemaleStudents[0].room_no,
        hostel_block: 'B',
        category: 'internet',
        description: 'The WiFi in Block B floor 1 is very slow and keeps disconnecting. It has been an issue for over a week now affecting our studies.',
        status: 'pending',
        priority: 'high',
        createdAt: daysAgo(1),
      },
      // In Progress complaints
      {
        student_id: createdMaleStudents[1]._id,       // Viraj
        room_no: createdMaleStudents[1].room_no,
        hostel_block: 'A',
        category: 'furniture',
        description: 'The study table in room 101 has a broken leg and wobbles when we try to study. It needs to be replaced urgently.',
        status: 'in_progress',
        priority: 'medium',
        admin_remark: 'Maintenance team has been notified. New table will be arranged within 2 days.',
        createdAt: daysAgo(7),
      },
      {
        student_id: createdFemaleStudents[2]._id,     // Anjali
        room_no: createdFemaleStudents[2].room_no,
        hostel_block: 'B',
        category: 'cleaning',
        description: 'The common washroom on floor 2 of Block B has not been cleaned for 3 days. It is very unhygienic.',
        status: 'in_progress',
        priority: 'high',
        admin_remark: 'Cleaning staff has been reassigned. Issue being actively monitored.',
        createdAt: daysAgo(4),
      },
      // Resolved complaints
      {
        student_id: createdMaleStudents[4]._id,       // Aditya
        room_no: createdMaleStudents[4].room_no,
        hostel_block: 'A',
        category: 'food',
        description: 'The mess food quality has been very poor for the past week. The dal is always watery and vegetables are undercooked.',
        status: 'resolved',
        priority: 'medium',
        admin_remark: 'Spoke with the mess contractor. Menu has been revised and quality checks implemented. Please let us know if issues persist.',
        resolved_at: daysAgo(1),
        createdAt: daysAgo(10),
      },
      {
        student_id: createdFemaleStudents[3]._id,     // Meera
        room_no: createdFemaleStudents[3].room_no,
        hostel_block: 'B',
        category: 'security',
        description: 'The main gate lock of Block B is broken. Anyone can enter without checking. This is a security concern especially at night.',
        status: 'resolved',
        priority: 'high',
        admin_remark: 'New electronic lock installed. Please use your access card.',
        resolved_at: daysAgo(2),
        createdAt: daysAgo(8),
      },
      {
        student_id: createdMaleStudents[5]._id,       // Dev
        room_no: createdMaleStudents[5].room_no,
        hostel_block: 'A',
        category: 'noise',
        description: 'Students on floor 3 are playing loud music late at night (after 11 PM) which disturbs our sleep and studies.',
        status: 'resolved',
        priority: 'low',
        admin_remark: 'Warning issued to the concerned students. Hostel quiet hours policy has been communicated again.',
        resolved_at: daysAgo(3),
        createdAt: daysAgo(12),
      },
    ];

    for (const complaintData of complaints) {
      await Complaint.create(complaintData);
    }

    console.log(`✅ ${complaints.length} complaints created`);
    console.log(`   → 3 pending | 2 in_progress | 3 resolved`);

    // ============================================================
    // STEP 8: CREATE OUTPASSES
    // ============================================================
    section('STEP 8: Outpasses');

    // NOTE: Outpass model has a pre-validate hook that checks from_date
    // is not in the past. For demo data we bypass this by using
    // direct insertMany instead of .create() for past-dated outpasses.
    // For future-dated outpasses we use .create() normally.

    const outpassesData = [
      // Pending outpasses (future dates — realistic pending requests)
      {
        student_id: createdMaleStudents[0]._id,       // Arjun
        from_date: daysFromNow(3),
        to_date: daysFromNow(6),
        reason: 'Going home for Diwali festival. Family function and puja ceremony.',
        guardian_email: MALE_STUDENTS[0].guardian.email,
        approval_token: crypto.randomBytes(32).toString('hex'),
        token_expires_at: daysFromNow(3),
        email_sent: true,
        status: 'pending',
        createdAt: daysAgo(1),
      },
      {
        student_id: createdFemaleStudents[0]._id,     // Priya
        from_date: daysFromNow(5),
        to_date: daysFromNow(8),
        reason: 'Elder sister\'s wedding ceremony. Mandatory family attendance required.',
        guardian_email: FEMALE_STUDENTS[0].guardian.email,
        approval_token: crypto.randomBytes(32).toString('hex'),
        token_expires_at: daysFromNow(5),
        email_sent: true,
        status: 'pending',
        createdAt: daysAgo(2),
      },
      {
        student_id: createdMaleStudents[2]._id,       // Rohan
        from_date: daysFromNow(2),
        to_date: daysFromNow(4),
        reason: 'Medical appointment for knee surgery follow-up at city hospital.',
        guardian_email: MALE_STUDENTS[2].guardian.email,
        approval_token: crypto.randomBytes(32).toString('hex'),
        token_expires_at: daysFromNow(2),
        email_sent: true,
        status: 'pending',
        createdAt: new Date(),
      },
      // Approved outpass
      {
        student_id: createdMaleStudents[1]._id,       // Viraj
        from_date: daysFromNow(7),
        to_date: daysFromNow(10),
        reason: 'Going home for weekend. Parents are visiting from Haryana.',
        guardian_email: MALE_STUDENTS[1].guardian.email,
        approval_token: crypto.randomBytes(32).toString('hex'),
        token_expires_at: daysFromNow(7),
        email_sent: true,
        status: 'approved',
        admin_remark: 'Approved. Please return before 9 PM on the last date.',
        createdAt: daysAgo(3),
      },
      {
        student_id: createdFemaleStudents[2]._id,     // Anjali
        from_date: daysFromNow(4),
        to_date: daysFromNow(6),
        reason: 'Attending inter-college sports meet at Delhi University.',
        guardian_email: FEMALE_STUDENTS[2].guardian.email,
        approval_token: crypto.randomBytes(32).toString('hex'),
        token_expires_at: daysFromNow(4),
        email_sent: true,
        status: 'approved',
        admin_remark: 'Approved for sports event. Carry your ID card.',
        createdAt: daysAgo(2),
      },
      // Guardian rejected outpass
      {
        student_id: createdMaleStudents[3]._id,       // Karan
        from_date: daysFromNow(1),
        to_date: daysFromNow(3),
        reason: 'Friend\'s birthday party in the city.',
        guardian_email: MALE_STUDENTS[3].guardian.email,
        approval_token: crypto.randomBytes(32).toString('hex'),
        token_expires_at: daysFromNow(1),
        email_sent: true,
        status: 'guardian_rejected',
        admin_remark: 'Guardian has rejected this outpass request.',
        createdAt: daysAgo(4),
      },
    ];

    // Use insertMany with timestamps: false to bypass date validation hook
    // for demo data (real app would only allow future dates)
    await Outpass.insertMany(outpassesData, { timestamps: false });

    console.log(`✅ ${outpassesData.length} outpasses created`);
    console.log(`   → 3 pending | 2 approved | 1 guardian_rejected`);

    // ============================================================
    // STEP 9: CREATE PAYMENTS
    // ============================================================
    section('STEP 9: Payments');

    const paymentsData = [
      // ---- PAID payments (historical) ----
      {
        student_id: createdMaleStudents[0]._id,       // Arjun — paid hostel fee
        amount: 25000,
        type: 'hostel_fee',
        description: 'Hostel fee for Jan–Mar 2025 semester',
        status: 'paid',
        due_date: daysAgo(30),
        payment_date: daysAgo(35),
        transaction_id: 'TXN2025JAN001',
        reminder_count: 1,
        createdAt: daysAgo(60),
      },
      {
        student_id: createdFemaleStudents[0]._id,     // Priya — paid mess fee
        amount: 8000,
        type: 'mess_fee',
        description: 'Mess fee for February 2025',
        status: 'paid',
        due_date: daysAgo(15),
        payment_date: daysAgo(18),
        transaction_id: 'TXN2025FEB002',
        reminder_count: 0,
        createdAt: daysAgo(45),
      },
      {
        student_id: createdMaleStudents[1]._id,       // Viraj — paid fine
        amount: 500,
        type: 'fine',
        description: 'Late return fine — returned 2 hours past curfew on 15 Jan',
        status: 'paid',
        due_date: daysAgo(20),
        payment_date: daysAgo(22),
        transaction_id: 'TXN2025FINE003',
        reminder_count: 2,
        createdAt: daysAgo(30),
      },
      {
        student_id: createdFemaleStudents[1]._id,     // Sneha — paid maintenance
        amount: 1200,
        type: 'maintenance',
        description: 'Room maintenance charges for AC servicing Q1 2025',
        status: 'paid',
        due_date: daysAgo(10),
        payment_date: daysAgo(12),
        transaction_id: 'TXN2025MAIN004',
        reminder_count: 1,
        createdAt: daysAgo(40),
      },

      // ---- PENDING payments (upcoming/overdue) ----
      {
        student_id: createdMaleStudents[2]._id,       // Rohan — pending hostel fee
        amount: 25000,
        type: 'hostel_fee',
        description: 'Hostel fee for Apr–Jun 2025 semester',
        status: 'pending',
        due_date: daysFromNow(15),   // Due in 15 days
        reminder_count: 1,
        createdAt: daysAgo(20),
      },
      {
        student_id: createdMaleStudents[3]._id,       // Karan — pending mess fee
        amount: 8000,
        type: 'mess_fee',
        description: 'Mess fee for March 2025',
        status: 'pending',
        due_date: daysFromNow(5),    // Due in 5 days (due soon!)
        reminder_count: 2,
        createdAt: daysAgo(10),
      },
      {
        student_id: createdFemaleStudents[2]._id,     // Anjali — OVERDUE
        amount: 25000,
        type: 'hostel_fee',
        description: 'Hostel fee for Jan–Mar 2025 semester',
        status: 'pending',
        due_date: daysAgo(10),       // Was due 10 days ago (OVERDUE!)
        reminder_count: 3,
        last_reminder_type: 'overdue',
        createdAt: daysAgo(45),
      },
      {
        student_id: createdFemaleStudents[3]._id,     // Meera — OVERDUE fine
        amount: 1000,
        type: 'fine',
        description: 'Damage fine — broken window glass in room 102',
        status: 'pending',
        due_date: daysAgo(5),        // Was due 5 days ago (OVERDUE!)
        reminder_count: 2,
        last_reminder_type: 'overdue',
        createdAt: daysAgo(20),
      },
      {
        student_id: createdMaleStudents[4]._id,       // Aditya — pending
        amount: 8000,
        type: 'mess_fee',
        description: 'Mess fee for April 2025',
        status: 'pending',
        due_date: daysFromNow(20),   // Due in 20 days
        reminder_count: 0,
        createdAt: daysAgo(5),
      },
      {
        student_id: createdFemaleStudents[4]._id,     // Riya — pending hostel
        amount: 25000,
        type: 'hostel_fee',
        description: 'Hostel fee for Apr–Jun 2025 semester',
        status: 'pending',
        due_date: daysFromNow(3),    // Due in 3 days (urgent!)
        reminder_count: 2,
        last_reminder_type: '3_days',
        createdAt: daysAgo(15),
      },
    ];

    await Payment.insertMany(paymentsData);

    console.log(`✅ ${paymentsData.length} payments created`);
    console.log(`   → 4 paid | 6 pending (3 overdue, 3 upcoming)`);

    // ============================================================
    // STEP 10: FINAL SUMMARY
    // ============================================================
    section('SEED COMPLETE — Summary');

    console.log('\n🏠 HOSTEL SETUP');
    console.log('   Block A (Male)   — 3 floors, 4 rooms/floor, 3 beds/room');
    console.log('   Block B (Female) — 3 floors, 4 rooms/floor, 3 beds/room');
    console.log('   Room 101 in each block → FULL  (3/3 students)');
    console.log('   Room 102 in each block → PARTIAL (2/3 students)');
    console.log('   Room 103 in each block → PARTIAL (1/3 students)');
    console.log('   Room 104 in each block → EMPTY');
    console.log('   Floor 2 & 3 rooms       → EMPTY (for demo allocation)');

    console.log('\n👤 LOGIN CREDENTIALS');
    console.log('┌─────────────────────────────────────────────────────┐');
    console.log('│  ADMIN                                              │');
    console.log(`│  Email:    ${ADMIN.email.padEnd(40)}│`);
    console.log(`│  Password: ${ADMIN.password.padEnd(40)}│`);
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│  MALE STUDENTS (all use password: Student@123)      │');
    MALE_STUDENTS.forEach((s) => {
      console.log(`│  ${s.email.padEnd(51)}│`);
    });
    console.log('├─────────────────────────────────────────────────────┤');
    console.log('│  FEMALE STUDENTS (all use password: Student@123)    │');
    FEMALE_STUDENTS.forEach((s) => {
      console.log(`│  ${s.email.padEnd(51)}│`);
    });
    console.log('└─────────────────────────────────────────────────────┘');

    console.log('\n📊 DATA CREATED');
    console.log(`   👤 Users:         ${1 + MALE_STUDENTS.length + FEMALE_STUDENTS.length} (1 admin + 12 students)`);
    console.log(`   🏠 Hostel blocks: 2 (Block A male, Block B female)`);
    console.log(`   🛏️  Rooms:         ${allRooms['A'].length + allRooms['B'].length} total`);
    console.log(`   📋 Complaints:    ${complaints.length} (3 pending, 2 in_progress, 3 resolved)`);
    console.log(`   📄 Outpasses:     ${outpassesData.length} (3 pending, 2 approved, 1 rejected)`);
    console.log(`   💳 Payments:      ${paymentsData.length} (4 paid, 6 pending/overdue)`);
    console.log(`   💑 Preferences:   2 mutual pairs + 1 one-way`);

    console.log('\n✅ Database is ready for presentation!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Seed failed:', error.message);
    console.error(error.stack);
    await mongoose.disconnect();
    process.exit(1);
  }
};

// Run the seed
seedDemo();