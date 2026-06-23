const express = require("express");
const Video = require("../models/Video");
const router = express.Router();

router.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = "https://cartoonlk.com";
    const videos = await Video.find().select("title description thumbnail _id createdAt updatedAt duration");
    const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${videos
      .map(v => `<url><loc>${baseUrl}/watch/${v._id}</loc></url>`)
      .join("")}</urlset>`;
    res.header("Content-Type", "application/xml").send(xml);
  } catch (err) {
    console.error("Sitemap error:", err);
    res.status(500).send("Sitemap generation error");
  }
});

module.exports = router;
