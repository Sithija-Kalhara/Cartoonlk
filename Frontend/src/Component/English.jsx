import React, { useEffect, useState } from "react";
import "./English.css";
import NavBar from "./NavBar";
import axios from "axios";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

export default function English() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${BASE}/api/videos`);
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.videos || [];
        // 🏷️ Filter only English videos
        const filtered = data.filter((v) => {
          const country = Array.isArray(v.country)
            ? v.country
            : [v.country];
          return country.some(
            (c) => c && c.toLowerCase().includes("english") || c.toLowerCase().includes("usa") || c.toLowerCase().includes("uk")
          );
        });
        setVideos(filtered);
      } catch (e) {
        console.error(e);
        setErr("Failed to load English videos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="cartoon-container">
      <Helmet>
        <title>English Cartoons – Watch Online | CartoonLK</title>
        <meta
          name="description"
          content="Watch English cartoons, movies, and TV shows online for free on CartoonLK. Stream full HD videos from the USA & UK collection."
        />
        <link rel="canonical" href="https://cartoonlk.com/english" />
      </Helmet>

      <NavBar />

      <div className="movie-section">
        <h2 className="section-title">English Cartoons & Shows</h2>

        {loading ? (
          <p className="loading">Loading…</p>
        ) : err ? (
          <p className="error">{err}</p>
        ) : videos.length === 0 ? (
          <p className="no-videos">No English videos available yet.</p>
        ) : (
          <div className="movie-list">
            {videos.map((v) => (
              <Link to={`/watch/${v._id}`} key={v._id} className="movie-card">
                <div className="thumbnail-wrapper">
                  <img
                    src={`${BASE}/api/videos/stream/${v.thumbnail}`}
                    alt={v.title}
                    className="movie-thumbnail"
                    loading="lazy"
                    onError={(e) => (e.currentTarget.src = "/fallback.png")}
                  />
                </div>
                <div className="movie-title">{v.title}</div>
                <div className="movie-date">
                  {new Date(v.releaseDate || v.createdAt).toLocaleDateString("en-GB")}
                </div>
              </Link>
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
}
