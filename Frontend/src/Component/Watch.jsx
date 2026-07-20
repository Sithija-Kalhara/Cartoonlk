import React, { useRef, useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import "./Watch.css";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaForward,
  FaBackward,
} from "react-icons/fa";
import { RiReplay5Fill, RiForward5Fill } from "react-icons/ri";
import { MdSubtitles, MdSubtitlesOff } from "react-icons/md";
import NavBar from "./NavBar";
import axios from "axios";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { useLocation } from "react-router-dom";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const PUBLIC_CDN = import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com";

// Only 480p/720p are ever offered — 1080p/4K removed from storage & CDN load.
const isAllowedLabel = (label = "") => {
  const l = String(label).toLowerCase();
  return l.includes("480") || l.includes("720");
};

/* ---------- URL helpers (encode safe) ---------- */
const streamUrl = (name = "") => {
  if (!name) return "";
  if (name.startsWith("http://") || name.startsWith("https://")) {
    return name;
  }
  return `${PUBLIC_CDN}/${encodeURIComponent(name)}`;
};

const subtitleUrlOf = (name = "") => {
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

export default function Watch() {
  const { id } = useParams();
  const videoRef = useRef(null);

  const [videoData, setVideoData] = useState(null);
  const [availableQualities, setAvailableQualities] = useState([]);
  const [selectedQuality, setSelectedQuality] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [showSkipLeft, setShowSkipLeft] = useState(false);
  const [showSkipRight, setShowSkipRight] = useState(false);
  const [showQualityOptions, setShowQualityOptions] = useState(false);
  const [controlsHidden, setControlsHidden] = useState(false);
  const [subsOn, setSubsOn] = useState(false);
  const [noSubtitleMsg, setNoSubtitleMsg] = useState(false);
  const restoreVolumeRef = useRef(1);
  const [subtitleText, setSubtitleText] = useState("");
  const navigate = useNavigate();
  const [showNextEp, setShowNextEp] = useState(false);
  const [user, setUser] = useState(null);
  const [showRotateHint, setShowRotateHint] = useState(false);
  const [similarVideos, setSimilarVideos] = useState([]);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState(false);
  const tagsRef = useRef(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);

  const inactivityTimeout = useRef(null);
  const noSubTimerRef = useRef(null);

  const hasSubtitle = Boolean(videoData?.subtitle);
  const location = useLocation();

  // The <video> element below is only ever mounted once showPlayer is
  // true (user tapped "Watch Now"). Nothing video-related is rendered,
  // preloaded, or auto-played before that click — this keeps the page
  // ad-safe (no player content visible/loading around the ad units on
  // first paint) and avoids accidental autoplay-with-video complaints.
  const [showPlayer, setShowPlayer] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const savedToken = localStorage.getItem("token");
    return savedToken ? { Authorization: `Bearer ${savedToken}` } : {};
  }, []);

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    if (savedUser) setUser(savedUser);
  }, []);

  const pickDefaultQuality = useCallback((qualities) => {
    const has720 = qualities.find((q) => q.label.toLowerCase().includes("720"));
    const has480 = qualities.find((q) => q.label.toLowerCase().includes("480"));
    const isMobile =
      typeof window !== "undefined" && window.innerWidth <= 768;
    if (isMobile && has480) return has480.label;
    if (has720) return has720.label;
    if (has480) return has480.label;
    return qualities[0]?.label || "";
  }, []);

  /* ---------- Control Functions ---------- */
  const togglePlayPause = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false));
    } else {
      v.pause();
      setIsPlaying(false);
      setIsBuffering(false);
    }
  }, []);

  const skip = useCallback((s) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(
      0,
      Math.min((v.duration || 0) - 0.1, v.currentTime + s)
    );
  }, []);

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted) {
      const targetVolume =
        restoreVolumeRef.current > 0 ? restoreVolumeRef.current : 0.5;
      v.muted = false;
      v.volume = targetVolume;
      setVolume(targetVolume);
      setIsMuted(false);
    } else {
      restoreVolumeRef.current = v.volume || 1;
      v.muted = true;
      setIsMuted(true);
    }
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      const isiOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isiOS && typeof v.webkitEnterFullscreen === "function") {
        v.webkitEnterFullscreen();
        return;
      }
      const el = v.parentElement;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen)
          await document.webkitExitFullscreen();
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const toggleSubs = useCallback(() => {
    if (!hasSubtitle) {
      setNoSubtitleMsg(true);
      clearTimeout(noSubTimerRef.current);
      noSubTimerRef.current = setTimeout(() => setNoSubtitleMsg(false), 2000);
      return;
    }
    setSubsOn((v) => !v);
  }, [hasSubtitle]);

  /* ---------- KEYBOARD CONTROLS ---------- */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;
      if (!showPlayer) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlayPause();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "l":
        case "arrowright":
          skip(e.key === "l" ? 10 : 5);
          break;
        case "j":
        case "arrowleft":
          skip(e.key === "j" ? -10 : -5);
          break;
        case "arrowup":
          e.preventDefault();
          setVolume((prev) => {
            const newVol = Math.min(1, prev + 0.1);
            if (videoRef.current) videoRef.current.volume = newVol;
            return newVol;
          });
          break;
        case "arrowdown":
          e.preventDefault();
          setVolume((prev) => {
            const newVol = Math.max(0, prev - 0.1);
            if (videoRef.current) videoRef.current.volume = newVol;
            return newVol;
          });
          break;
        case "c":
          toggleSubs();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPlayer, togglePlayPause, toggleFullscreen, toggleMute, toggleSubs, skip]);

  /* ---------- Data & Effects ---------- */
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const res = await axios.get(`${BASE}/api/videos/${id}`, {
          headers: getAuthHeaders(),
        });
        if (res.data) {
          setVideoData(res.data);
          if (Array.isArray(res.data.qualities) && res.data.qualities.length > 0) {
            const filtered = res.data.qualities.filter((q) => isAllowedLabel(q.label));
            const list = filtered.length > 0 ? filtered : res.data.qualities;
            setAvailableQualities(list.map((q) => q.label));
            setSelectedQuality(pickDefaultQuality(list));
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchVideo();
  }, [id, getAuthHeaders, pickDefaultQuality]);

  // Only restore progress when player is shown
  useEffect(() => {
    if (!showPlayer || !user || !videoData?._id || !videoRef.current) return;
    const restoreProgress = async () => {
      try {
        const res = await axios.get(
          `${BASE}/api/videos/progress/${user._id}/${videoData._id}`,
          { headers: getAuthHeaders() }
        );
        const lastTime = res.data.time || 0;
        const video = videoRef.current;
        const onMetadataLoaded = () => {
          if (lastTime > 1 && lastTime < video.duration)
            video.currentTime = lastTime;
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => setIsPlaying(false));
        };
        if (video.readyState >= 1) onMetadataLoaded();
        else
          video.addEventListener("loadedmetadata", onMetadataLoaded, {
            once: true,
          });
      } catch (err) {
        console.warn(err);
      }
    };
    restoreProgress();
  }, [showPlayer, user, videoData, getAuthHeaders]);

  useEffect(() => {
    const el = tagsRef.current;
    if (!el) return;
    const updateArrows = () => {
      const maxScrollLeft = el.scrollWidth - el.clientWidth;
      setShowLeftArrow(el.scrollLeft > 1);
      setShowRightArrow(el.scrollLeft < maxScrollLeft - 1);
    };
    requestAnimationFrame(updateArrows);
    el.addEventListener("scroll", updateArrows);
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [videoData]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !user || !videoData?._id || !showPlayer) return;
    let lastSave = 0;
    const onTimeUpdate = () => {
      if (
        v.duration > 0 &&
        Math.floor(v.currentTime) % 20 === 0 &&
        v.currentTime !== lastSave
      ) {
        lastSave = Math.floor(v.currentTime);
        axios
          .post(
            `${BASE}/api/videos/progress`,
            {
              userId: user._id,
              videoId: videoData._id,
              time: v.currentTime,
            },
            { headers: getAuthHeaders() }
          )
          .catch(() => {});
      }
    };
    v.addEventListener("timeupdate", onTimeUpdate);
    return () => v.removeEventListener("timeupdate", onTimeUpdate);
  }, [showPlayer, user, videoData, getAuthHeaders]);

  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimeout.current);
    setControlsHidden(false);
    inactivityTimeout.current = setTimeout(() => setControlsHidden(true), 5000);
  }, []);

  useEffect(() => {
    if (!showPlayer) return;
    const handleMouseMove = () => resetInactivityTimer();
    const handleTouchStart = () => resetInactivityTimer();
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("touchstart", handleTouchStart);
    resetInactivityTimer();
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("touchstart", handleTouchStart);
      clearTimeout(inactivityTimeout.current);
    };
  }, [showPlayer, resetInactivityTimer]);

  const goToNextEpisode = async () => {
    if (!videoData || !user) return;
    try {
      const res = await axios.get(`${BASE}/api/videos`, {
        headers: getAuthHeaders(),
      });
      const all = Array.isArray(res.data) ? res.data : res.data.videos || [];
      const sameSeries = all.filter(
        (v) => v.title === videoData.title && v.season === videoData.season
      );
      const sorted = sameSeries.sort(
        (a, b) => (a.episode || 0) - (b.episode || 0)
      );
      const currentIndex = sorted.findIndex(
        (v) => String(v._id) === String(videoData._id)
      );
      if (currentIndex !== -1 && currentIndex < sorted.length - 1) {
        const nextEp = sorted[currentIndex + 1];
        await axios.post(
          `${BASE}/api/user/progress`,
          {
            userId: user._id,
            videoId: nextEp._id,
            autoRemovePrev: true,
            prevVideoId: videoData._id,
          },
          { headers: getAuthHeaders() }
        );
        navigate(`/watch/${nextEp._id}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getVideoUrl = () => {
    if (!videoData) return null;
    if (Array.isArray(videoData.qualities) && videoData.qualities.length) {
      const filtered = videoData.qualities.filter((q) => isAllowedLabel(q.label));
      const pool = filtered.length > 0 ? filtered : videoData.qualities;
      const q = pool.find(
        (x) => String(x.label).trim() === (selectedQuality || "").trim()
      );
      if (q?.filename) return streamUrl(q.filename);
      if (pool[0]?.filename) return streamUrl(pool[0].filename);
    }
    // 1080p/4K deliberately excluded from the fallback chain.
    const fb = videoData.video720p || videoData.video480p || videoData.video;
    return fb ? streamUrl(fb) : null;
  };

  const videoUrl = getVideoUrl();

  useEffect(() => {
    if (!showPlayer) return;
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    setPlaybackError(false);
    v.src = videoUrl;
    v.load();
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      setProgress((v.currentTime / v.duration) * 100);
      setShowNextEp(
        videoData?.season &&
          videoData?.episode &&
          v.duration > 0 &&
          v.duration - v.currentTime <= 30
      );
    };
    const onLoadedMetadata = () => {
      setDuration(v.duration);
      setIsBuffering(false);
    };
    const onWaiting = () => setIsBuffering(true);
    const onPlaying = () => {
      setIsBuffering(false);
      setPlaybackError(false);
    };
    const onError = () => {
      setIsBuffering(false);
      setPlaybackError(true);
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
    };
  }, [showPlayer, videoUrl, videoData]);

  useEffect(() => {
    if (!showPlayer) return;
    const v = videoRef.current;
    if (!v || !hasSubtitle) {
      setSubtitleText("");
      return;
    }
    const track = Array.from(v.textTracks).find((t) => t.kind === "subtitles");
    if (!track) return;
    track.mode = "hidden";
    const onCueChange = () => {
      if (subsOn && track.activeCues.length > 0) {
        setSubtitleText(track.activeCues[0].text.replace(/<[^>]*>/g, ""));
      } else {
        setSubtitleText("");
      }
    };
    track.addEventListener("cuechange", onCueChange);
    if (!subsOn) setSubtitleText("");
    return () => track.removeEventListener("cuechange", onCueChange);
  }, [showPlayer, subsOn, hasSubtitle]);

  // Smart Similar Logic
  const getSimilarityScore = (a, b) => {
    let score = 0;
    if (a.category && b.category && a.category === b.category) score += 30;
    if (Array.isArray(a.tags) && Array.isArray(b.tags)) {
      const overlap = a.tags.filter((t) => b.tags.includes(t));
      score += overlap.length * 10;
    }
    if (a.title && b.title) {
      const titleA = a.title.toLowerCase().split(" ");
      const titleB = b.title.toLowerCase().split(" ");
      const common = titleA.filter((w) => titleB.includes(w));
      score += common.length * 8;
    }
    return score;
  };

  useEffect(() => {
    if (!videoData) return;
    const fetchSimilar = async () => {
      try {
        const res = await axios.get(`${BASE}/api/videos`, {
          headers: getAuthHeaders(),
        });
        const all = Array.isArray(res.data) ? res.data : res.data.videos || [];
        const scored = all
          .filter((v) => v._id !== videoData._id)
          .map((v) => ({ ...v, score: getSimilarityScore(videoData, v) }))
          .filter((v) => v.score >= 40)
          .sort((a, b) => b.score - a.score)
          .slice(0, 12);
        setSimilarVideos(scored);
      } catch (err) {
        console.error(err);
      }
    };
    fetchSimilar();
  }, [videoData, getAuthHeaders]);

  const handleProgressChange = (e) => {
    const percent = Number(e.target.value);
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = (percent / 100) * (v.duration || 0);
    setProgress(percent);
  };

  const handleVolume = (e) => {
    const vol = Number(e.target.value);
    if (videoRef.current) videoRef.current.volume = vol;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const formatTime = (s) => {
    s = isNaN(s) || s < 0 ? 0 : s;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return (
      (h ? `${h}:${m.toString().padStart(2, "0")}:` : `${m}:`) +
      sec.toString().padStart(2, "0")
    );
  };

  const thumbUrl = videoData?.landscapeThumbnail
    ? anyFileUrl(videoData.landscapeThumbnail)
    : null;
  const trackSrc = videoData?.subtitle
    ? subtitleUrlOf(videoData.subtitle)
    : null;

  return (
    <div className="watch-container">
      <Helmet>
        <title>
          {videoData?.title
            ? `${videoData.title} – Watch on CartoonLK`
            : "CartoonLK Video Player"}
        </title>
      </Helmet>

      <NavBar />

      {videoData && (
        <div className="top-section">
          <div className="thumbnail-info">
            {thumbUrl && <img src={thumbUrl} alt="Thumbnail" />}
          </div>
          <div className="info-block">
            <h2>{videoData.title}</h2>
            {(videoData.season || videoData.episode) && (
              <p>
                <b>Season:</b> {videoData.season || "N/A"}{" "}
                {videoData.episode && (
                  <>
                    | <b>Episode:</b> {videoData.episode}
                  </>
                )}
              </p>
            )}
            {videoData.releaseDate && (
              <p>
                <b>Released:</b>{" "}
                {new Date(videoData.releaseDate).toDateString()}
              </p>
            )}
            {videoData.country && (
              <p>
                <b>Country:</b> {videoData.country}
              </p>
            )}
            {videoData.duration && (
              <p>
                <b>Duration:</b> {videoData.duration}min
              </p>
            )}
            <p>
              <b>IMDb:</b> ⭐ {videoData.imdbRating || "N/A"}
            </p>
            {Array.isArray(videoData.tags) && videoData.tags.length > 0 && (
              <div className="tags-wrapper">
                <div className="tags-row" ref={tagsRef}>
                  {videoData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="tag-chip clickable"
                      onClick={() =>
                        navigate(`/browse?tag=${encodeURIComponent(tag)}`)
                      }
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                {showLeftArrow && (
                  <button
                    className="tags-arrow left"
                    onClick={() =>
                      tagsRef.current.scrollBy({
                        left: -200,
                        behavior: "smooth",
                      })
                    }
                  >
                    ❮
                  </button>
                )}
                {showRightArrow && (
                  <button
                    className="tags-arrow right"
                    onClick={() =>
                      tagsRef.current.scrollBy({
                        left: 200,
                        behavior: "smooth",
                      })
                    }
                  >
                    ❯
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WATCH NOW — nothing player-related exists in the DOM until this
          is clicked. That's what keeps the page ad-network-safe. */}
      {videoData && !showPlayer && (
        <div
          className="watch-now-container"
          style={
            thumbUrl
              ? {
                  backgroundImage: `linear-gradient(rgba(13,15,22,0.55), rgba(13,15,22,0.55)), url(${thumbUrl})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }
              : undefined
          }
        >
          <button
            className="watch-now-button"
            onClick={() => setShowPlayer(true)}
          >
            <FaPlay /> Watch Now
          </button>
        </div>
      )}

      {/* PLAYER — mounted only after Watch Now is clicked */}
      {showPlayer && (
        <div
          className={`video-wrapper ${controlsHidden ? "controls-hidden" : "controls-visible"}`}
        >
          <video
            key={videoUrl}
            ref={videoRef}
            className="video-player"
            preload="auto"
            playsInline
            controls={false}
            crossOrigin="anonymous"
            muted={isMuted}
            poster={thumbUrl || undefined}
            onContextMenu={(e) => e.preventDefault()}
          >
            {trackSrc && (
              <track
                key={trackSrc}
                src={trackSrc}
                kind="subtitles"
                srcLang="si-LK"
                label="සිංහල"
                crossOrigin="anonymous"
              />
            )}
          </video>

          {isBuffering && !playbackError && (
            <div className="buffering-overlay">
              <div className="spinner"></div>
            </div>
          )}

          {playbackError && (
            <div className="playback-error-overlay">
              <p>Video load වෙන්නේ නැහැ. Try again.</p>
              <button
                onClick={() => {
                  const v = videoRef.current;
                  if (!v || !videoUrl) return;
                  setPlaybackError(false);
                  v.src = videoUrl;
                  v.load();
                  v.play().catch(() => {});
                }}
              >
                Retry
              </button>
            </div>
          )}

          {showRotateHint && (
            <div className="rotate-hint">
              📱 Rotate your device for best experience
            </div>
          )}

          <div className="watch-progress-bar">
            <div
              className="watch-progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>

          {subsOn && subtitleText && (
            <div
              className={`subtitle-overlay ${controlsHidden ? "low" : "high"}`}
            >
              {subtitleText}
            </div>
          )}
          <div className="brand-watermark brand-watermark--br">CartoonLK</div>
          {noSubtitleMsg && <div className="toast-overlay">No Subtitles</div>}

          <div
            className="tap-zone left"
            onDoubleClick={() => {
              skip(-5);
              setShowSkipLeft(true);
              setTimeout(() => setShowSkipLeft(false), 500);
            }}
          >
            {showSkipLeft && (
              <span className="skip-overlay">
                <RiReplay5Fill />
              </span>
            )}
          </div>
          <div className="tap-zone middle" onClick={togglePlayPause}></div>
          <div
            className="tap-zone right"
            onDoubleClick={() => {
              skip(5);
              setShowSkipRight(true);
              setTimeout(() => setShowSkipRight(false), 500);
            }}
          >
            {showSkipRight && (
              <span className="skip-overlay">
                <RiForward5Fill />
              </span>
            )}
          </div>

          {showNextEp && (
            <button className="next-ep-overlay" onClick={goToNextEpisode}>
              ▶ Next Episode
            </button>
          )}

          <div
            className={`bottom-controls ${controlsHidden ? "hide-controls hide-cursor" : ""}`}
          >
            <div className="controls-row-1">
              <input
                type="range"
                className="timeline"
                min="0"
                max="100"
                value={progress}
                onChange={handleProgressChange}
                style={{ "--progress": `${progress}%` }}
              />
              <span className="time-label">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="controls-row-2">
              <div className="left-controls">
                <button onClick={() => skip(-10)}>
                  <FaBackward />
                </button>
                <button onClick={togglePlayPause}>
                  {isPlaying ? <FaPause /> : <FaPlay />}
                </button>
                <button onClick={() => skip(10)}>
                  <FaForward />
                </button>
                <button onClick={toggleMute}>
                  {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                </button>
                <input
                  type="range"
                  className="volume"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolume}
                  style={{ "--volume": `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
              <div className="right-controls">
                <button
                  className={`subtitle-button ${!hasSubtitle ? "subtitle-button--no" : ""}`}
                  onClick={toggleSubs}
                >
                  {subsOn ? <MdSubtitles /> : <MdSubtitlesOff />}
                </button>
                {availableQualities.length > 1 && (
                  <div className="quality-selector">
                    <button
                      className="quality-selector-button"
                      onClick={() => setShowQualityOptions((v) => !v)}
                    >
                      {selectedQuality || "Auto"}
                    </button>
                    {showQualityOptions && (
                      <ul className="quality-options">
                        {availableQualities.map((q) => (
                          <li
                            key={q}
                            className={selectedQuality === q ? "active" : ""}
                            onClick={() => {
                              setSelectedQuality(q);
                              setShowQualityOptions(false);
                            }}
                          >
                            {q}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <button onClick={toggleFullscreen}>
                  <FaExpand />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {videoData && (
        <div
          className="photo-section"
          style={{
            padding: "20px",
            color: "#fff",
            lineHeight: "1.6",
            marginTop: "20px",
          }}
        >
          <h3
            style={{
              borderBottom: "1px solid #333",
              paddingBottom: "10px",
              marginBottom: "15px",
              color: "#e50914",
            }}
          >
            Cartoon Story
          </h3>

          {videoData.description1 && (
            <p
              className="watch-description-text"
              style={{
                fontSize: "1.05rem",
                color: "#ddd",
                marginBottom: "20px",
                textAlign: "justify",
              }}
            >
              {videoData.description1}
            </p>
          )}

          {videoData.photo1 && (
            <div
              className="desc-photo-wrapper"
              style={{ margin: "20px 0", borderRadius: "6px", overflow: "hidden" }}
            >
              <img
                src={anyFileUrl(videoData.photo1)}
                alt={`${videoData.title} scene 1`}
                className="watch-photo"
                loading="lazy"
                style={{ width: "100%", borderRadius: "6px" }}
              />
            </div>
          )}

          {videoData.description2 && (
            <p
              className="watch-description-text"
              style={{
                fontSize: "1rem",
                color: "#bbb",
                marginBottom: "20px",
                textAlign: "justify",
              }}
            >
              {videoData.description2}
            </p>
          )}

          {videoData.photo2 && (
            <div
              className="desc-photo-wrapper"
              style={{ margin: "20px 0", borderRadius: "6px", overflow: "hidden" }}
            >
              <img
                src={anyFileUrl(videoData.photo2)}
                alt={`${videoData.title} scene 2`}
                className="watch-photo"
                loading="lazy"
                style={{ width: "100%", borderRadius: "6px" }}
              />
            </div>
          )}
        </div>
      )}

      {similarVideos.length > 0 && (
        <div className="similar-section">
          <h3>Similar Videos</h3>
          <div className="similar-row">
            {similarVideos.map((v) => (
              <Link key={v._id} to={`/watch/${v._id}`} className="similar-card">
                <img
                  src={anyFileUrl(v.landscapeThumbnail || v.thumbnail)}
                  alt={v.title}
                  loading="lazy"
                />
                <div className="similar-info">
                  <h4>{v.title}</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

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