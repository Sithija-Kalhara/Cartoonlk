const News = require("../models/news.js");

/* ---------------------------------------------
 * 📰 CREATE NEWS (manual admin create)
 * --------------------------------------------- */
const createNews = async (req, res) => {
  try {
    const news = new News(req.body);
    await news.save();
    res.json(news);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/* ---------------------------------------------
 * 🤖 AUTO-CREATE when called from videoController
 * --------------------------------------------- */
const autoCreateNews = async (video) => {
  try {
    // 🧠 Avoid duplicate news for same video
    const exists = await News.findOne({ videoId: video._id });
    if (exists) {
      console.log("⚠️ News already exists for:", video.title);
      return;
    }

    let newsTitle = "";
    let newsContent = "";
    let newsTag = "NEW";
    let newsType = "MOVIE";

    if (video.season && Number(video.episode) === 1) {
      // First episode of a new season
      newsTitle = `New Season Added: ${video.title} (Season ${video.season})`;
      newsContent = `A brand new season of ${video.title} has been added to CartoonLK! Watch Season ${video.season} now in Sinhala Dub.`;
      newsTag = "UPDATE";
      newsType = "SERIES";
    } else if (!video.season) {
      // Movie
      newsTitle = `New Movie Added: ${video.title}`;
      newsContent = `${video.title} is now streaming on CartoonLK! Enjoy the Sinhala Dub version in HD.`;
      newsTag = "NEW";
      newsType = "MOVIE";
    } else {
      // Skip middle episodes
      return;
    }

    await News.create({
      title: newsTitle,
      image: video.thumbnail || video.landscapeThumbnail || "",
      content: newsContent,
      tag: newsTag,
      type: newsType,
      relatedSeries: video.title,
      videoId: video._id,
      author: "System",
      publishAt: new Date(),
    });

    console.log("📰 Auto-news created for:", video.title);
  } catch (err) {
    console.error("❌ Auto-news creation failed:", err);
  }
};

/* ---------------------------------------------
 * 📜 GET ALL NEWS (with filter & pagination)
 * --------------------------------------------- */
const getAllNews = async (req, res) => {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const now = new Date();

    const filter = {
      publishAt: { $lte: now }, // Only published ones
      $or: [
        { title: new RegExp(q, "i") },
        { content: new RegExp(q, "i") },
        { relatedSeries: new RegExp(q, "i") },
      ],
    };

    const news = await News.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------------------------
 * 🔍 GET SINGLE NEWS (and increment view count)
 * --------------------------------------------- */
const getNewsById = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!news) return res.status(404).json({ error: "Not found" });
    res.json(news);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ---------------------------------------------
 * 📈 GET TRENDING NEWS (Top by views)
 * --------------------------------------------- */
const getTrendingNews = async (req, res) => {
  try {
    const topNews = await News.find({ publishAt: { $lte: new Date() } })
      .sort({ views: -1 })
      .limit(5);
    res.json(topNews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createNews,
  autoCreateNews,
  getAllNews,
  getNewsById,
  getTrendingNews,
};
