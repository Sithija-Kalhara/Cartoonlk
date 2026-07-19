const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");
const User = require("../models/User");
const UAParser = require("ua-parser-js");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const geoip = require('geoip-lite');

// 🔐 Generate token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// --- REGISTER USER ---
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user && user.isVerified)
      return res.status(400).json({ message: "User already exists" });
    if (user && !user.isVerified) {
      await User.deleteOne({ _id: user._id });
    }

    user = new User({ name, email, password });

    const token = crypto.randomBytes(32).toString("hex");
    user.verificationToken = token;
    user.verificationExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    res.status(201).json({
      message: "✅ Registered! Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- LOGIN USER ---
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.isVerified) {
      return res.status(401).json({
        message: "❌ Please verify your email before logging in.",
        resend: true, 
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.loginOtp = otp;
    user.loginOtpExpires = Date.now() + 1000 * 60 * 10;
    await user.save();

    return res.json({
      otpRequired: true,
      userId: user._id,
    });
    
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- VERIFY EMAIL LOGIN (OTP VERIFICATION) ---
const verifyEmailLogin = async (req, res) => {
  try {
    const { userId, token, timezone, ip: frontendIP } = req.body;

    const user = await User.findOne({
      _id: userId,
      loginOtp: token,
      loginOtpExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired code." });
    }

    user.loginOtp = undefined;
    user.loginOtpExpires = undefined;

    // Device Tracking
    const parser = new UAParser(req.headers["user-agent"]);
    const ua = parser.getResult();
    const userAgent = `${ua.browser.name || "Browser"} on ${ua.os.name || "OS"}`;

    // IP detection
    let ip =
      frontendIP ||
      req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "Unknown IP";

    if (ip.startsWith("::ffff:")) ip = ip.replace("::ffff:", "");
    if (ip === "::1") ip = "127.0.0.1";

    user.loggedDevices = user.loggedDevices || [];

    user.loggedDevices.push({
      deviceName: userAgent,
      ip,
      loggedInAt: new Date(),
    });

    await user.save();

    // GEOIP
    let location = "Unknown Location";
    const geo = geoip.lookup(ip);
    if (geo && geo.country) {
      const city = geo.city || "Unknown City";
      location = `${city}, ${geo.country}`;
    }

    const userTimezone = timezone || "UTC";
    const loginTime = new Date().toLocaleString("en-US", {
      timeZone: userTimezone,
    });

    // JWT with deviceId
    const deviceId = user.loggedDevices[user.loggedDevices.length - 1]._id.toString();

    const authToken = jwt.sign(
      { id: user._id, deviceId },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || "",
      token: authToken,
    });

  } catch (err) {
    console.error("Email login verify error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// --- VERIFY EMAIL ---
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({
      verificationToken: token,
      verificationExpires: { $gt: Date.now() },
    });
    if (!user) {
      return res.status(400).send("<h1>Token is invalid or has expired.</h1>");
    }
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationExpires = undefined;
    await user.save();
    res.redirect(`${process.env.FRONTEND_URL}/auth?verified=true`);
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).send("<h1>Error verifying email.</h1>");
  }
};

// --- RESEND VERIFICATION EMAIL ---
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "This account is already verified." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.verificationToken = token;
    user.verificationExpires = Date.now() + 1000 * 60 * 15;
    await user.save();

    res.status(200).json({ message: "✅ New verification email sent. Please check your inbox." });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- LOGOUT ALL DEVICES ---
const logoutAllDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.loggedDevices = [];
    await user.save();
    res.clearCookie("token");
    res.json({ message: "✅ All devices logged out successfully" });
  } catch (err) {
    console.error("Logout-all error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- LOGOUT SINGLE DEVICE ---
const logoutSingleDevice = async (req, res) => {
  try {
    const { userId, deviceId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.loggedDevices = user.loggedDevices.filter(
      (d) => d._id.toString() !== deviceId
    );
    await user.save();
    res.json({ message: "✅ Device logged out successfully" });
  } catch (err) {
    console.error("Logout single device error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- UPLOAD PROFILE PICTURE ---
const uploadProfilePic = async (req, res) => {
  try {
    const { userId } = req.params;
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    const ext = path.extname(file.originalname);
    const key = `profile/${userId}${ext}`;
    const fileBuffer = fs.readFileSync(file.path);
    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: key,
        Body: fileBuffer,
        ContentType: file.mimetype,
      })
    );
    const url = `${process.env.PUBLIC_CDN}/${key}`;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.profilePic = url;
    await user.save();
    fs.unlinkSync(file.path);
    console.log("✅ ProfilePic updated for:", user.email);
    res.json({ url });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};

// --- UPDATE PROFILE ---
const updateProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, password } = req.body;
    const updates = { name, email };
    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }
    const user = await User.findByIdAndUpdate(userId, updates, { new: true });
    res.json({ message: "✅ Profile updated", user });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- CHANGE PASSWORD ---
const changePassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid current password" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- GET USER PREFERENCES ---
const getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId)
      .populate("watchHistory.videoId", "category title")
      .populate("favorites.videoId", "category title");
    if (!user) return res.status(404).json({ message: "User not found" });
    const freq = {};
    const collectCats = (arr) => {
      arr.forEach((entry) => {
        const cats = Array.isArray(entry.videoId?.category)
          ? entry.videoId.category
          : entry.videoId?.category
          ? [entry.videoId.category]
          : [];
        cats.forEach((cat) => {
          if (!cat) return;
          const name = cat.trim();
          freq[name] = (freq[name] || 0) + 1;
        });
      });
    };
    collectCats(user.watchHistory);
    collectCats(user.favorites);
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([cat]) => cat);
    res.json({
      topCategories: sorted.slice(0, 10),
    });
  } catch (err) {
    console.error("❌ Error fetching preferences:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- GET LOGGED DEVICES ---
const getDevices = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user.loggedDevices || []);
  } catch (err) {
    console.error("❌ Get devices error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- REQUEST PASSWORD RESET ---
const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account found" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 10;
    await user.save();
    
    res.json({ message: "✅ Verification code sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- VERIFY RESET CODE ---
const verifyResetCode = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({
      email,
      resetToken: otp,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired code" });
    const tempToken = crypto.randomBytes(32).toString("hex");
    user.resetToken = tempToken;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 15;
    await user.save();
    res.json({
      message: "✅ Code verified successfully",
      token: tempToken,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- RESET PASSWORD ---
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() },
    });
    if (!user)
      return res.status(400).json({ message: "Invalid or expired token" });
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();
    res.json({ message: "✅ Password reset successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- Module Exports ---
module.exports = {
  registerUser,
  loginUser,
  verifyEmailLogin,
  verifyEmail,
  resendVerificationEmail,
  uploadProfilePic,
  updateProfile,
  changePassword,
  getUserPreferences,
  logoutAllDevices,
  getDevices,
  requestPasswordReset,
  resetPassword,
  verifyResetCode,
  logoutSingleDevice,
};