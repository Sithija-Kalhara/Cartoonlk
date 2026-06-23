// src/components/SeriesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import NavBar from './NavBar';
import './TvSeries.css'; // reuse the same style

const SeriesPage = () => {
  const { title } = useParams();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${BASE}/api/videos`);
        const data = Array.isArray(res.data) ? res.data : res.data.videos || [];

        // ✅ Filter by title & category
        const filtered = data.filter((video) => {
          const categories = Array.isArray(video.category) ? video.category : [video.category];
          return (
            categories.some(c => String(c).toLowerCase() === 'tv series') &&
            String(video.title).toLowerCase() === String(title).toLowerCase()
          );
        });

        // ✅ Sort by season + episode number
        const sorted = filtered.sort((a, b) => {
          const sa = Number(a.season || 0);
          const sb = Number(b.season || 0);
          if (sa !== sb) return sa - sb;
          return (a.episode || 0) - (b.episode || 0);
        });

        setEpisodes(sorted);
        setError("");
      } catch (err) {
        console.error('❌ Error fetching series episodes:', err);
        setError("Couldn't load episodes. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, [title, BASE]);

  const groupedBySeason = useMemo(() => {
    const grouped = {};
    episodes.forEach(ep => {
      const s = ep.season || 1;
      if (!grouped[s]) grouped[s] = [];
      grouped[s].push(ep);
    });
    return grouped;
  }, [episodes]);

  return (
    <div className="cartoon-container">
      <NavBar />

      <div className="movie-section">
        <h2 className="section-title">{title}</h2>

        {loading && <div className="loading">Loading episodes...</div>}
        {error && <div className="error-msg">{error}</div>}

        {!loading && !error && episodes.length === 0 && (
          <p className="muted-text">No episodes available for this series.</p>
        )}

        {!loading && Object.keys(groupedBySeason).map(season => (
          <div key={season} className="season-block">
            <h3 className="season-title">Season {season}</h3>
            <div className="movie-list">
              {groupedBySeason[season].map((ep) => (
                <Link to={`/watch/${ep._id}`} key={ep._id} className="movie-card">
                  <div className="thumbnail-wrapper">
                    <img
                      src={ep.landscapeThumbnail
                        ? `${BASE}/api/videos/file/${encodeURIComponent(ep.landscapeThumbnail)}`
                        : `${BASE}/api/videos/file/${encodeURIComponent(ep.thumbnail || '')}`}
                      alt={ep.name || ep.title}
                      className="movie-thumbnail"
                      loading="lazy"
                      onError={e => (e.currentTarget.src = "/fallback.png")}
                    />
                  </div>
                  <div className="movie-info">
                    <div className="movie-title">
                      {ep.episode ? `E${ep.episode}: ${ep.name || ep.title}` : ep.title}
                    </div>
                    {ep.releaseDate && (
                      <div className="movie-date">
                        {new Date(ep.releaseDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
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

export default SeriesPage;
