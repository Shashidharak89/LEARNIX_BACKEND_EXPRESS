import mongoose from "mongoose";
import { env } from "./env.js";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return mongoose.connection;

  const mongoUri = env.MONGO_URI;

  if (!mongoUri) {
    console.warn(
      "connectDB: No MongoDB URI found in environment (checked MONGO_URI and MONGODB_URI)."
    );
    return null;
  }

  try {
    const conn = await mongoose.connect(mongoUri);
    isConnected = true;
    console.log(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error("[Database] MongoDB connection error:", error);
    throw error;
  }
}

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("[Database] MongoDB disconnected");
});
