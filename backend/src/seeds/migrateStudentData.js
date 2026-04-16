import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Student from '../models/Student.js';
import connectDB from '../config/db.js';
import { BRANCHES } from '../constants/enums.js';

dotenv.config();

/**
 * Maps messy / legacy branch values to official branch names.
 *
 * Add more aliases here if you find more variants in your DB.
 */
const branchAliasMap = {
  cse: 'Computer Science',
  cs: 'Computer Science',
  'computer science': 'Computer Science',
  'computer engineering': 'Computer Science',
  comp: 'Computer Science',

  entc: 'Electronics and Telecommunication',
  etc: 'Electronics and Telecommunication',
  'electronics and telecommunication': 'Electronics and Telecommunication',

  aiml: 'Artificial Intelligence and Machine Learning',
  'ai&ml': 'Artificial Intelligence and Machine Learning',
  'artificial intelligence and machine learning':
    'Artificial Intelligence and Machine Learning',

  rna: 'Robotics and Automation',
  'robotics and automation': 'Robotics and Automation',

  mech: 'Mechanical Engineering',
  mechanical: 'Mechanical Engineering',
  'mechanical engineering': 'Mechanical Engineering',

  civil: 'Civil Engineering',
  'civil engineering': 'Civil Engineering',
};

/**
 * Normalize a branch string into one of the official branch values.
 */
const normalizeBranch = (branch) => {
  if (!branch || typeof branch !== 'string') return '';

  const normalized = branch.trim().toLowerCase();

  if (branchAliasMap[normalized]) {
    return branchAliasMap[normalized];
  }

  // If already official, keep it
  const official = BRANCHES.find(
    (item) => item.toLowerCase() === normalized
  );

  return official || '';
};

/**
 * Guess / clean gender only for exact valid values.
 * We do NOT invent gender from name or anything unsafe.
 */
const normalizeGender = (gender) => {
  if (!gender || typeof gender !== 'string') return '';

  const normalized = gender.trim().toLowerCase();

  if (normalized === 'male') return 'male';
  if (normalized === 'female') return 'female';

  return '';
};

const migrateStudentData = async () => {
  try {
    await connectDB();

    const students = await Student.find({});
    let updatedCount = 0;

    for (const student of students) {
      let changed = false;

      const cleanedBranch = normalizeBranch(student.branch);
      if (cleanedBranch !== student.branch) {
        student.branch = cleanedBranch;
        changed = true;
      }

      const cleanedGender = normalizeGender(student.gender);
      if (cleanedGender !== student.gender) {
        student.gender = cleanedGender;
        changed = true;
      }

      // Ensure guardian object exists safely
      if (!student.guardian) {
        student.guardian = {
          name: '',
          phone: '',
          email: '',
        };
        changed = true;
      }

      // Ensure guardian email field exists
      if (student.guardian && typeof student.guardian.email !== 'string') {
        student.guardian.email = '';
        changed = true;
      }

      if (changed) {
        await student.save();
        updatedCount++;
        console.log(`✅ Updated student: ${student.email}`);
      }
    }

    console.log(`\n🎉 Migration complete. Updated ${updatedCount} student(s).`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

migrateStudentData();