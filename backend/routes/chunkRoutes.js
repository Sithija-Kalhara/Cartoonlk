const express = require("express");
const fs = require("fs");
const path = require("path");
const { Upload } = require("@aws-sdk/lib-storage");
const multer = require("multer");
const r2 = require("../config/r2");


const router = express.Router();
const upload = multer();

const UPLOAD_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ✅ Step 1: Upload a single chunk
router.post("/upload-chunk", (req, res) => {
  const chunkIndex = req.headers["chunkindex"];
  const filename = decodeURIComponent(req.headers["filename"]);

  if (!chunkIndex || !filename) {
    return res.status(400).json({ error: "Missing headers" });
  }

  const tempPath = path.join(UPLOAD_DIR, `${filename}-${chunkIndex}`);
  const writeStream = fs.createWriteStream(tempPath);

  req.pipe(writeStream);

  writeStream.on("finish", () => res.json({ status: "ok", chunk: chunkIndex }));
  writeStream.on("error", (err) => {
    console.error("❌ Chunk write error:", err);
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    res.status(500).json({ error: "Chunk write failed" });
  });
});

// ✅ Step 2: Merge chunks + upload to R2
router.post("/merge-chunks", upload.none(), async (req, res) => {
  try {
    const { filename } = req.body;
    if (!filename) {
      return res.status(400).json({ error: "Missing filename" });
    }

    const finalPath = path.join(UPLOAD_DIR, filename);
    const writeStream = fs.createWriteStream(finalPath);

    const chunkFiles = fs.readdirSync(UPLOAD_DIR).filter((f) => f.startsWith(`${filename}-`));
    const sortedChunks = chunkFiles.sort((a, b) => {
      const indexA = parseInt(a.split("-").pop());
      const indexB = parseInt(b.split("-").pop());
      return indexA - indexB;
    });

    await new Promise((resolve, reject) => {
      let i = 0;
      const mergeNext = () => {
        if (i >= sortedChunks.length) {
          writeStream.end(resolve);
          return;
        }
        const chunkFile = sortedChunks[i];
        const chunkPath = path.join(UPLOAD_DIR, chunkFile);
        const readStream = fs.createReadStream(chunkPath);
        readStream.pipe(writeStream, { end: false });
        readStream.on("end", () => {
          fs.unlinkSync(chunkPath);
          i++;
          mergeNext();
        });
        readStream.on("error", reject);
      };
      mergeNext();
    });

    const uniqueKey = `${Date.now()}-${filename}`;
    const parallelUploads3 = new Upload({
      client: r2,
      params: {
        Bucket: process.env.R2_BUCKET,
        Key: uniqueKey,
        Body: fs.createReadStream(finalPath),
        ContentType: "video/mp4",
      },
    });
    await parallelUploads3.done();
    fs.unlinkSync(finalPath);

    res.json({ status: "completed", filename: uniqueKey });
  } catch (err) {
    console.error("❌ Merge failed:", err);
    res.status(500).json({ error: "Merge failed", details: err.message });
  }
});

module.exports = router;