const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/* 🎬 Embedded Movie Request schema */
const movieRequestSchema = new mongoose.Schema(
  {
    movieName: { type: String, required: true },
    requestedAt: { type: Date, default: Date.now },
  },
  { _id: false } // 👈 separate _id unnecessary
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    password: { type: String, required: true },

    profilePic: { type: String, default: "" },

    /* 🎬 Movie Requests (NEW) */
    movieRequests: [movieRequestSchema],

    // --- Watch History ---
    watchHistory: [
      {
        videoId: { type: mongoose.Schema.Types.ObjectId, ref: "Video" },
        time: { type: Number, default: 0 },
        watchedAt: { type: Date, default: Date.now },
      },
    ],

    // --- Favorites ---
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video",
      },
    ],

    // --- Devices ---
    loggedDevices: [
      {
        deviceName: String,
        ip: String,
        loggedInAt: Date,
      },
    ],

    // --- Password Reset ---
    resetToken: String,
    resetTokenExpiry: Date,

    // --- Email Verification ---
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: String,
    verificationExpires: Date,

    // --- Email Login OTP ---
    loginOtp: String,
    loginOtpExpires: Date,
  },
  { timestamps: true }
);

/* 🔐 Hash password before save */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

/* 🧠 Compare password */
userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
