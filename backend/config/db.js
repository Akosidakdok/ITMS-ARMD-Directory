import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

let isConnecting = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return true;
  if (isConnecting) return false;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn('⚠️ MONGODB_URI is not set in environment variables.');
    return false;
  }

  isConnecting = true;
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    isConnecting = false;
    console.log(`===================================================`);
    console.log(` MongoDB Atlas Connected Successfully!`);
    console.log(` Host: ${conn.connection.host}`);
    console.log(` Database: ${conn.connection.name}`);
    console.log(`===================================================`);
    return true;
  } catch (error) {
    isConnecting = false;
    console.error(`❌ MongoDB Atlas Connection Error: ${error.message}`);
    return false;
  }
};

export const getDBStatus = () => {
  const readyState = mongoose.connection.readyState;
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  return {
    isConnected: readyState === 1,
    state: states[readyState] || 'Disconnected',
    host: mongoose.connection.host || null,
    dbName: mongoose.connection.name || null
  };
};
