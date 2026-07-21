const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const { PutObjectCommand } = require("@aws-sdk/client-s3");
const r2 = require("../config/r2");
const User = require("../models/User");
const UAParser = require("ua-parser-js");
const crypto = require("crypto");
const geoip = require("geoip-lite");

const transporter = require("../config/mailer");

// 🔐 Generate token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });

// --- (Functions registerUser, loginUser are unchanged) ---
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

    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${token}`;

    const mailResult = await transporter.sendMail({
      from: `CartoonLK <noreply@cartoonlk.com>`,
      to: user.email,
      subject: "Welcome to CartoonLK! Verify Your Email",
      html: `
  <div style="max-width:500px;margin:auto;background:#ffffff;border-radius:12px;
  border:1px solid #e5e5e5;font-family:Arial, sans-serif;overflow:hidden;">

    <!-- Header -->
    <div style="background:#0A84FF;padding:20px 25px;color:#fff;text-align:center;">
      <h2 style="margin:0;font-size:22px;"> Welcome to CartoonLK</h2>
    </div>

    <!-- Body -->
    <div style="padding:25px;color:#333;line-height:1.6;">
      <p style="font-size:16px;margin-bottom:10px;">
        Hi <strong>${user.name}</strong>,
      </p>

      <p style="font-size:14px;margin-bottom:20px;">
        Thanks for registering! Please click the button below to verify your email and activate your CartoonLK account.
      </p>

      <div style="text-align:center;margin:25px 0;">
        <a href="${verificationUrl}"
           style="background:#4CAF50;color:white;padding:12px 20px;border-radius:8px;
           text-decoration:none;font-size:15px;font-weight:bold;display:inline-block;">
           Verify Your Account
        </a>
      </div>

      <p style="font-size:14px;color:#666;">
        This verification link will expire in <strong>15 minutes</strong>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f1f1f1;padding:12px;text-align:center;
    font-size:11px;color:#777;">
      © ${new Date().getFullYear()} CartoonLK. All rights reserved.
    </div>

  </div>
  `,
    });

    console.log("📧 Mail sent result:", {
      messageId: mailResult.messageId,
      accepted: mailResult.accepted,
      rejected: mailResult.rejected,
      response: mailResult.response,
      to: user.email,
    });

    res.status(201).json({
      message: "✅ Registered! Please check your email to verify your account.",
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // 1. User ඉන්නවාද කියලා බලනවා
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // 2. පාස්වර්ඩ් එක මැච් වෙනවාද බලනවා
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Invalid credentials" });

    // 3. වෙරිෆයි කරලා නැත්නම් Frontend එකට කියනවා බටන් එක පෙන්වන්න කියලා
    if (!user.isVerified) {
      return res.status(401).json({
        message: "❌ Please verify your email before logging in.",
        resend: true,
      });
    }

    // 4. OTP එක හදනවා
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // ⭐ [CRITICAL FIX]: පාස්වර්ඩ් එක ආයෙත් hash වීම වැළැක්වීමට 
    // .updateOne() එකක් පාවිච්චි කරලා කෙලින්ම Database එකට OTP එක විතරක් යවනවා.
    await User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          loginOtp: otp, 
          loginOtpExpires: Date.now() + 1000 * 60 * 10 
        } 
      }
    );

    // 5. ඊමේල් එක යැවීම (Try-Catch එකක් ඇතුළේ සර්වර් එක ක්‍රෑෂ් නොවෙන්න)
    try {
      await transporter.sendMail({
        from: `CartoonLK <noreply@cartoonlk.com>`,
        to: user.email,
        subject: "Your CartoonLK Login Code",
        html: `
    <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;
    border:1px solid #e5e5e5;font-family:Arial, sans-serif;overflow:hidden;">
      <div style="background:#0A84FF;padding:20px 25px;color:#fff;text-align:center;">
        <h2 style="margin:0;font-size:22px;"> Your CartoonLK Login Code</h2>
      </div>
      <div style="padding:25px;color:#333;text-align:center;">
        <p style="font-size:15px;margin-bottom:15px;">
          Here is your 6-digit login code. This code will expire in <strong>10 minutes</strong>.
        </p>
        <div style="background:#f5f7ff;padding:20px;border-radius:10px;margin:20px 0;font-size:34px;font-weight:bold;color:#0A84FF;letter-spacing:10px;">
          ${otp}
        </div>
        <p style="font-size:14px;color:#666;">If you didn’t request this code, you can safely ignore this email.</p>
      </div>
      <div style="background:#f1f1f1;padding:12px;text-align:center;font-size:11px;color:#777;">
        © ${new Date().getFullYear()} CartoonLK. All rights reserved.
      </div>
    </div>`,
      });
    } catch (mailErr) {
      console.error("❌ Login OTP Mail Send Error:", mailErr);
      // සර්වර් එක ක්‍රෑෂ් කරන්නේ නැතුව Frontend එකට මේල් එක යවන්න බැරි වුණා කියලා කියනවා
      return res.status(500).json({ message: "Failed to send OTP email. Please try again." });
    }

    // 6. සාර්ථක නම් Frontend එකට Response එක දෙනවා
    return res.json({
      otpRequired: true,
      userId: user._id,
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- (MODIFIED) Verify the Email OTP and Login ---
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

    // Email alert
    try {
      await transporter.sendMail({
        from: `CartoonLK Security <noreply@cartoonlk.com>`,
        to: user.email,
        subject: "New Login Detected on Your CartoonLK Account",
        html: `<p>New login detected...</p>`,
      });
    } catch (emailErr) {
      console.error("Failed to send login email:", emailErr);
    }

    // JWT with deviceId
    const deviceId =
      user.loggedDevices[user.loggedDevices.length - 1]._id.toString();

    const authToken = jwt.sign(
      { id: user._id, deviceId },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      profilePic: user.profilePic || "",
      token: authToken,
    });
  } catch (err) {
    console.error("Email login verify error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// --- (All other functions are unchanged) ---
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

    const verificationUrl = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${token}`;

    await transporter.sendMail({
      from: `CartoonLK <noreply@cartoonlk.com>`,
      to: user.email,
      subject: "CartoonLK - New Verification Link",
      html: `
  <div style="max-width:500px;margin:auto;background:#ffffff;border-radius:12px;
  border:1px solid #e5e5e5;font-family:Arial, sans-serif;overflow:hidden;">

    <!-- Header -->
    <div style="background:#0A84FF;padding:20px 25px;color:white;text-align:center;">
      <h2 style="margin:0;font-size:22px;">New Verification Link</h2>
    </div>

    <!-- Body -->
    <div style="padding:25px;color:#333;line-height:1.6;">
      <p style="font-size:16px;margin-bottom:12px;">
        Hi <strong>${user.name}</strong>,
      </p>

      <p style="font-size:14px;margin-bottom:22px;">
        You requested a new verification link.
        Please click the button below to verify your CartoonLK account.
      </p>

      <div style="text-align:center;margin:25px 0;">
        <a href="${verificationUrl}"
           style="background:#0A84FF;color:white;padding:12px 22px;border-radius:8px;
           text-decoration:none;font-size:15px;font-weight:bold;display:inline-block;">
           Verify Your Account
        </a>
      </div>

      <p style="font-size:14px;color:#666;">
        This link will expire in <strong>15 minutes</strong>.
      </p>

      <p style="font-size:13px;color:#999;margin-top:20px;">
        If you didn’t request this, you can ignore this email safely.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f1f1f1;padding:12px;text-align:center;
    font-size:11px;color:#777;">
      © ${new Date().getFullYear()} CartoonLK. All rights reserved.
    </div>

  </div>
  `,
    });

    res.status(200).json({ message: "✅ New verification email sent. Please check your inbox." });
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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

const requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "No account found" });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetToken = otp;
    user.resetTokenExpiry = Date.now() + 1000 * 60 * 10;
    await user.save();

    await transporter.sendMail({
      from: `CartoonLK <noreply@cartoonlk.com>`,
      to: user.email,
      subject: "Password Reset Code",
      html: `
  <div style="max-width:480px;margin:auto;background:#ffffff;border-radius:12px;
  border:1px solid #e0e0e0;font-family:Arial, sans-serif;overflow:hidden;">

    <!-- Header -->
    <div style="background:#FF3B30;padding:20px 25px;color:white;text-align:center;">
      <h2 style="margin:0;font-size:22px;">Password Reset Request</h2>
    </div>

    <!-- Body -->
    <div style="padding:25px;color:#333;text-align:center;line-height:1.6;">
      <p style="font-size:15px;margin-bottom:10px;">
        Your verification code is:
      </p>

      <div style="
        background:#fff5f5;
        padding:20px;
        border-radius:10px;
        margin:20px 0;
        font-size:34px;
        font-weight:bold;
        color:#FF3B30;
        letter-spacing:10px;">
        ${otp}
      </div>

      <p style="font-size:14px;color:#666;">
        This code will expire in <strong>10 minutes</strong>.
      </p>

      <p style="font-size:13px;color:#999;margin-top:18px;">
        If you didn’t request this password reset, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="background:#f3f3f3;padding:12px;text-align:center;
    font-size:11px;color:#777;">
      © ${new Date().getFullYear()} CartoonLK. All rights reserved.
    </div>

  </div>
  `,
    });

    res.json({ message: "✅ Verification code sent to your email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

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