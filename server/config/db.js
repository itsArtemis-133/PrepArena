// server/config/db.js
const mongoose = require("mongoose");

// Prefer MONGODB_URI, fallback to MONGO_URI for compatibility
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "";

if (!MONGO_URI) {
  console.error("❌ No Mongo URI found in environment variables. Please set MONGO_URI or MONGODB_URI in your .env file.");
  process.exit(1);
}

// Recommended connection options for stability
const options = {
  maxPoolSize: 10,                // Maintain up to 10 socket connections
  serverSelectionTimeoutMS: 15000, // Timeout after 15s if server not found
  socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
  family: 4,                      // Use IPv4, skip IPv6 issues
};

async function connectDB(retries = 5, delayMs = 2000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(MONGO_URI, options);
      console.log("✅ MongoDB connected successfully");
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt < retries) {
        console.log(`🔄 Retrying in ${delayMs / 1000} seconds...`);
        await new Promise((res) => setTimeout(res, delayMs));
      } else {
        console.error("🚨 Unable to connect to MongoDB after multiple attempts. Exiting...");
        process.exit(1);
      }
    }
  }
}

module.exports = { connectDB };
