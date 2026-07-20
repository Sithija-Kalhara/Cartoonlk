import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import NavBar from "./NavBar";
import "./HomePage.css";
import { Helmet } from "react-helmet";

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

// Combined thumbnail URL function (same as Watch.jsx)
const getThumbUrl = (video) => {
  if (!video) return "/fallback.png";

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

  return "/fallback.png";
};

const YearsDetail = () => {
  const { year } = useParams();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch videos from backend
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE}/api/videos`);
        const data = Array.isArray(res.data) ? res.data : res.data?.videos || [];
        const filtered = data
          .filter(
            (v) =>
              v.releaseDate &&
              new Date(v.releaseDate).getFullYear() === Number(year)
          )
          .sort(
            (a, b) =>
              new Date(b.releaseDate || b.createdAt) -
              new Date(a.releaseDate || a.createdAt)
          );
        setVideos(filtered);
      } catch (e) {
        console.error("❌ Error fetching videos:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchVideos();
  }, [year]);

  return (
    <div className="cartoon-container">
      <Helmet>
        <title>{year} Cartoons – Watch Online | CartoonLK</title>
        <meta
          name="description"
          content={`Watch all cartoon and anime releases from ${year} in HD. Stream your favorite shows and movies online at CartoonLK.`}
        />
        <link
          rel="canonical"
          href={`https://cartoonlk.com/years/${encodeURIComponent(year)}`}
        />
      </Helmet>

      <NavBar />

      <div className="movie-section">
        <h2 className="section-title">{year} – All Videos</h2>

        {loading ? (
          <p className="loading">Loading videos...</p>
        ) : videos.length === 0 ? (
          <p className="muted-text">No videos found for {year}.</p>
        ) : (
          <div className="movie-list">
            {videos.map((v) => (
              <div className="movie-card" key={v._id}>
                <Link to={`/watch/${v._id}`}>
                  <div className="thumbnail-wrapper">
                    <img
                      src={getThumbUrl(v)}
                      alt={v.title}
                      className="movie-thumbnail"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = "/fallback.png")}
                    />
                    <span className="tag top-right">{year}</span>
                  </div>
                  <div className="movie-info">
                    <div className="movie-title">{v.title}</div>
                    {v.releaseDate && (
                      <div className="movie-date">
                        Released:{" "}
                        {new Date(v.releaseDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="footer">
        <div className="footer-links">
          <Link to="/about">About</Link> |{" "}
          <Link to="/terms">Terms</Link> |{" "}
          <Link to="/privacy-policy">Privacy</Link>
        </div>
        <div>© {new Date().getFullYear()} Eyerone Team</div>
      </footer>
    </div>
  );
};

export default YearsDetail;