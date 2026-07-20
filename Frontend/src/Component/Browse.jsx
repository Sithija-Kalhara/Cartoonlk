import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import "./Browse.css";
import NavBar from "./NavBar.jsx";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const PUBLIC_CDN = import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com";

/* ---------- URL helpers (encode safe) ---------- */
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

// Combined thumbnail URL function (similar to Watch.jsx)
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

  return "";
};

export default function Browse() {
  const { search } = useLocation();
  const tag = new URLSearchParams(search).get("tag");

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tag) return;

    setLoading(true);

    axios
      .get(`${BASE}/api/videos?tag=${encodeURIComponent(tag)}`)
      .then(res => {
        if (Array.isArray(res.data.videos)) {
          setVideos(res.data.videos);
        } else {
          setVideos([]);
        }
      })
      .catch(err => {
        console.error("❌ Browse fetch error:", err);
        setVideos([]);
      })
      .finally(() => setLoading(false));
  }, [tag]);

  return (
    <div className="browse-page">
      <NavBar />
      <h2>Tag: {tag}</h2>

      {loading && <p>Loading...</p>}

      {!loading && videos.length === 0 && (
        <p>No videos found for this tag.</p>
      )}

      <div className="video-grid">
        {videos.map(v => (
          <Link key={v._id} to={`/watch/${v._id}`} className="video-card">
            <img
              src={getThumbUrl(v)}
              alt={v.title}
              loading="lazy"
              onError={(e) => {
                // Fallback image if thumbnail fails to load
                e.target.src = "";
                e.target.style.display = "none";
              }}
            />

            <div className="video-info">
              <h4>{v.title}</h4>

              <div className="meta">
                {v.imdbRating > 0 && (
                  <span className="imdb">⭐ {v.imdbRating}</span>
                )}

                {v.season && (
                  <span className="season">
                    S{v.season}
                    {v.episode ? ` · E${v.episode}` : ""}
                  </span>
                )}
              </div>

              {Array.isArray(v.tags) && v.tags.length > 0 && (
                <div className="tag-row">
                  {v.tags.slice(0, 3).map((t, i) => (
                    <span key={i} className="mini-tag">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}