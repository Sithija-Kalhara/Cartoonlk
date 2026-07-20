import React, { useEffect, useState } from "react";
import axios from "axios";
import "./TvSeries.css";
import { Link } from "react-router-dom";
import NavBar from "./NavBar";
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
  if (!video) return "/placeholder.jpg";

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

const SeriesTab = () => {
  const [series, setSeries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await axios.get(`${BASE}/api/videos`);
        const data = Array.isArray(res.data) ? res.data : res.data.videos || [];

        // Group by title
        const grouped = {};
        for (const v of data) {
          const key = v.title?.trim();
          if (!key) continue;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(v);
        }

        // Keep only titles with multiple episodes (series)
        const multiEpSeries = Object.values(grouped)
          .filter((arr) => arr.length > 1)
          .map((arr) => {
            const first = arr[0];
            return {
              _id: first._id,
              title: first.title,
              seasonCount: new Set(arr.map((v) => v.season)).size,
              episodes: arr,
              thumbnail: first.thumbnail,
              landscapeThumbnail: first.landscapeThumbnail,
              startEpisode:
                arr.find((v) => v.episode === 1)?.name ||
                arr[0].name ||
                "Episode 1",
            };
          });

        setSeries(multiEpSeries);
      } catch (err) {
        console.error("❌ Failed to load series:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSeries();
  }, []);

  // handle open/close modal
  const openSeries = (s) => {
    setSelectedSeries(s);
    setSelectedSeason(1);
  };
  const closeModal = () => setSelectedSeries(null);

  // group episodes by season for modal
  const episodesBySeason = (selectedSeries?.episodes || []).reduce(
    (acc, ep) => {
      const s = ep.season || 1;
      if (!acc[s]) acc[s] = [];
      acc[s].push(ep);
      acc[s].sort((a, b) => (a.episode || 0) - (b.episode || 0));
      return acc;
    },
    {}
  );

  return (
    <div className="series-page">
      <Helmet>
        <title>Series | CartoonLK</title>
      </Helmet>

      <NavBar />

      <h2 className="section-title">TV Series</h2>

      {loading ? (
        <p className="loading">Loading...</p>
      ) : series.length === 0 ? (
        <p className="no-series">No series found.</p>
      ) : (
        <div className="series-grid">
          {series.map((s) => (
            <div
              className="series-card"
              key={s._id}
              onClick={() => openSeries(s)}
            >
              <div className="thumbnail-wrap">
                <img
                  src={getThumbUrl(s)}
                  alt={s.title}
                  className="thumbnail"
                  onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
                />
                <div className="season-badge">
                  {s.seasonCount} Season{s.seasonCount > 1 ? "s" : ""}
                </div>
              </div>
              <div className="series-info">
                <h3>{s.title}</h3>
                <p>Starts: {s.startEpisode}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 🧩 Modal */}
      {selectedSeries && (
        <div className="series-modal-overlay" onClick={closeModal}>
          <div
            className="series-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-btn" onClick={closeModal}>
              ✖
            </button>

            <div className="series-hero">
              <img
                src={getThumbUrl(selectedSeries)}
                alt={selectedSeries.title}
                onError={(e) => (e.currentTarget.src = "/placeholder.jpg")}
              />
              <div className="series-hero-overlay">
                <h2>{selectedSeries.title}</h2>
              </div>
            </div>

            <div className="series-meta">
              <span>{selectedSeries.seasonCount} Seasons</span>
              <span>{selectedSeries.episodes.length} Episodes</span>
            </div>

            <div className="season-selector">
              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(Number(e.target.value))}
              >
                {Object.keys(episodesBySeason).map((s) => (
                  <option key={s} value={s}>
                    Season {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="episode-list">
              {episodesBySeason[selectedSeason]?.map((ep) => (
                <div key={ep._id} className="episode-card">
                  <Link to={`/watch/${ep._id}`} className="episode-thumb">
                    <img
                      src={getThumbUrl(ep)}
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
                    <span className="episode-duration">
                      {ep.duration || "42m"}min
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SeriesTab;