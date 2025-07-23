const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// 👉 Route imports first
const authRoutes = require("./routes/auth");
const testRoutes = require("./routes/test");

// 👉 Use routes before starting server
app.use("/api/auth", authRoutes);
app.use("/api/test", testRoutes);

// Root route
app.get("/", (req, res) => {
  res.send("UPSC Test Platform API is running ✅");
});

// ✅ MongoDB & start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(process.env.PORT || 8000, () =>
      console.log(`🚀 Server started on port ${process.env.PORT || 8000}`)
    );
  })
  .catch((err) => console.log("❌ MongoDB Error:", err));
