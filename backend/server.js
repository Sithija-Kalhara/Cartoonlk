const express = require("express");
const dotenv = require("dotenv");

// Load .env
dotenv.config();

const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const Video = require("./models/Video");

// API Routes
const videoRoutes = require("./routes/videoRoutes");
const chunkRoutes = require("./routes/chunkRoutes");
const { router: adminRoutes } = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const historyRoutes = require("./routes/historyRoutes");
const newsRoutes = require("./routes/newsRoutes");
const userRoutes = require("./routes/userRoutes");


// Init
const app = express();

/* ============================================================
   🔥 1. DYNAMIC SITEMAPS (Main + Videos + Series + Categories)
   ============================================================ */

/* ============================================================
   🔥 EZOIC ADS.TXT REDIRECT
   ============================================================ */

app.get("/ads.txt", (req, res) => {
  res.redirect(301, "https://srv.adstxtmanager.com/19390/cartoonlk.com");
});

// MAIN SITEMAP INDEX
app.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  res.send(`
    <sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      <sitemap>
        <loc>https://cartoonlk.com/sitemap-videos.xml</loc>
      </sitemap>
      <sitemap>
        <loc>https://cartoonlk.com/sitemap-categories.xml</loc>
      </sitemap>
      <sitemap>
        <loc>https://cartoonlk.com/sitemap-series.xml</loc>
      </sitemap>
    </sitemapindex>
  `);
});

// VIDEO PAGES SITEMAP
app.get("/sitemap-videos.xml", async (req, res) => {
  const videos = await Video.find({});
  const urls = videos
    .map(
      (v) => `
    <url>
      <loc>https://cartoonlk.com/watch/${v._id}</loc>
      <lastmod>${new Date(v.updatedAt).toISOString()}</lastmod>
      <priority>0.9</priority>
    </url>`,
    )
    .join("");

  res.header("Content-Type", "application/xml");
  res.send(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
  );
});

// CATEGORIES SITEMAP
app.get("/sitemap-categories.xml", async (req, res) => {
  const videos = await Video.find({});
  const set = new Set();

  videos.forEach((v) => {
    (Array.isArray(v.category) ? v.category : [v.category]).forEach((c) => {
      if (c) set.add(c);
    });
  });

  const urls = [...set]
    .map(
      (c) => `
    <url>
      <loc>https://cartoonlk.com/category/${encodeURIComponent(c)}</loc>
      <priority>0.7</priority>
    </url>`,
    )
    .join("");

  res.header("Content-Type", "application/xml");
  res.send(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
  );
});

// SERIES SITEMAP
app.get("/sitemap-series.xml", async (req, res) => {
  const videos = await Video.find({});
  const set = new Set();

  videos.forEach((v) => {
    if (v.title && v.season) set.add(v.title);
  });

  const urls = [...set]
    .map(
      (t) => `
    <url>
      <loc>https://cartoonlk.com/series/${encodeURIComponent(t)}</loc>
      <priority>0.8</priority>
    </url>`,
    )
    .join("");

  res.header("Content-Type", "application/xml");
  res.send(
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
  );
});

/* ============================================================
   🔥 2. CORS + API + Middleware
   ============================================================ */

const allowedOrigins = [
  "https://cartoonlk.com",
  "https://www.cartoonlk.com",
  "https://api.cartoonlk.com",
  "https://cartoonlk.vercel.app",
  "http://localhost:5173",
  "http://localhost:5000",
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // ❌ Blocked by CORS (bot request)
      // console.log("❌ Blocked by CORS:", origin); // LOG REMOVED
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "chunkindex",
    "filename",
    "Accept",
    "Origin",
    "X-Requested-With",
  ],
  credentials: true,
};

app.use(cors(corsOptions));
app.options(/^\/.*/, cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Connect MongoDB
connectDB();

/* ============================================================
   🔥 3. REAL API ROUTES
   ============================================================ */

app.use("/api/videos", videoRoutes);
app.use("/api/chunks", chunkRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/videos", historyRoutes);
app.use("/api/news", newsRoutes);
app.use("/uploads", express.static("uploads"));
app.use("/api/users", userRoutes);

const express = require("express");
const dotenv = require("dotenv");



/* ============================================================
   🔥 HEALTH CHECK ENDPOINT
   ============================================================ */

app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

/* ============================================================
   🔥 5. SERVER START
   ============================================================ */

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
