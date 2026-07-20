import React, { useEffect, useState } from "react";
import axios from "axios";
import "./Profile.css";
import { useNavigate } from "react-router-dom";
import NavBar from "./NavBar";
import AccountSettings from "../Pages/AccountSettings";
import { useAuth } from "../AuthContext";

const BASE = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(
  /\/+$/,
  ""
);
const API = `${BASE}/api`;
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
  if (!video) return "/default-avatar.png";

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

  return "/default-avatar.png";
};

export default function Profile() {
  const { user, setUser } = useAuth();
  const [history, setHistory] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [tab, setTab] = useState("watchlist");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate();
  const [movieName, setMovieName] = useState("");
  const [requestMsg, setRequestMsg] = useState("");

  useEffect(() => {
    if (user) {
      loadUserData(user);
    } else {
      const stored = localStorage.getItem("user");
      if (stored) {
        setUser(JSON.parse(stored));
      } else {
        navigate("/auth");
      }
    }
  }, [user, navigate, setUser]);

  const loadUserData = async (u) => {
    if (!u?._id) {
      return;
    }

    try {
      const res1 = await axios.get(`${API}/videos/history/${u._id}`);
      const res2 = await axios.get(`${API}/videos/favorites/${u._id}`);
      setHistory(res1.data || []);
      setFavorites(res2.data || []);
    } catch (err) {
      console.error("Error loading data:", err);
    }
  };

  const removeFromHistory = async (id) => {
    await axios.delete(`${API}/videos/history/${user._id}/${id}`);
    setHistory((p) => p.filter((v) => v._id !== id));
  };

  const confirmRemove = (id) => {
    setSelectedId(id);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (selectedId) removeFromHistory(selectedId);
    setShowConfirm(false);
    setSelectedId(null);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setSelectedId(null);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    navigate("/auth");
  };

  if (!user) return null;

  return (
    <div className="dashboard-container">
      <NavBar />

      <div className="dashboard-main">
        {/* === Sidebar === */}
        <aside className="sidebar">
          <div className="user-block">
            <img
              src={user?.profilePic ? getThumbUrl({ thumbnail: user.profilePic }) : "/default-avatar.png"}
              alt="Profile"
              className="avatar"
              onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
            />
            <h3>{user.name}</h3>
          </div>

          <div className="sidebar-nav">
            <button
              onClick={() => setTab("watchlist")}
              className={tab === "watchlist" ? "active" : ""}
            >
              📺 My Watchlist
            </button>
            <button
              onClick={() => setTab("history")}
              className={tab === "history" ? "active" : ""}
            >
              🕒 Viewing History
            </button>
            <button
              onClick={() => setTab("favorites")}
              className={tab === "favorites" ? "active" : ""}
            >
              ⭐ My List
            </button>
            <button
              onClick={() => setTab("request")}
              className={tab === "request" ? "active" : ""}
            >
              🎬 Request a Movie
            </button>

            <button
              onClick={() => setTab("settings")}
              className={tab === "settings" ? "active" : ""}
            >
              ⚙️ Account Settings
            </button>

            <button onClick={handleLogout} className="logout-btn">
              🚪 Sign Out
            </button>
          </div>
        </aside>

        {/* === Content Area === */}
        <section className="content-area">
          {tab === "watchlist" && (
            <>
              <div className="content-header">
                <h1>My Watchlist</h1>
                <div>
                  <button className="blue-btn">Add to Watchlist</button>
                </div>
              </div>

              <div className="section-block">
                <h2>Continue Watching</h2>
                <div className="card-grid">
                  {history.map((h) => {
                    const v = h.videoId || h;
                    return (
                      <div
                        key={v._id}
                        className="movie-card"
                        onClick={() => navigate(`/watch/${v._id}`)}
                        style={{ cursor: "pointer" }}
                      >
                        <div className="thumb">
                          <img
                            src={getThumbUrl(v)}
                            alt={v.title}
                            onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                          />
                          {h.progress > 0 && (
                            <div className="progress-line">
                              <div style={{ width: `${h.progress}%` }}></div>
                            </div>
                          )}
                        </div>
                        <div className="card-info">
                          <h4>{v.title}</h4>
                          {v.season && (
                            <p>
                              S{v.season} • E{v.episode}
                            </p>
                          )}
                        </div>

                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmRemove(v._id);
                          }}
                        >
                          Remove from History
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === "history" && (
            <div className="section-block">
              <div className="content-header">
                <h1>Viewing History</h1>
              </div>

              {history.length === 0 ? (
                <p>No viewing history yet.</p>
              ) : (
                <div className="card-grid">
                  {history.map((h) => {
                    const v = h.videoId || h;
                    return (
                      <div key={v._id} className="movie-card">
                        <div
                          className="thumb"
                          onClick={() => navigate(`/watch/${v._id}`)}
                          style={{ cursor: "pointer" }}
                        >
                          <img
                            src={getThumbUrl(v)}
                            alt={v.title}
                            onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                          />
                          {h.progress > 0 && (
                            <div className="progress-line">
                              <div style={{ width: `${h.progress}%` }}></div>
                            </div>
                          )}
                        </div>

                        <div className="card-info">
                          <h4>{v.title}</h4>
                          {v.season && (
                            <p>
                              S{v.season} • E{v.episode}
                            </p>
                          )}
                        </div>

                        <button
                          className="remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm("Remove this from history?")) {
                              removeFromHistory(v._id);
                            }
                          }}
                        >
                          Remove from History
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "favorites" && (
            <div className="section-block">
              <h1>Favorites</h1>
              <div className="card-grid">
                {favorites.map((v) => (
                  <div key={v._id} className="movie-card">
                    <img
                      src={getThumbUrl(v)}
                      alt={v.title}
                      onError={(e) => (e.currentTarget.src = "/default-avatar.png")}
                    />
                    <h4>{v.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "request" && (
            <div className="section-block">
              <h1>Request a Movie</h1>
              <p style={{ opacity: 0.7, marginBottom: 12 }}>
                Can't find what you're looking for? Request it here.
              </p>

              <input
                type="text"
                placeholder="Enter movie or series name"
                value={movieName}
                onChange={(e) => setMovieName(e.target.value)}
                className="request-input"
              />

              <button
                className="blue-btn"
                onClick={async () => {
                  if (!movieName.trim()) return;

                  try {
                    const token = JSON.parse(
                      localStorage.getItem("user")
                    )?.token;

                    await axios.post(
                      `${API}/movie-request`,
                      { movieName },
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      }
                    );

                    setRequestMsg("✅ Movie request sent!");
                    setMovieName("");
                  } catch (err) {
                    setRequestMsg("❌ Failed to send request");
                  }
                }}
              >
                Send Request
              </button>

              {requestMsg && <p style={{ marginTop: 10 }}>{requestMsg}</p>}
            </div>
          )}

          {tab === "settings" && (
            <div className="section-block">
              <AccountSettings />
            </div>
          )}
        </section>
      </div>

      {/* 🔔 Custom Confirmation Modal */}
      {showConfirm && (
        <div className="confirm-overlay" onClick={handleCancel}>
          <div className="confirm-box" onClick={(e) => e.stopPropagation()}>
            <p>Are you sure you want to remove this from history?</p>
            <div className="confirm-actions">
              <button onClick={handleConfirm} className="confirm-yes">
                Yes, Remove
              </button>
              <button onClick={handleCancel} className="confirm-no">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}