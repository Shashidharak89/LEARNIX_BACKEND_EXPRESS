import dotenv from "dotenv";

// Load environment variables from .env
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || process.env.MONGODB_URI || "",
  CLOUDINARY_NAME: process.env.CLOUDINARY_NAME || process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_KEY: process.env.CLOUDINARY_KEY || process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_SECRET: process.env.CLOUDINARY_SECRET || process.env.CLOUDINARY_API_SECRET || "",
  CLIENT_URL: process.env.CLIENT_URL || "*",
};
