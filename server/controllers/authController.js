// server/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const JWT_SECRET = process.env.JWT_SECRET || "secret123";
const AVATAR_DIR = path.join(__dirname, "..", "avatars");

// --- utils ---
function ensureDirSync(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}
function isSafeBasename(name) {
  // defense-in-depth for any filename we accept
  return /^[a-zA-Z0-9._-]+$/.test(name);
}

// ---------- Auth ----------
const registerUser = async (req, res) => {
  console.log("🔵 Register route hit");
  const { name, email, password } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    console.log("✅ User created");
    res.status(201).json({ message: "Registered successfully" });
  } catch (err) {
    console.error("❌ Registration failed:", err);
    res.status(500).json({ error: "Registration failed" });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid email or password" });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "7d" });
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const forgotPassword = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "No user found with that email" });

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset Request",
        text: `Click the link to reset your password: https://yourdomain.com/reset-password?token=YOUR_TOKEN`,
      });

      res.json({ message: "Password reset link sent to your email." });
    } catch (err) {
      console.error("❌ Nodemailer error:", err);
      res.status(500).json({ error: "Failed to send email.", detail: err.message });
    }
  } catch (err) {
    console.error("❌ Forgot password outer error:", err);
    res.status(500).json({ error: "Server error", detail: err.message });
  }
};

// ---------- Profile ----------
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updates = { ...req.body };
    // Never allow avatar to be updated via generic profile update
    delete updates.avatar;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
};

// ---------- Avatar upload & stream ----------
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    ensureDirSync(AVATAR_DIR);

    // Always save as JPEG with .jpg extension
    const filename = `${req.user.id}_${Date.now()}.jpg`;
    const outPath = path.join(AVATAR_DIR, filename);

    await sharp(req.file.buffer).resize(256, 256).jpeg({ quality: 80 }).toFile(outPath);

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Remove old avatar if exists (safely)
    if (user.avatar) {
      const oldBase = path.basename(user.avatar);
      const oldPath = path.join(AVATAR_DIR, oldBase);
      if (isSafeBasename(oldBase) && fs.existsSync(oldPath)) {
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    user.avatar = filename; // store basename only
    await user.save();

    res.json({ avatar: filename, user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    console.error("uploadAvatar error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const streamMyAvatar = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("avatar");
    if (!user || !user.avatar) return res.status(404).json({ message: "Avatar not found" });

    const base = path.basename(user.avatar);
    if (!isSafeBasename(base)) return res.status(400).json({ message: "Invalid avatar" });

    const filePath = path.join(AVATAR_DIR, base);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) return res.status(404).json({ message: "Avatar not found" });
      res.setHeader("Content-Type", "image/jpeg");
      res.sendFile(filePath);
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

const streamAvatarByFilename = (req, res) => {
  try {
    const base = path.basename(req.params.filename || "");
    if (!isSafeBasename(base)) return res.status(400).json({ message: "Invalid filename" });

    const filePath = path.join(AVATAR_DIR, base);
    fs.access(filePath, fs.constants.F_OK, (err) => {
      if (err) return res.status(404).json({ message: "Avatar not found" });
      res.setHeader("Content-Type", "image/jpeg");
      res.sendFile(filePath, (err2) => {
        if (err2) res.status(500).json({ message: "Error sending avatar file" });
      });
    });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  getProfile,
  updateProfile,
  uploadAvatar,
  streamMyAvatar,
  streamAvatarByFilename,
};
