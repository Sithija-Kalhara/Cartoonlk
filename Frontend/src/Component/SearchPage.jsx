import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import axios from "axios";
import NavBar from "./NavBar";
import { Helmet } from "react-helmet";
import "./SearchPage.css";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const CDN = (import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com").replace(/\/+$/, "");

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function SearchPage() {
  const query = useQuery();
  const q = query.get("q") || "";
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Diagnostic check: log what API returns
  useEffect(() => {
    fetch("https://api.cartoonlk.com/api/videos/search?q=test")
      .then((r) => r.json())
      .then((d) =>
        console.log(
          "🧠 Debug: landscapeThumbnail values from API →",
          d.map((v) => ({
            title: v.title,
            landscape: v.landscapeThumbnail,
            thumb: v.thumbnail,
          }))
        )
      )
      .catch((err) => console.error("❌ Diagnostic fetch failed:", err));
  }, []);

  // ✅ Search logic
  useEffect(() => {
    if (!q.trim()) {
      console.log("⚠️ Empty query, skipping search");
      setResults([]);
      return;
    }

    console.log("🔍 Searching for:", q);
    console.log("🔗 API URL:", `${BASE}/api/videos/search?q=${q}`);

    setLoading(true);
    axios
      .get(`${BASE}/api/videos/search`, { params: { q } })
      .then((res) => {
        console.log("✅ API response:", res.data);
        setResults(res.data || []);
      })
      .catch((err) => console.error("❌ Search error:", err))
      .finally(() => setLoading(false));
  }, [q]);

  // ✅ Safe image URL builder
  const fileUrl = (path = "") => {
    if (!path) return "/fallback.png";
    if (path.startsWith("http") || path.startsWith("https")) return path;
    return `${CDN}/${path.replace(/^\/+/, "")}`;
  };

  return (
    <div className="cartoon-container">
      <Helmet>
        <title>
          {q ? `Search results for "${q}" | CartoonLK` : "Search | CartoonLK"}
        </title>
      </Helmet>

      <NavBar />

      <div className="search-results">
        <h2 className="section-title">
          {q ? `Search Results for: "${q}"` : "Search"}
        </h2>

        {loading ? (
          <p className="loading">Loading results...</p>
        ) : results.length === 0 ? (
          <p className="no-videos">No results found for "{q}"</p>
        ) : (
          <div className="movie-list">
            {results.map((v) => (
              <Link to={`/watch/${v._id}`} key={v._id} className="movie-row">
                <img
                  src={fileUrl(v.landscapeThumbnail || v.thumbnail)}
                  alt={v.title || v.name}
                  className="movie-thumb"
                  loading="lazy"
                  onError={(e) => (e.currentTarget.src = "/fallback.png")}
                />
                <div className="movie-info">
                  <h3 className="movie-title">{v.title || v.name}</h3>
                  <button className="read-more">▶ Watch Now</button>
                </div>
              </Link>
            ))}
          </div>

        )}
      </div>

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
