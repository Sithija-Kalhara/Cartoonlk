const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema(
  {
    // 🏷️ Basic Info
    title: { type: String, required: true },
    title_si: { type: String }, // 🌐 Sinhala title (optional)
    image: { type: String },
    content: { type: String, required: true },
    content_si: { type: String }, // 🌐 Sinhala content (optional)

    // 🔖 Tag & Type
    tag: {
      type: String,
      enum: ["NEW", "UPDATE", "COMING_SOON"],
      default: "NEW",
    },
    type: {
      type: String,
      enum: ["MOVIE", "SERIES", "SYSTEM", "EVENT"],
      default: "MOVIE",
    },

    // 🧭 Relations
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: false,
    },
    relatedSeries: { type: String },

    // 🕓 Scheduling & Analytics
    publishAt: { type: Date, default: Date.now },
    date: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
    views: { type: Number, default: 0 },

    // 👤 Meta
    author: { type: String, default: "System" },
  },
  { timestamps: true }
);

// ✅ Safe export (avoid OverwriteModelError)
module.exports = mongoose.models.News || mongoose.model("News", newsSchema);
