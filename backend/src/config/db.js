import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * Connect to MongoDB using Mongoose
 */
export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB] Initial connection error: ${error.message}`);
  }
};

/**
 * Health check helper for MongoDB
 * Returns status: 'connected' | 'disconnected' | 'connecting' | 'error'
 */
export const checkMongoHealth = async () => {
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const state = readyStates[mongoose.connection.readyState] || 'disconnected';

  if (state === 'connected') {
    try {
      const start = Date.now();
      await mongoose.connection.db.admin().ping();
      const latencyMs = Date.now() - start;
      return { status: 'connected', latencyMs };
    } catch (err) {
      return { status: 'error', error: err.message };
    }
  }

  // Try to connect if currently disconnected
  try {
    const start = Date.now();
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 2000 });
    const latencyMs = Date.now() - start;
    return { status: 'connected', latencyMs };
  } catch (err) {
    return { status: 'disconnected', error: err.message };
  }
};

export default mongoose;
