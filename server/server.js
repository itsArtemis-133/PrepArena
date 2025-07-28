// server/server.js
 const express = require("express");
 const mongoose = require("mongoose");
 const cors = require("cors");
 const path = require("path");
 require("dotenv").config();

 const app = express();
 app.use(cors());
 app.use(express.json());


// Expose uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

 // 👉 Route imports first
 const authRoutes = require("./routes/auth");
 const testRoutes = require("./routes/test");
 const apiRoutes  = require("./routes/api");          // ← add this
 const uploadRoutes = require("./routes/upload");
 // 👉 Use routes before starting server
 app.use("/api/auth", authRoutes);
 app.use("/api/test", testRoutes);
 app.use("/api", apiRoutes);                          // ← and mount it here
 app.use("/api/upload", uploadRoutes);
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
