// server/models/User.js
const mongoose = require("mongoose");
const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    name: { type: String, trim: true },
    username: { type: String, trim: true, unique: true, sparse: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    // --- NEW: creator reputation (denormalized aggregate) ---
    creatorRatingAvg: { type: Number, default: 0 },    // 0 means "no ratings yet"
    creatorRatingCount: { type: Number, default: 0 },  // number of ratings received
    // -------------------------------------------------------
    // ... any other fields you already keep (roles, phone, etc.)

    // --- Profile fields ---
    avatar: { type: String, default: "" }, // stores filename or URL
    gender: { type: String, default: "" },
    location: { type: String, default: "" },
    birthday: { type: String, default: "" },
    summary: { type: String, default: "" },
    website: { type: String, default: "" },
    github: { type: String, default: "" },
    linkedin: { type: String, default: "" },
    twitter: { type: String, default: "" },
    // --- End profile fields ---
  },
  { timestamps: true }
);

// Helpful projection when sending to client
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model("User", UserSchema);
