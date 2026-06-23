// routes/userDataRoutes.js
const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 🧠 Get watch history
router.get("/history/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("watchHistory.videoId");
    res.json(
      user.watchHistory.map((h) => ({
        _id: h.videoId?._id,
        title: h.videoId?.title,
        thumbnail: h.videoId?.thumbnail,
      }))
    );
  } catch {
    res.status(500).json({ message: "Failed to load history" });
  }
});

// 🗑 Clear history
router.delete("/history/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { watchHistory: [] });
  res.json({ message: "History cleared" });
});

// ⭐ Get favorites
router.get("/favorites/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("favorites.videoId");
    res.json(
      user.favorites.map((f) => ({
        _id: f.videoId?._id,
        title: f.videoId?.title,
        thumbnail: f.videoId?.thumbnail,
      }))
    );
  } catch {
    res.status(500).json({ message: "Failed to load favorites" });
  }
});

// 🗑 Clear favorites
router.delete("/favorites/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { favorites: [] });
  res.json({ message: "Favorites cleared" });
});

module.exports = router;
