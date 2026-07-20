import React, { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import NavBar from "./NavBar";
import "./Years.css";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const PUBLIC_CDN = import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com";

// 🔗 URL helpers
const streamUrl = (name = "") => {
  if (!name) return "";
  if (name.startsWith("http://") || name.startsWith("https://")) {
    return name;
  }
  return `${PUBLIC_CDN}/${encodeURIComponent(name)}`;
};

const anyFileUrl = (p = "") => {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) {
    return p;
  }
  return `${BASE}/api/videos/file/${encodeURIComponent(p)}`;
};

// Combined thumbnail URL function (same as Watch.jsx)
const getThumbUrl = (video) => {
  if (!video) return "";

  // 1. Database එකේ thumbnail එකට සම්පූර්ණ URL එකක් (http:// හෝ https://) තිබේ නම්
  if (video.landscapeThumbnail && (video.landscapeThumbnail.startsWith("http://") || video.landscapeThumbnail.startsWith("https://"))) {
    return video.landscapeThumbnail;
  }
  if (video.thumbnail && (video.thumbnail.startsWith("http://") || video.thumbnail.startsWith("https://"))) {
    return video.thumbnail;
  }

  // 2. නැතහොත් එය PUBLIC_CDN එකෙන් හෝ වෙනත් ෆයිල් නමකින් එනවා නම්
  if (video.landscapeThumbnail) {
    return streamUrl(video.landscapeThumbnail);
  }
  if (video.thumbnail) {
    return streamUrl(video.thumbnail);
  }

  // 3. Telegram file_id එකකින් නම්
  if (video.thumbnailFileId && video.channelId) {
    return `${BASE}/api/videos/thumbnail/${video.channelId}/${video.thumbnailFileId}`;
  }

  return "/placeholder.jpg";
};

export default function CategoryPage() {
  const { category } = useParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const scrollRefs = useRef([]);

  // 🧩 Fetch videos
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const res = await axios.get(`${BASE}/api/videos`);
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.videos || [];
        setVideos(data);
      } catch (err) {
        console.error("❌ Error fetching videos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, []);

  // 🧩 Group episodes by title
  const seriesByName = useMemo(() => {
    const map = {};
    videos.forEach((v) => {
      if (v.season && Number(v.season) >= 1) {
        if (!map[v.title]) map[v.title] = [];
        map[v.title].push(v);
      }
    });
    Object.values(map).forEach((eps) =>
      eps.sort(
        (a, b) =>
          (a.season || 0) - (b.season || 0) ||
          (a.episode || 0) - (b.episode || 0)
      )
    );
    return map;
  }, [videos]);

  // 🧩 Unique titles only
  const getUniqueSeries = (arr) => {
    const seen = new Set();
    return arr.filter((v) => {
      if (v.season && Number(v.season) >= 1) {
        if (seen.has(v.title)) return false;
        seen.add(v.title);
        return true;
      }
      return true;
    });
  };

  // 🧩 Group videos by category
  const videosByCategory = useMemo(() => {
    const deduped = getUniqueSeries(videos);
    const grouped = deduped.reduce((acc, v) => {
      // If no category, use "Uncategorized"
      const cat = v.category || "Uncategorized";
      (acc[cat] ||= []).push(v);
      return acc;
    }, {});
    
    // Sort videos within each category
    Object.keys(grouped).forEach((cat) =>
      grouped[cat].sort(
        (a, b) =>
          new Date(b.releaseDate || b.createdAt) -
          new Date(a.releaseDate || a.createdAt)
      )
    );
    
    // Get sorted category names
    const categories = Object.keys(grouped).sort((a, b) => {
      // Put "Uncategorized" at the end
      if (a === "Uncategorized") return 1;
      if (b === "Uncategorized") return -1;
      return a.localeCompare(b);
    });
    
    return { grouped, categories };
  }, [videos]);

  // Filter videos by selected category
  const categoryVideos = useMemo(() => {
    if (!category) return [];
    return videosByCategory.grouped[category] || [];
  }, [category, videosByCategory]);

  // 🧩 Series by season
  const seriesBySeason = useMemo(() => {
    if (!selectedSeries) return {};
    return selectedSeries.reduce((acc, v) => {
      const s = v.season || 1;
      (acc[s] ||= []).push(v);
      acc[s].sort((a, b) => (a.episode || 0) - (b.episode || 0));
      return acc;
    }, {});
  }, [selectedSeries]);

  // 🧩 Open popup
  const handleSeriesClick = (title) => {
    const series = seriesByName[title];
    if (series && series.length > 0) {
      setSelectedSeries(series);
      const seasons = Array.from(new Set(series.map((v) => v.season || 1))).sort(
        (a, b) => a - b
      );
      setSelectedSeason(seasons.includes(1) ? 1 : seasons[0]);
    }
  };

  const handleCloseModal = () => setSelectedSeries(null);

  // 🧩 Auto-scroll for category view
  useEffect(() => {
    if (category) return;
    const id = setInterval(() => {
      scrollRefs.current.forEach((el) => {
        if (!el) return;
        el.scrollLeft += 1;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth) el.scrollLeft = 0;
      });
    }, 20);
    return () => clearInterval(id);
  }, [category]);

  return (
    <div className="cartoon-container">
      <NavBar />

      {loading ? (
        <div style={{ color: "#aaa", padding: 20 }}>Loading…</div>
      ) : category ? (
        // ✅ /category/:category
        <div className="movie-section">
          <h2 className="section-title">{category} – All Videos</h2>
          {categoryVideos.length === 0 ? (
            <p style={{ color: "#aaa", padding: "20px 0" }}>
              No videos found in this category.
            </p>
          ) : (
            categoryVideos.map((v) => {
              const isSeries = v.season && Number(v.season) >= 1;
              return (
                <div
                  key={v._id}
                  className="movie-card"
                  onClick={() =>
                    isSeries
                      ? handleSeriesClick(v.title)
                      : (window.location.href = `/watch/${v._id}`)
                  }
                >
                  <div className="thumbnail-wrapper">
                    <img
                      src={getThumbUrl(v)}
                      alt={v.title}
                      className="movie-thumbnail"
                      onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                    />
                    <span className="tag top-right">{v.category || "Uncategorized"}</span>
                  </div>
                  <div className="movie-info">
                    <div className="movie-title">{v.title}</div>
                    {isSeries && (
                      <p style={{ fontSize: "12px", opacity: 0.7 }}>
                        TV Series • {seriesByName[v.title]?.length || 0} Episodes
                      </p>
                    )}
                    {!isSeries && v.releaseDate && (
                      <p style={{ fontSize: "12px", opacity: 0.7 }}>
                        Released:{" "}
                        {new Date(v.releaseDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        // ✅ /category (all categories view)
        videosByCategory.categories.map((cat, idx) => (
          <div className="movie-section" key={cat}>
            <h2 className="section-title">
              <Link to={`/category/${encodeURIComponent(cat)}`}>{cat}</Link>
            </h2>
            <div
              className="movie-list"
              ref={(el) => (scrollRefs.current[idx] = el)}
            >
              {videosByCategory.grouped[cat].map((v) => {
                const isSeries = v.season && Number(v.season) >= 1;
                return (
                  <div
                    key={v._id}
                    className="movie-card"
                    onClick={() =>
                      isSeries
                        ? handleSeriesClick(v.title)
                        : (window.location.href = `/watch/${v._id}`)
                    }
                  >
                    <div className="thumbnail-wrapper">
                      <img
                        src={getThumbUrl(v)}
                        alt={v.title}
                        className="movie-thumbnail"
                        onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                      />
                      <span className="tag top-right">{cat}</span>
                    </div>
                    <div className="movie-info">
                      <div className="movie-title">{v.title}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* ================= SERIES POPUP ================= */}
      {selectedSeries && (
        <div
          className="series-modal"
          onClick={(e) => {
            if (e.target.classList.contains("series-modal")) handleCloseModal();
          }}
        >
          <div
            className="series-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="series-hero">
              <img
                src={getThumbUrl(selectedSeries[0])}
                alt={selectedSeries[0].title}
                className="series-banner"
                onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
              />
              <div className="series-hero-overlay">
                <h2>{selectedSeries[0].title}</h2>
                <Link
                  to={`/watch/${selectedSeries[0]._id}`}
                  className="play-btn-main"
                >
                  ▶ Watch Now
                </Link>
              </div>
            </div>

            <div className="series-meta">
              <span>{Object.keys(seriesBySeason).length} Seasons</span>
            </div>

            <div className="season-selector">
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
              >
                {Object.keys(seriesBySeason).map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="episode-list">
              {seriesBySeason[selectedSeason]?.map((ep) => (
                <div key={ep._id} className="episode-card">
                  <Link to={`/watch/${ep._id}`} className="episode-thumb">
                    <img
                      src={getThumbUrl(ep) || getThumbUrl(selectedSeries[0])}
                      alt={ep.name || `Episode ${ep.episode}`}
                      onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                    />
                  </Link>
                  <div className="episode-info">
                    <h4>
                      {ep.episode
                        ? `E${ep.episode}: ${ep.name}`
                        : ep.name || "Episode"}
                    </h4>
                    <p>{ep.description1 || "No description available."}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= FOOTER ================= */}
      <footer className="footer">
        <div className="footer-links">
          <Link to="/about">About</Link> | <Link to="/terms">Terms</Link> |{" "}
          <Link to="/privacy-policy">Privacy</Link>
        </div>
        <div>© {new Date().getFullYear()} Eyerone Team</div>
      </footer>
    </div>
  );
}