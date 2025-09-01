// server/routes/auth.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();
const upload = multer();

let ctrl;
try {
  ctrl = require("../controllers/authController");
} catch (e) {
  console.error("[auth] controllers/authController not found:", e.message);
  ctrl = {};
}

const authMiddleware = require("../middleware/authMiddleware");

// Pick controller functions with graceful fallback
const loginHandler = ctrl.login || ctrl.loginUser || ctrl.signIn || ctrl.authenticate;
const registerHandler = ctrl.register || ctrl.registerUser || ctrl.signUp || ctrl.createUser;

// --- Public auth endpoints ---
router.post(
  "/login",
  typeof loginHandler === "function"
    ? loginHandler
    : (_req, res) => res.status(500).json({ message: "Export a function: login / loginUser / signIn" })
);

router.post(
  "/register",
  typeof registerHandler === "function"
    ? registerHandler
    : (_req, res) => res.status(500).json({ message: "Export a function: register / registerUser / signUp" })
);

router.post("/forgot-password", ctrl.forgotPassword);

// --- Profile endpoints (protected) ---
router.get("/profile", authMiddleware, ctrl.getProfile);
router.patch("/profile", authMiddleware, ctrl.updateProfile);

// Upload avatar (multipart/form-data; field = "avatar")
router.post("/profile/avatar", authMiddleware, upload.single("avatar"), ctrl.uploadAvatar);

// Protected avatar streaming
router.get("/avatar/me", authMiddleware, ctrl.streamMyAvatar);
// Optional filename streaming (still protected; use only with axios+blob)
router.get("/avatar/:filename", authMiddleware, ctrl.streamAvatarByFilename);

module.exports = router;
