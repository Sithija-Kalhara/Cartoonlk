const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Video = require("../models/Video");

// 🧩 Add to history (FIXED)
router.post("/add/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;

    const exists = await User.exists({ _id: userId });
    if (!exists) return res.status(404).json({ message: "User not found" });

    // --- THIS IS THE FIX ---

    // Step 1: Remove any existing entry for this video
    await User.findByIdAndUpdate(
      userId,
      {
        $pull: { watchHistory: { videoId } }
      }
    );

    // Step 2: Add the new entry to the beginning of the array
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          watchHistory: {
            $each: [{ videoId }],
            $position: 0
          }
        }
      },
      { new: true }
    );
    // --- END OF FIX ---

    res.json({ message: "History updated" });
  } catch (err) {
    console.error("❌ history add error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



//  Get history
router.get("/history/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("watchHistory.videoId")
      .lean();

    const history = (user?.watchHistory || [])
      .map((h) => {
        if (!h.videoId) return null;

        // 🧮 Calculate progress %
        // NOTE: Your user schema has 'time' but your video schema has 'duration'
        // This logic seems to reference a 'duration' on the history item, 
        // but your schema doesn't have it. Let's use the video's duration.
        const duration = h.videoId.duration; // Assuming duration is in seconds
        const time = h.time || 0; // Time is in seconds
        
        // Convert duration (like "42m") to seconds
        let durationInSeconds = 0;
        if (duration) {
          const match = duration.match(/(\d+)m/);
          if (match) {
            durationInSeconds = parseInt(match[1]) * 60;
          } else {
            durationInSeconds = parseInt(duration); // assume it's already seconds
          }
        }

        const progress =
          durationInSeconds > 0 ? Math.min((time / durationInSeconds) * 100, 100) : 0;

        return {
          _id: h.videoId._id,
          title: h.videoId.title,
          thumbnail: h.videoId.thumbnail,
          landscapeThumbnail: h.videoId.landscapeThumbnail,
          season: h.videoId.season,
          episode: h.videoId.episode,
          progress,
        };
      })
      .filter(Boolean); // Remove any nulls

    res.json(history);
  } catch (err) {
    console.error("Get history error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


//  Get favorites
router.get("/favorites/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .populate("favorites.videoId")
      .lean();

    const favs = (user?.favorites || [])
      .map((f) => {
        if (!f.videoId) return null; // Add safety check
        return {
        _id: f.videoId._id,
        title: f.videoId.title,
        thumbnail: f.videoId.thumbnail,
        landscapeThumbnail: f.videoId.landscapeThumbnail,
        season: f.videoId.season,
        episode: f.videoId.episode,
      }
    })
    .filter(Boolean); // Remove nulls

    res.json(favs);
  } catch (err) {
    console.error("Get favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🗑 Clear history
router.delete("/history/:userId", async (req, res) => {
  await User.findByIdAndUpdate(req.params.userId, { watchHistory: [] });
  res.json({ message: "History cleared" });
});

// 🗑 Clear favorites
router.delete("/favorites/:userId", async (req, res) => {
  await User.findByIdAndUpdate(req.params.userId, { favorites: [] });
  res.json({ message: "Favorites cleared" });
});



// 🟢 Save progress + auto-remove when fully watched
router.post("/progress", async (req, res) => {
  const { userId, videoId, time, duration, autoRemovePrev, prevVideoId } = req.body;
  if (!userId || !videoId)
    return res.status(400).json({ message: "Missing data" });

  try {
    // if finished watching (95%+)
    // Note: 'duration' here is sent from the frontend player
    if (duration && time >= duration * 0.95) {
      await User.updateOne(
        { _id: userId },
        { $pull: { watchHistory: { videoId } } }
      );
      return res.json({ message: "Removed from history (fully watched)" });
    }

    // update or insert progress
    // We update 'time' in the watchHistory array
    const updated = await User.updateOne(
      { _id: userId, "watchHistory.videoId": videoId },
      { $set: { "watchHistory.$.time": time, "watchHistory.$.watchedAt": new Date() } }
    );

    if (updated.matchedCount === 0) {
      await User.updateOne(
        { _id: userId },
        {
          $push: {
            watchHistory: {
              $each: [{ videoId, time, watchedAt: new Date() }],
              $position: 0,
            },
          },
        }
      );
    }

    // ✅ If playing next episode, remove previous
    if (autoRemovePrev && prevVideoId) {
      await User.updateOne(
        { _id: userId },
        { $pull: { watchHistory: { videoId: prevVideoId } } }
      );
      console.log("🧹 Previous episode auto-removed");
    }

    res.json({ message: "Progress saved" });
  } catch (err) {
    console.error("❌ progress save error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// 🟢 Get progress
router.get("/progress/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existing = user.watchHistory.find(h => h.videoId.toString() === videoId);
    res.json({ time: existing?.time || 0 });
  } catch(err) {
    console.error("❌ get progress error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🗑 Remove single video from history (atomic)
router.delete("/history/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    await User.updateOne(
      { _id: userId },
      { $pull: { watchHistory: { videoId } } }
    );
    res.json({ message: "Video removed from history" });
  } catch (err) {
    console.error("❌ remove history error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🗑 Remove single video from favorites (atomic)
router.delete("/favorites/:userId/:videoId", async (req, res) => {
  try {
    const { userId, videoId } = req.params;
    await User.updateOne(
      { _id: userId },
      { $pull: { favorites: { videoId } } }
    );
    res.json({ message: "Video removed from favorites" });
  } catch (err) {
    console.error("❌ remove favorites error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;