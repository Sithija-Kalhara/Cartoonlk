const User = require("../models/User");
const Video = require("../models/Video");

/* =========================
   ➕ ADD TO FAVORITES
========================= */
exports.addToFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ message: "videoId required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔒 Prevent duplicates
    if (user.favorites.includes(videoId)) {
      return res.status(200).json({ message: "Already in favorites" });
    }

    user.favorites.push(videoId);
    await user.save();

    return res.status(200).json({
      message: "Added to favorites",
      favorites: user.favorites,
    });
  } catch (err) {
    console.error("❌ Add favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   ➖ REMOVE FROM FAVORITES
========================= */
exports.removeFromFavorites = async (req, res) => {
  try {
    const userId = req.user.id;
    const { videoId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.favorites = user.favorites.filter((id) => id.toString() !== videoId);

    await user.save();

    return res.status(200).json({
      message: "Removed from favorites",
      favorites: user.favorites,
    });
  } catch (err) {
    console.error("❌ Remove favorite error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* =========================
   ⭐ GET MY FAVORITES
========================= */
exports.getMyFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("favorites");

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user.favorites || []);
  } catch (err) {
    console.error("❌ Get favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
