const express = require("express");
const {
  createNews,
  autoCreateNews,
  getAllNews,
  getNewsById,
  getTrendingNews,
} = require("../controllers/newsController");
const router = express.Router();

// ➕ Admin manual create
router.post("/", createNews);

// 📜 All news (search, pagination, filter)
router.get("/", getAllNews);

// 🔍 Single news + view counter
router.get("/:id", getNewsById);

// 🔥 Trending (top 5)
router.get("/trending/list", getTrendingNews);

module.exports = router;
