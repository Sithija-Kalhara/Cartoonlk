// Player.jsx
import React, { useRef, useState, useEffect, useCallback } from "react";
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
import axios from "axios";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const PUBLIC_CDN = import.meta.env.PUBLIC_CDN || "https://media.cartoonlk.com";

// Only these qualities are ever exposed to the user (saves bandwidth,
// keeps storage/CDN cost down, and removes 1080p/4K completely).
const ALLOWED_QUALITIES = ["480p", "720p"];
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

export default function Player({
  videoData,
  user,
  selectedQuality,
  setSelectedQuality,
  onProgressUpdate,
  onTimeUpdate,
  onNextEpisode,
  autoPlay = true,
  poster,
}) {
  const videoRef = useRef(null);

  const [availableQualities, setAvailableQualities] = useState([]);
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
  const [showNextEp, setShowNextEp] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [playbackError, setPlaybackError] = useState(false);

  const inactivityTimeout = useRef(null);
  const noSubTimerRef = useRef(null);

  const hasSubtitle = Boolean(videoData?.subtitle);

  // Pick a sensible default quality: mobile → 480p first (saves data),
  // desktop → 720p first. Falls back to whatever is available.
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

  // Get video qualities from videoData — filtered down to 480p/720p only
  useEffect(() => {
    if (videoData && Array.isArray(videoData.qualities) && videoData.qualities.length > 0) {
      const filtered = videoData.qualities.filter((q) => isAllowedLabel(q.label));
      const list = filtered.length > 0 ? filtered : videoData.qualities;
      setAvailableQualities(list.map((q) => q.label));
      if (!selectedQuality) {
        setSelectedQuality(pickDefaultQuality(list));
      }
    }
  }, [videoData, selectedQuality, setSelectedQuality, pickDefaultQuality]);

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
    // 1080p/4K sources are intentionally excluded from the fallback chain.
    const fb = videoData.video720p || videoData.video480p || videoData.video;
    return fb ? streamUrl(fb) : null;
  };

  const videoUrl = getVideoUrl();
  const trackSrc = videoData?.subtitle ? subtitleUrlOf(videoData.subtitle) : null;

  /* ---------- Auth headers helper ---------- */
  const getAuthHeaders = useCallback(() => {
    const savedToken = localStorage.getItem("token");
    return savedToken ? { Authorization: `Bearer ${savedToken}` } : {};
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

  /* ---------- Keyboard Controls ---------- */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

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
  }, [togglePlayPause, toggleFullscreen, toggleMute, toggleSubs, skip]);

  /* ---------- Reset Inactivity Timer ---------- */
  const resetInactivityTimer = useCallback(() => {
    clearTimeout(inactivityTimeout.current);
    setControlsHidden(false);
    inactivityTimeout.current = setTimeout(() => setControlsHidden(true), 5000);
  }, []);

  useEffect(() => {
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
  }, [resetInactivityTimer]);

  /* ---------- Restore Progress ---------- */
  useEffect(() => {
    if (!user || !videoData?._id || !videoRef.current || !autoPlay) return;
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
  }, [user, videoData, getAuthHeaders, autoPlay]);

  /* ---------- Save Progress ---------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !user || !videoData?._id) return;
    let lastSave = 0;
    const onTimeUpdateHandler = () => {
      setCurrentTime(v.currentTime);
      setProgress((v.currentTime / v.duration) * 100);
      setShowNextEp(
        videoData?.season &&
          videoData?.episode &&
          v.duration > 0 &&
          v.duration - v.currentTime <= 30
      );

      if (onTimeUpdate) onTimeUpdate(v.currentTime);

      if (
        v.duration > 0 &&
        Math.floor(v.currentTime) % 20 === 0 &&
        v.currentTime !== lastSave
      ) {
        lastSave = Math.floor(v.currentTime);
        if (onProgressUpdate) {
          onProgressUpdate(v.currentTime);
        } else {
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
      }
    };
    const onLoadedMetadata = () => {
      setDuration(v.duration);
      setIsBuffering(false);
      setPlaybackError(false);
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

    v.addEventListener("timeupdate", onTimeUpdateHandler);
    v.addEventListener("loadedmetadata", onLoadedMetadata);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("timeupdate", onTimeUpdateHandler);
      v.removeEventListener("loadedmetadata", onLoadedMetadata);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("error", onError);
    };
  }, [videoUrl, videoData, user, getAuthHeaders, onProgressUpdate, onTimeUpdate]);

  /* ---------- Subtitle Track ---------- */
  useEffect(() => {
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
  }, [subsOn, hasSubtitle]);

  // Reload video when quality changes
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoUrl) return;
    const wasPlaying = !v.paused;
    setPlaybackError(false);
    v.src = videoUrl;
    v.load();
    if (wasPlaying && autoPlay) {
      v.play().catch(() => {});
    }
  }, [videoUrl, autoPlay]);

  return (
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
        poster={poster || undefined}
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

      {showNextEp && onNextEpisode && (
        <button className="next-ep-overlay" onClick={onNextEpisode}>
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
  );
}