const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const {
  addToFavorites,
  removeFromFavorites,
  getMyFavorites,
} = require("../controllers/favoriteController");

router.get("/favorites", auth, getMyFavorites);
router.post("/favorites", auth, addToFavorites);
router.delete("/favorites/:videoId", auth, removeFromFavorites);

module.exports = router;
