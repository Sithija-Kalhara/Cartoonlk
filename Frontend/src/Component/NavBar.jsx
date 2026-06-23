import React, { useRef, useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import logo from "../Assests/logo.png";
import "./NavBar.css";
import { useAuth } from "../AuthContext";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const API = `${BASE}/api`;

const NavBar = () => {
  const [open, setOpen] = useState(false);
  const [mobileSearchActive, setMobileSearchActive] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [show, setShow] = useState(false);
  const [hi, setHi] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, setUser } = useAuth();
  const [unreadNews, setUnreadNews] = useState(0);


  const wrapRef = useRef(null);
  const nav = useNavigate();

  // 🔔 Check for unread news
useEffect(() => {
  const lastViewed = localStorage.getItem("newsLastViewed");
  const lastViewedDate = lastViewed ? new Date(lastViewed) : new Date(0);

  axios.get(`${API}/news`)
    .then(res => {
      const data = Array.isArray(res.data) ? res.data : res.data.news || [];
      const fresh = data.filter(n => {
        const date = new Date(n.date || n.publishAt);
        return date instanceof Date && !isNaN(date) && date > lastViewedDate;
      });
      setUnreadNews(fresh.length);
    })
    .catch(err => console.error("News check error:", err));
}, []);


const handleNewsOpen = () => {
  localStorage.setItem("newsLastViewed", new Date().toISOString());
  setUnreadNews(0);
  setOpen(false);
};



useEffect(() => {
  const stored = localStorage.getItem("user");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.profilePic) {
      parsed.profilePic = `${parsed.profilePic}?v=${Date.now()}`;
    }
    setUser(parsed);
  }
}, []);


  // 🚪 Logout
  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setProfileOpen(false);
    setOpen(false);
    nav("/auth");
  };

  // 🔍 Debounced search
  useEffect(() => {
    const s = q.trim();
    if (s.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await axios.get(`${API}/videos/search`, { params: { q: s } });
        setResults(res.data || []);
        setShow(true);
        setHi(-1);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // 🖱️ Click outside
  useEffect(() => {
    const onClick = (e) => {
      if (!wrapRef.current?.contains(e.target)) setShow(false);
      if (!e.target.closest(".profile-container")) setProfileOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // ⌨️ Keyboard navigation
  const onKey = (e) => {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (hi >= 0 && results[hi]) {
        nav(`/watch/${results[hi]._id}`);
        setShow(false);
        setMobileSearchActive(false);
      } else if (q.trim()) {
        nav(`/search?q=${encodeURIComponent(q.trim())}`);
        setShow(false);
        setMobileSearchActive(false);
      }
    } else if (e.key === "Escape") setShow(false);
  };

  const handleSearchChange = (e) => {
    setQ(e.target.value);
    setShow(true);
    setHi(-1);
  };

  const renderSearchDropdown = () => (
    <div className="search-dropdown">
      {loading && <div className="search-row muted">Searching…</div>}
      {!loading &&
        results.map((v, i) => (
          <Link
            key={v._id}
            to={`/watch/${v._id}`}
            className={`result ${hi === i ? "active" : ""}`}
            onClick={() => {
              setShow(false);
              setMobileSearchActive(false);
            }}
          >
            <img
              src={v.landscapeThumbnail || v.thumbnail || "/fallback.png"}
              alt={v.title}
              onError={(e) => (e.currentTarget.src = "/fallback.png")}
            />


            <div className="meta">
              <div className="title">{v.title}</div>
              {v.name && <div className="date">{v.name}</div>}
            </div>
          </Link>
        ))}
      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <div className="search-row muted">No results</div>
      )}
      {q && (
        <button
          className="clear-btn"
          onClick={() => {
            setQ("");
            setResults([]);
            setShow(false);
          }}
        >
          ×
        </button>
      )}
    </div>
  );

  return (
    <nav className="navbar">
      <div className="nav-inner">
        <div className="nav-left">
        {/* 🧩 Logo */}
        <div className="logo">
          <Link
            to="/"
            className="logo-link"
            onClick={() => {
              setOpen(false);
              setMobileSearchActive(false);
            }}
          >
            <img src={logo} className="navlogo" alt="Cartoon LK" />
            <span className="logo-text">Cartoon LK</span>
          </Link>
        </div>

        {/* 🧭 Links */}
        <ul className={`nav-links ${open ? "is-open" : ""}`}>
          <li><NavLink to="/" end onClick={() => setOpen(false)}>Home</NavLink></li>
          <li><NavLink to="/tvseries" onClick={() => setOpen(false)}>TV Series</NavLink></li>
          <li><NavLink to="/countries" onClick={() => setOpen(false)}>Country</NavLink></li>
          <li><NavLink to="/years" onClick={() => setOpen(false)}>Years</NavLink></li>
          <li>
          <NavLink to="/news" onClick={handleNewsOpen}>
            News
            {unreadNews > 0 && (
              <span className="news-badge">{unreadNews}</span>
            )}
          </NavLink>
        </li>


          {/* 👤 Mobile Profile/Login (bottom) */}
          <div className="mobile-only">
          <li className="mobile-auth">
            {user ? (
              <>
                <button
                  className="mobile-profile-btn"
                  onClick={() => {
                    setOpen(false);
                    nav("/profile");
                  }}
                >
                  👤 {user.name?.split(" ")[0] || "Profile"}
                </button>
                <button className="mobile-logout-btn" onClick={handleLogout}>
                  🚪 Logout
                </button>
              </>
            ) : (
              <button
                className="mobile-login-btn"
                onClick={() => {
                  setOpen(false);
                  nav("/auth");
                }}
              >
                🔐 Login
              </button>
            )}
          </li>
          </div>
        </ul>

        </div>
        <div className="nav-right">
          <div className="search-bar" ref={wrapRef}>
            <input
              type="text"
              placeholder="Search cartoons..."
              value={q}
              onChange={handleSearchChange}
              onFocus={() => q.trim().length >= 2 && setShow(true)}
              onKeyDown={onKey}
            />
            {show && renderSearchDropdown()}
          </div>
            <div className="desktop-only">
      <div className="profile-container">
          {user ? (
            <div className="profile">
              <img
                src={`${user?.profilePic || "/default-avatar.png"}?v=${Date.now()}`}
                alt="profile"
                className="profile-avatar"
                onClick={() => setProfileOpen(!profileOpen)}
              />

              <div className={`profile-menu ${profileOpen ? "show" : ""}`}>

                <Link to="/profile" onClick={() => setProfileOpen(false)} className="navacc">
                   Account
                </Link>

                <Link to="/help" onClick={() => setProfileOpen(false)} className="nav-help">
                   Help Center
                </Link>

                <button onClick={handleLogout} className="navlogout">
                   Log out
                </button>
              </div>
            </div>
          ) : (
            <button className="login-btn" onClick={() => nav("/auth")}>
              Login
            </button>
          )}
        </div>

          </div>
        </div>

        {/* 🔍 Mobile Search Icon */}
        <button
          className="search-icon-btn"
          aria-label="Toggle search"
          onClick={() => {
            setMobileSearchActive((v) => !v);
            setOpen(false);
          }}
        >
          🔍
        </button>

        {/* 🍔 Menu Icon */}
        <button
          className="menu-btn"
          aria-label="Toggle menu"
          aria-expanded={open}
          onClick={() => {
            setOpen((v) => !v);
            setMobileSearchActive(false);
          }}
        >
          ☰
        </button>
      </div>

      {open && <div className="menu-overlay active" onClick={() => setOpen(false)}></div>}

      {/* 📱 Mobile Search */}
      <div
        className={`mobile-search-bar ${mobileSearchActive ? "active" : ""}`}
        ref={mobileSearchActive ? wrapRef : null}
      >
        <input
          type="text"
          placeholder="Search cartoons..."
          value={q}
          onChange={handleSearchChange}
          onFocus={() => q.trim().length >= 2 && setShow(true)}
          onKeyDown={onKey}
        />
        {mobileSearchActive && show && renderSearchDropdown()}
      </div>
    </nav>
  );
};

export default NavBar;