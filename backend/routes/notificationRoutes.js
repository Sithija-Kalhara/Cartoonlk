import express from "express";
import User from "../models/User.js";

const router = express.Router();

// ✅ Save or update notification preferences
router.put("/:id/notifications", async (req, res) => {
  try {
    const { preferences } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.notifications = preferences;
    await user.save();

    res.json({ message: "Preferences updated successfully", preferences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
