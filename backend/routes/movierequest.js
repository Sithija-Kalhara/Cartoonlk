const express = require("express");
const router = express.Router();

const { createMovieRequest } = require("../controllers/movieRequestController");
const authMiddleware = require("../middleware/authMiddleware");

// 🎬 Movie request API
router.post("/movie-request", authMiddleware, createMovieRequest);

module.exports = router;
