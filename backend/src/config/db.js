import mongoose from 'mongoose';
import config from './env.js';

const connectDB = async () => {
  try {
    // mongoose.connect() returns a promise
    // 'await' pauses execution until the connection is established (or fails)
    const conn = await mongoose.connect(config.mongoUri);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    // If we can't connect to the database, the entire app is useless
    // So we crash immediately rather than running in a broken state
    process.exit(1);
  }
};

export default connectDB;