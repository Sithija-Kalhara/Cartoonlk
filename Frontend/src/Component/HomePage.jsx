import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import "./HomePage.css";
import { Link } from "react-router-dom";
import axios from "axios";
import NavBar from "./NavBar";
import { Helmet } from "react-helmet";
import dayjs from "dayjs";

// --- CONFIGURATION ---
const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const CDN = (import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com").replace(/\/+$/, "");

const fileUrl = (path = "") => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${CDN || BASE}/api/videos/stream/${encodeURIComponent(path)}`;
};

// --- SUB-COMPONENT: HOVER OVERLAY ---
const MovieCardOverlay = ({ video, handleSeriesClick, myList = [], handleAddToList }) => {
  const isSeries = video.season && Number(video.season) >= 1;
  const isAdded = !isSeries && Array.isArray(myList) ? myList.includes(video._id) : false;
  const genres = Array.isArray(video.category) ? video.category : video.category ? [video.category] : [];

  return (
    <div className="movie-card-overlay">
      <div className="overlay-content">
        <div className="overlay-preview">
          <img src={video.landscapeThumbnailUrl || video.thumbnailUrl || "/placeholder.jpg"} alt={video.title} />
        </div>
        <div className="overlay-details">
          <div className="action-buttons">
            <Link 
              to={isSeries ? "#" : `/watch/${video._id}`} 
              className="play-btn-small"
              onClick={(e) => { if (isSeries) { e.preventDefault(); handleSeriesClick(video.title); } }}
            >▶</Link>
            {!isSeries && (
              <button className={`add-btn-small ${isAdded ? "added" : ""}`} onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToList(video._id); }}>
                {isAdded ? "✔️" : "➕"}
              </button>
            )}
          </div>
          <div className="metadata">
            {video.rating && <span className="rating-tag">{video.rating}</span>}
            {isSeries ? <span className="series-tag">S{video.season}</span> : <span className="runtime">{video.duration || "24m"}</span>}
            <span className="hd-tag">HD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: MOVIE CARD ---
const MovieCard = ({ video, category, seriesByName, handleSeriesClick, myList, handleAddToList }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isSeries = video.season && Number(video.season) >= 1;
  const isRecent = dayjs().diff(dayjs(video.createdAt), "day") <= 7;

  const displayVideo = isSeries && seriesByName[video.title] ? seriesByName[video.title][0] : video;
  const seasonCount = isSeries && seriesByName[video.title] ? new Set(seriesByName[video.title].map(ep => ep.season)).size : 0;

  return (
    <div 
      className="movie-card-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className={`movie-card ${isHovered ? "hovered" : ""}`}
        onClick={() => isSeries && handleSeriesClick(video.title)}
      >
        <div className="thumbnail-wrapper">
          <img src={displayVideo.landscapeThumbnailUrl || displayVideo.thumbnailUrl || "/placeholder.jpg"} alt={video.title} className="movie-thumbnail" />
          {isRecent && <span className={`recent-badge ${isSeries ? "season" : "movie"}`}>{isSeries ? "New Season" : "New"}</span>}
          {isSeries ? <span className="tag top-right">{seasonCount} Seasons</span> : <span className="tag top-right">{category}</span>}
        </div>
        <div className="movie-info">
          <div className="movie-title">{video.title}</div>
        </div>
      </div>

      {isHovered && (
        <MovieCardOverlay 
          video={displayVideo} 
          handleSeriesClick={handleSeriesClick} 
          myList={myList} 
          handleAddToList={handleAddToList} 
        />
      )}
    </div>
  );
};

// --- MAIN HOME PAGE COMPONENT ---
const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [myList, setMyList] = useState([]);
  const [history, setHistory] = useState([]);
  const [heroVideo, setHeroVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [user, setUser] = useState(null);

  const scrollRefs = useRef({});

  // 1. Fetch User Data & History
  useEffect(() => {
    const stored = localStorage.getItem("user");
    const token = localStorage.getItem("token");
    if (stored) {
      const u = JSON.parse(stored);
      setUser(u);
      axios.get(`${BASE}/api/videos/history/${u._id}`).then(res => setHistory(res.data || [])).catch(() => {});
      if (token) {
        axios.get(`${BASE}/api/users/favorites`, { headers: { Authorization: `Bearer ${token}` } })
          .then(res => setMyList(res.data.map(v => v._id || v))).catch(() => {});
      }
    }
  }, []);

  // 2. Fetch All Videos
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const res = await axios.get(`${BASE}/api/videos`);
        const list = Array.isArray(res.data) ? res.data : res.data.videos || [];
        const formatted = list.map(v => ({
          ...v,
          thumbnailUrl: v.thumbnail || null,
          landscapeThumbnailUrl: v.landscapeThumbnail || null
        }));
        setVideos(formatted);
        const trailers = formatted.filter(v => v.trailer && v.trailer.trim() !== "");
        if (trailers.length > 0) setHeroVideo(trailers[Math.floor(Math.random() * trailers.length)]);
        setLoading(false);
      } catch (err) { setLoading(false); }
    };
    fetchAll();
  }, []);

  // 3. Logic: Group Series
  const seriesByName = useMemo(() => {
    return videos.reduce((acc, v) => {
      if (v.season && Number(v.season) >= 1) {
        const key = v.title || "Untitled";
        if (!acc[key]) acc[key] = [];
        acc[key].push(v);
      }
      return acc;
    }, {});
  }, [videos]);

  // 4. Logic: Categorize
  const categorizedVideos = useMemo(() => {
    const res = {};
    const cats = new Set();
    videos.forEach(v => {
      const vCats = Array.isArray(v.category) ? v.category : [v.category];
      vCats.forEach(c => c && cats.add(c.trim()));
    });

    Array.from(cats).forEach(cat => {
      if (cat.toLowerCase() === "latest") return;
      const shownSeries = new Set();
      res[cat] = videos.filter(v => {
        const itemCats = (Array.isArray(v.category) ? v.category : [v.category]).map(c => c?.toLowerCase());
        if (itemCats.includes(cat.toLowerCase())) {
          if (v.season && Number(v.season) >= 1) {
            if (shownSeries.has(v.title)) return false;
            shownSeries.add(v.title);
            return true;
          }
          return true;
        }
        return false;
      });
    });
    return res;
  }, [videos]);

  const handleAddToList = async (videoId) => {
    const token = localStorage.getItem("token");
    if (!token) return alert("Please login");
    const isAdded = myList.includes(videoId);
    setMyList(prev => isAdded ? prev.filter(id => id !== videoId) : [...prev, videoId]);
    try {
      if (isAdded) await axios.delete(`${BASE}/api/users/favorites/${videoId}`, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post(`${BASE}/api/users/favorites`, { videoId }, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { console.error("List update failed"); }
  };

  const handleSeriesClick = (title) => {
    const series = seriesByName[title];
    if (series) {
      setSelectedSeries(series.sort((a, b) => a.episode - b.episode));
      setSelectedSeason(series[0].season || 1);
    }
  };

  const scroll = (key, dir) => {
    const el = scrollRefs.current[key];
    if (el) el.scrollBy({ left: dir * 500, behavior: "smooth" });
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="cartoon-container">
      <Helmet><title>CartoonLK – Sinhala Dubbed Cartoons & Movies</title></Helmet>
      <NavBar videos={videos} />

      {/* Hero Section */}
      {heroVideo && (
        <div className="hero-section">
          <video className="hero-video" src={fileUrl(heroVideo.trailer)} autoPlay loop muted playsInline poster={heroVideo.landscapeThumbnail} />
          <div className="hero-overlay">
            <h1 className="hero-title">{heroVideo.title}</h1>
            <p className="hero-description">{heroVideo.description1}</p>
            <div className="hero-buttons">
              <Link to={`/watch/${heroVideo._id}`} className="play-btn">▶ Play Now</Link>
            </div>
          </div>
        </div>
      )}

      {/* Continue Watching */}
      {user && history.length > 0 && (
        <div className="movie-section">
          <h2 className="section-title-countinue">Continue Watching</h2>
          <div className="scroll-container">
            <button className="scroll-btn left" onClick={() => scroll("history", -1)}>‹</button>
            <div className="movie-list" ref={el => scrollRefs.current.history = el}>
              {history.map(v => (
                <div className="movie-card-container" key={v._id}>
                  <div className="movie-card">
                    <Link to={`/watch/${v._id}?resume=true`}>
                      <div className="thumbnail-wrapper-2">
                        <img src={v.landscapeThumbnail || v.thumbnail} alt={v.title} className="movie-thumbnail" />
                        <div className="progress-track"><div className="progress-bar" style={{ width: `${v.progress || 0}%` }} /></div>
                      </div>
                      <div className="movie-info"><div className="movie-title">{v.title}</div></div>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <button className="scroll-btn right" onClick={() => scroll("history", 1)}>›</button>
          </div>
        </div>
      )}

      {/* Category Rows */}
      {Object.entries(categorizedVideos).map(([category, items]) => (
        <div className="movie-section" key={category}>
          <h2 className="section-title"><Link to={`/category/${encodeURIComponent(category)}`}>{category} ›</Link></h2>
          <div className="scroll-container">
            <button className="scroll-btn left" onClick={() => scroll(category, -1)}>‹</button>
            <div className="movie-list" ref={el => scrollRefs.current[category] = el}>
              {items.map(v => (
                <MovieCard key={v._id} video={v} category={category} seriesByName={seriesByName} handleSeriesClick={handleSeriesClick} myList={myList} handleAddToList={handleAddToList} />
              ))}
            </div>
            <button className="scroll-btn right" onClick={() => scroll(category, 1)}>›</button>
          </div>
        </div>
      ))}

      {/* Series Modal */}
      {selectedSeries && (
        <div className="series-modal" onClick={() => setSelectedSeries(null)}>
          <div className="series-modal-content" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedSeries(null)}>✖</button>
            <div className="series-hero">
              <img src={selectedSeries[0].landscapeThumbnail || selectedSeries[0].thumbnail} alt="hero" />
              <div className="series-hero-overlay"><h2>{selectedSeries[0].title}</h2></div>
            </div>
            <div className="season-selector">
              <select value={selectedSeason} onChange={e => setSelectedSeason(Number(e.target.value))}>
                {[...new Set(selectedSeries.map(s => s.season))].map(s => <option key={s} value={s}>Season {s}</option>)}
              </select>
            </div>
            <div className="episode-list">
              {selectedSeries.filter(ep => ep.season === selectedSeason).map(ep => (
                <Link key={ep._id} to={`/watch/${ep._id}`} className="episode-card">
                  <div className="ep-thumb"><img src={ep.thumbnail || ep.landscapeThumbnail} alt="ep" /></div>
                  <div className="ep-info">
                    <h4>{ep.episode}. {ep.name || "Episode " + ep.episode}</h4>
                    <p>{ep.description1?.substring(0, 100)}...</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <footer className="footer">
        <div className="footer-links"><Link to="/about">About</Link> | <Link to="/privacy-policy">Privacy</Link></div>
        <p>© {new Date().getFullYear()} CartoonLK Team</p>
      </footer>
    </div>
  );
};

export default HomePage;