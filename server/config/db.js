// server/config/db.js
const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/upsc_platform";
  // fail fast if DB is unreachable
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    // socketTimeoutMS: 20000, // optional
  });
  console.log("✅ Mongo connected:", mongoose.connection.name);
}

module.exports = { connectDB };
