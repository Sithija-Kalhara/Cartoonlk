const express = require("express");
const multer = require("multer");
const {
  registerUser,
  loginUser,
  verifyEmail,
  verifyEmailLogin, // <-- NEW: For 6-digit email code
  uploadProfilePic,
  updateProfile,
  changePassword,
  getUserPreferences,
  logoutAllDevices,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyResetCode,
  logoutSingleDevice,
  getDevices, // <-- Import getDevices controller
} = require("../controllers/authController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

// 📸 Multer setup for profile uploads
const upload = multer({
  dest: "uploads/tmp",
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ---------------------- AUTH ROUTES ---------------------- //
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/login-verify-email", verifyEmailLogin); // <-- NEW
router.get("/verify-email", verifyEmail);
router.post("/resend-verify", resendVerificationEmail);

// ---------------------- PROFILE ROUTES ---------------------- //
router.post("/upload-pic/:userId", auth, upload.single("file"), uploadProfilePic);
router.put("/update/:userId", auth, updateProfile);
router.put("/change-password/:userId", auth, changePassword);
router.get("/preferences/:userId", auth, getUserPreferences);

// ---------------------- DEVICE ROUTES ---------------------- //
router.get("/devices/:userId", auth, getDevices);
router.post("/logout-all/:userId", auth, logoutAllDevices);
router.post("/logout-device/:userId/:deviceId", auth, logoutSingleDevice);

// ---------------------- PASSWORD RESET ---------------------- //
router.post("/request-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-reset-code", verifyResetCode);

module.exports = router;