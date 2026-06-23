const { GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { Upload } = require("@aws-sdk/lib-storage");
const r2 = require("../config/r2");
const Video = require("../models/Video");
const { autoCreateNews } = require("./newsController");


const PUBLIC_CDN = process.env.PUBLIC_CDN || "https://media.cartoonlk.com";

/* ----------------------------------------
    Save & Merge (Uploads + Direct URLs)
---------------------------------------- */
exports.saveAndMerge = async (req, res) => {
  try {
    console.log("📥 Incoming upload request...");
    console.log("➡️  Form fields:", Object.keys(req.body));
    console.log("➡️  Files received:", Object.keys(req.files || {}));

    const files = req.files || {};
    const qualities = [];

    // Initialize file field map
    const fieldMap = {
      thumbnail: null,
      landscapeThumbnail: null,
      photo1: null,
      photo2: null,
      photo3: null,
      photo4: null,
      actorPhoto: [],
      dubberPhoto: [],
      subtitle: null,
    };

    // ✅ Upload helper
// ✅ Safe uploader with null check
const uploadFile = async (file) => {
  if (!file || !file.buffer) {
    console.warn("⚠️ Skipping upload: no file buffer provided");
    return null;
  }

  const uniqueName = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
  try {
    const uploader = new Upload({
      client: r2,
      params: {
        Bucket: process.env.R2_BUCKET,
        Key: uniqueName,
        Body: file.buffer,
        ContentType: file.mimetype,
      },
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
    });

    await uploader.done();
    return `${PUBLIC_CDN}/${uniqueName}`;
  } catch (err) {
    console.error("❌ R2 upload failed:", err.message);
    return null;
  }
};



    /* ------------------------------
        1. Upload image/subtitle files
    ------------------------------ */
  // Skip upload if user only provides URLs
for (const key in files) {
  const fileArr = files[key];
  if (!fileArr || fileArr.length === 0) continue;

  // If URL provided already, skip file upload
  if (req.body[`${key}Link`]) {
    console.log(`🔗 Skipping upload for ${key}, using direct link`);
    continue;
  }

  // Otherwise upload file
  if (key === "actorPhoto" || key === "dubberPhoto") {
    fieldMap[key] = [];
    for (const file of fileArr) {
      const uploadedUrl = await uploadFile(file);
      fieldMap[key].push(uploadedUrl);
    }
  } else {
    fieldMap[key] = await uploadFile(fileArr[0]);
  }
}

    /* ------------------------------
        2. Handle direct URLs (fallback)
    ------------------------------ */
    const qualityLabels = {
      video4KLink: "4K",
      video1080pLink: "1080p",
      video720pLink: "720p",
      video480pLink: "480p",
    };
    for (const key of Object.keys(qualityLabels)) {
      if (req.body[key]) {
        qualities.push({ label: qualityLabels[key], filename: req.body[key] });
      }
    }

    // Other links fallback
    const directFields = [
      "thumbnail",
      "landscapeThumbnail",
      "photo1",
      "photo2",
      "photo3",
      "photo4",
      "subtitle",
    ];
    for (const f of directFields) {
      const linkKey = `${f}Link`;
      if (req.body[linkKey]) fieldMap[f] = req.body[linkKey];
    }

    /* ------------------------------
        3. Save to MongoDB
    ------------------------------ */

    let parsedActors = [];
let parsedDubbing = [];

try {
  parsedActors = typeof req.body.actors === "string" ? JSON.parse(req.body.actors) : req.body.actors;
} catch (e) {
  console.warn("⚠️ Failed to parse actors JSON:", e.message);
}

try {
  parsedDubbing = typeof req.body.dubbing === "string" ? JSON.parse(req.body.dubbing) : req.body.dubbing;
} catch (e) {
  console.warn("⚠️ Failed to parse dubbing JSON:", e.message);
}


    const newVideo = new Video({
      title: req.body.title?.trim() || "Untitled",
      name: req.body.name?.trim() || "",
      category: req.body.category
        ? req.body.category.split(",").map((c) => c.trim())
        : [],
      country: req.body.country
        ? (Array.isArray(req.body.country)
            ? req.body.country
            : req.body.country.split(",").map((c) => c.trim()))
        : [],
      duration: req.body.duration || "",
      imdbRating: Number(req.body.imdbRating) || 0,
      tags: req.body.tags
        ? req.body.tags.split(",").map((t) => t.trim())
        : [],
      releaseDate: req.body.releaseDate || "",
      season: req.body.season ? Number(req.body.season) : null,
      episode: req.body.episode ? Number(req.body.episode) : null,
      qualities,
      thumbnail: fieldMap.thumbnail,
      landscapeThumbnail: fieldMap.landscapeThumbnail,
      subtitle: fieldMap.subtitle,
      photo1: fieldMap.photo1,
      description1: req.body.description1 || "",
      photo2: fieldMap.photo2,
      description2: req.body.description2 || "",
      photo3: fieldMap.photo3,
      description3: req.body.description3 || "",
      photo4: fieldMap.photo4,
      description4: req.body.description4 || "",
      warning: req.body.warning || "",
      qualityNotice: req.body.qualityNotice || "",
      downloadLink: req.body.downloadLink || "",
      dubbing: req.body.dubbing || "",
      actorPhoto: fieldMap.actorPhoto,
      dubberPhoto: fieldMap.dubberPhoto,
      trailer: req.body.trailerLink || "",

        actors: parsedActors,
        dubbing: parsedDubbing,
    });

    console.log("🧩 Prepared new video:", newVideo.title);
    
    const saved = await newVideo.save();
    console.log("✅ Successfully saved to MongoDB:", saved._id);

    await autoCreateNews(saved);



    return res
    .status(200)
    .json({ message: "🎉 Video uploaded successfully!", video: saved });
  } catch (err) {
    console.error("❌ Upload error:", err);
    return res
      .status(500)
      .json({ error: "Upload failed", details: err.message });
  }
};



/* ----------------------------------------
    Get Signed URL for any file
---------------------------------------- */
exports.getVideo = async (req, res) => {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: req.params.filename,
    });
    const url = await getSignedUrl(r2, command, { expiresIn: 3600 });
    res.json({ url });
  } catch (err) {
    console.error("❌ Signed URL error:", err);
    res.status(404).json({ error: "File not found" });
  }
};


/* ----------------------------------------
    Stream video via signed URL redirect
---------------------------------------- */
exports.streamVideo = async (req, res) => {
  try {
    const range = req.headers.range;
    if (!range) return res.status(400).send("Range header required");

    // ✅ decodeURIComponent to handle spaces and special chars
    const key = decodeURIComponent(req.params.filename);

    console.log("🎬 [R2 Stream] Requested key:", key);

    const match = range.match(/bytes=(\d+)-(\d*)/);
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start + 4 * 1024 * 1024; // 4MB chunks

    const byteRange = `bytes=${start}-${end}`;

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
      Range: byteRange,
    });

    const video = await r2.send(command);

    res.writeHead(206, {
      "Content-Range": video.ContentRange || byteRange,
      "Accept-Ranges": "bytes",
      "Content-Length": video.ContentLength || end - start + 1,
      "Content-Type": video.ContentType || "video/mp4",
      "Cache-Control": "public, max-age=0, no-cache",
      "Connection": "keep-alive",
      "Cross-Origin-Resource-Policy": "cross-origin",
    });

    video.Body.pipe(res);
  } catch (err) {
    console.error("❌ Stream error:", err.Code || err.message);
    console.error("🧩 Tried Key:", req.params.filename);

    // Friendly error response
    if (err.Code === "NoSuchKey") {
      return res.status(404).json({
        error: "File not found on R2",
        hint: "Check if file name or path matches uploaded key exactly (case-sensitive)",
      });
    }

    res.status(500).json({ error: "Stream failed", details: err.message });
  }
};




/* ----------------------------------------
    Get all videos (with filters)
---------------------------------------- */
exports.getAllVideos = async (req, res) => {
  try {
    const filter = {};

    /* 🔍 Title search (?title=Legend) */
    if (req.query.title) {
      filter.title = {
        $regex: new RegExp(req.query.title.trim(), "i"),
      };
    }

    /* 🏷️ SINGLE TAG filter (?tag=Fantasy) */
    if (req.query.tag) {
      filter.tags = {
        $elemMatch: {
          $regex: new RegExp(`^${req.query.tag.trim()}$`, "i"),
        },
      };
    }

    /* 🏷️ MULTI TAG filter (?tags=Fantasy,Adventure) */
    if (req.query.tags) {
      const tagsArray = req.query.tags
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      if (tagsArray.length) {
        filter.tags = {
          $in: tagsArray.map(
            t => new RegExp(`^${t}$`, "i")
          ),
        };
      }
    }

    console.log("🎯 Video filter:", filter);

    const videos = await Video.find(filter)
      .sort({ createdAt: -1 })
      .select(`
        _id
        title
        name
        trailer
        thumbnail
        landscapeThumbnail
        tags
        category
        season
        episode
        imdbRating
        releaseDate
        createdAt
        description1
      `);

    res.status(200).json({
      success: true,
      count: videos.length,
      videos,
    });
  } catch (err) {
    console.error("❌ Error fetching videos:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};




/* ----------------------------------------
    Get single video by ID
---------------------------------------- */
exports.getOneVideo = async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Add ObjectId validation
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ error: "Video not found" });
    }
    
    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    
    res.status(200).json(video);
  } catch (err) {
    console.error("❌ Error fetching video:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

/* ----------------------------------------
    Serve subtitle file (SRT/VTT)
---------------------------------------- */
exports.getSubtitle = async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.filename);


    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const file = await r2.send(command);

    res.setHeader("Content-Type", "text/vtt; charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");

    file.Body.pipe(res);
  } catch (err) {
    console.error("❌ Subtitle stream error:", err);
    res.status(404).json({ error: "Subtitle not found" });
  }
};


/* ----------------------------------------
    Search Videos (thumbnail + landscape)
---------------------------------------- */
exports.searchVideos = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);

    console.log("🔎 Search query:", q);

    const regex = new RegExp(q, "i");

    const videos = await Video.find({
      $or: [
        { title: regex },
        { name: regex },
        { tags: { $regex: regex } },
      ],
    }).select("title name thumbnail landscapeThumbnail createdAt");

    console.log("✅ Found videos:", videos.length);

    const cdn = (process.env.PUBLIC_CDN || "").replace(/\/+$/, "");

    const mapped = videos.map((v) => ({
      _id: v._id,
      title: v.title || "",
      name: v.name || "",
      createdAt: v.createdAt || null,
      thumbnail: v.thumbnail
        ? v.thumbnail.startsWith("http")
          ? v.thumbnail
          : `${cdn}/${v.thumbnail.replace(/^\/+/, "")}`
        : "",
      landscapeThumbnail: v.landscapeThumbnail
        ? v.landscapeThumbnail.startsWith("http")
          ? v.landscapeThumbnail
          : `${cdn}/${v.landscapeThumbnail.replace(/^\/+/, "")}`
        : "",
    }));

    res.json(mapped);
  } catch (err) {
    console.error("❌ Search error:", err);
    res.status(500).json({ error: "Server error" });
  }
};




/* ----------------------------------------
   Proxy image / thumbnail through backend
---------------------------------------- */
exports.getFile = async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.filename);

    console.log("🖼️ Proxying file from R2:", key);

    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    });

    const file = await r2.send(command);

    res.setHeader("Content-Type", file.ContentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=31536000");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    file.Body.pipe(res);
  } catch (err) {
    console.error("❌ File proxy error:", err.Code || err.message);
    res.status(404).json({ error: "File not found" });
  }
};
