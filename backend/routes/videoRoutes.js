const express = require("express");
const multer = require("multer");
const {
  saveAndMerge,
  getAllVideos,
  getOneVideo,
  getVideo,
  streamVideo,
  getSubtitle,
  searchVideos,
  getFile,
} = require("../controllers/videoController");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.options("/save", (req, res) => {
  const origin = req.headers.origin;
  res.header("Access-Control-Allow-Origin", origin || "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, chunkindex, filename, Accept, Origin, X-Requested-With"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  return res.sendStatus(200);
});

// ✅ SPECIFIC ROUTES (no :id params) - MUST COME FIRST
router.post("/save", upload.fields([
  { name: "thumbnail", maxCount: 1 },
  { name: "landscapeThumbnail", maxCount: 1 },
  { name: "photo1", maxCount: 1 },
  { name: "photo2", maxCount: 1 },
  { name: "photo3", maxCount: 1 },
  { name: "photo4", maxCount: 1 },
  { name: "actorPhoto", maxCount: 20 },
  { name: "dubberPhoto", maxCount: 20 },
  { name: "subtitle", maxCount: 1 },
]), saveAndMerge);

router.get("/", getAllVideos);
router.get("/search", searchVideos);
router.get("/file/:filename", getFile);
router.get("/stream/:filename", streamVideo);
router.get("/subtitle/:filename", getSubtitle);

// ❌ DYNAMIC ROUTE - MUST BE LAST
router.get("/:id", getOneVideo);

module.exports = router;