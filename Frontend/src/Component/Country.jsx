import React, { useEffect, useMemo, useState } from 'react';
import './Country.css';
import NavBar from './NavBar';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from "react-helmet";

const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const PUBLIC_CDN = import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com";

// 🔗 URL helpers
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

const toArray = (v) => Array.isArray(v) ? v : (v != null && v !== '' ? [v] : []);
const norm = (s) =>
  (s ?? '').toString().trim().toLowerCase()
    .normalize('NFKD').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ');

const getCountries = (video) =>
  toArray(video.country)
    .flatMap(v => (typeof v === 'string' && v.includes(',')) ? v.split(',') : [v])
    .map(s => String(s ?? '').trim())
    .filter(Boolean);

const getPrimaryCountry = (video) => {
  const list = getCountries(video);
  return list.length ? list[0] : 'Unknown';
};

export default function Country() {
  const { country: rawParam } = useParams();
  const [allVideos, setAllVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const paramCountry = useMemo(() => norm(decodeURIComponent(rawParam || '')), [rawParam]);

  const pageTitle = useMemo(() => {
    if (!rawParam) return 'Movies';
    const s = decodeURIComponent(rawParam).replace(/-/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }, [rawParam]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await axios.get(`${BASE}/api/videos`);
        const data = Array.isArray(res.data)
          ? res.data
          : (res.data?.videos || res.data?.items || res.data?.data || []);
        setAllVideos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setErr(e.message || 'Load failed');
        setAllVideos([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const list = allVideos.slice();
    if (!paramCountry) {
      return list.sort((a, b) =>
        new Date(b.releaseDate || b.createdAt || 0) - new Date(a.releaseDate || a.createdAt || 0)
      );
    }
    const matchCountry = (v) => {
      const items = getCountries(v).map(norm);
      return items.some(it => it === paramCountry || it.includes(paramCountry) || paramCountry.includes(it));
    };
    return list
      .filter(v => matchCountry(v))
      .sort((a, b) =>
        new Date(b.releaseDate || b.createdAt || 0) - new Date(a.releaseDate || a.createdAt || 0)
      );
  }, [allVideos, paramCountry]);

  const groupedByCountry = useMemo(() => {
    if (paramCountry) return [];
    const map = new Map();
    for (const v of filtered) {
      const c = getPrimaryCountry(v);
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(v);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered, paramCountry]);

  return (
    <div className="cartoon-container">
      <Helmet>
        <title>
          {paramCountry
            ? `${pageTitle} Cartoons – Watch Online | CartoonLK`
            : "Browse Cartoons by Country | CartoonLK"}
        </title>
        <meta
          name="description"
          content={
            paramCountry
              ? `Watch all cartoons and movies from ${pageTitle} online in HD.`
              : "Browse your favorite shows by country – Sinhala, Japanese, English, and more on CartoonLK."
          }
        />
        <link
          rel="canonical"
          href={
            paramCountry
              ? `https://cartoonlk.com/country/${encodeURIComponent(pageTitle)}`
              : "https://cartoonlk.com/country"
          }
        />
      </Helmet>

      <NavBar />

      <div className="movie-section">
        {err && <p className="error">{err}</p>}

        {loading ? (
          <p className="loading">Loading…</p>
        ) : paramCountry ? (
          filtered.length === 0 ? (
            <p className="no-videos">No movies found for {pageTitle}.</p>
          ) : (
            <div className="movie-list">
              {filtered.map((video) => (
                <Link to={`/watch/${video._id}`} key={video._id} className="movie-card">
                  <div className="thumbnail-wrapper">
                    <img
                      src={getThumbUrl(video)}
                      alt={video.title}
                      className="movie-thumbnail"
                      loading="lazy"
                      onError={(e) => (e.currentTarget.src = "/fallback.png")}
                    />
                    <span className="tag top-left">WEBRip</span>
                  </div>
                  <div className="movie-title">{video.title}</div>
                  <div className="movie-date">
                    {new Date(video.releaseDate || video.createdAt).toLocaleDateString('en-GB')}
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : groupedByCountry.length === 0 ? (
          <p className="no-videos">No movies found.</p>
        ) : (
          <>
            {groupedByCountry.map(([countryName, vids]) => (
              <section className="country-section" key={countryName}>
                <h2 className="section-title">
                  <Link to={`/country/${encodeURIComponent(countryName)}`}>{countryName}</Link>
                </h2>
                <div className="movie-list">
                  {vids.map((video) => (
                    <Link to={`/watch/${video._id}`} key={video._id} className="movie-card">
                      <div className="thumbnail-wrapper">
                        <img
                          src={getThumbUrl(video)}
                          alt={video.title}
                          className="movie-thumbnail"
                          loading="lazy"
                          onError={(e) => (e.currentTarget.src = "/fallback.png")}
                        />
                      </div>
                      <div className="movie-title">{video.title}</div>
                      <div className="movie-date">
                        {new Date(video.releaseDate || video.createdAt).toLocaleDateString('en-GB')}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </>
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