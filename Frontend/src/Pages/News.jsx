import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./News.css";
import NavBar from "../Component/NavBar";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function News() {
  const [news, setNews] = useState([]);
  const [videos, setVideos] = useState([]);
  const navigate = useNavigate();

  // 🧠 Last viewed time (saved in localStorage)
  const lastViewed = new Date(localStorage.getItem("newsLastViewed") || 0);

  // 📰 Load news
  useEffect(() => {
    axios
      .get(`${BASE}/api/news`)
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data.news || [];

        const now = new Date();
        const filtered = data.filter((item) => {
          const publishAt = item.publishAt
            ? new Date(item.publishAt)
            : new Date(item.date);
          if (isNaN(publishAt)) return false;
          const diffDays = (now - publishAt) / (1000 * 60 * 60 * 24);
          return publishAt <= now && diffDays <= 30;
        });

        filtered.sort(
          (a, b) =>
            new Date(b.publishAt || b.date) - new Date(a.publishAt || a.date)
        );

        setNews(filtered);

        // ✅ Mark as viewed (save now time)
        localStorage.setItem("newsLastViewed", new Date());
      })
      .catch((err) => console.error("❌ News load error:", err));
  }, []);

  // 🎬 Load videos
  useEffect(() => {
    axios
      .get(`${BASE}/api/videos`)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data.videos || [];
        setVideos(list);
      })
      .catch((err) => console.error("❌ Video load error:", err));
  }, []);

  // 🧠 Handle click
  const handleNewsClick = (item) => {
    if (item.videoId) {
      navigate(`/watch/${item.videoId}`);
      return;
    }

    if (item.relatedSeries) {
      const related = item.relatedSeries.toLowerCase();
      const matched = videos.filter(
        (v) => v.title && v.title.toLowerCase().includes(related) && v.season >= 1
      );

      if (matched.length > 0) {
        const seasonMatch = item.title.match(/season\s*(\d+)/i);
        let seasonNumber = seasonMatch ? Number(seasonMatch[1]) : 1;

        const seasonVideos = matched.filter(
          (v) => Number(v.season) === seasonNumber
        );

        const firstEp = seasonVideos.sort(
          (a, b) => (a.episode || 0) - (b.episode || 0)
        )[0];

        if (firstEp?._id) {
          navigate(`/watch/${firstEp._id}`);
          return;
        }
      }

      const single = videos.find(
        (v) =>
          v.title &&
          v.title.toLowerCase().includes(related) &&
          (!v.season || v.season < 1)
      );
      if (single) {
        navigate(`/watch/${single._id}`);
        return;
      }
    }

    alert("⚠️ No linked video found for this news item.");
  };

  return (
    <div className="news-wrapper">
      <NavBar />
      <div className="news-page">
        <div className="news-grid">
          {news.length > 0 ? (
            news.map((item) => (
              <div
                key={item._id}
                className="news-card"
                onClick={() => handleNewsClick(item)}
              >
                <div className="news-image-wrapper">
                  <img src={item.image || "/placeholder.jpg"} alt={item.title} />
                  {item.tag && (
                    <span className={`news-tag tag-${item.tag.toLowerCase()}`}>
                      {item.tag === "COMING_SOON"
                        ? "Coming Soon"
                        : item.tag === "UPDATE"
                        ? "Update"
                        : "New"}
                    </span>
                  )}
                </div>
                <div className="news-info">
                  <h2>
                    {item.title}
                    {new Date(item.date) > lastViewed && (
                      <span className="new-tag">NEW</span>
                    )}
                  </h2>
                  <p>{item.content?.slice(0, 90)}...</p>
                  <span className="news-date">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="no-news">No news updates available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
