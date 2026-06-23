import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import "./Browse.css";
import NavBar from "./NavBar.jsx";


const BASE = import.meta.env.VITE_API_URL;
const PUBLIC_CDN = import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com";

const getImg = (p) => {
  if (!p) return "";
  if (p.startsWith("http")) return p;
  return `${BASE}/api/videos/file/${encodeURIComponent(p)}`;
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
                src={getImg(v.landscapeThumbnail || v.thumbnail)}
                alt={v.title}
                loading="lazy"
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
