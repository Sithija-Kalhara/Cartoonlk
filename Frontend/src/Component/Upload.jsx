import React, { useEffect, useState } from "react";
import "./Upload.css";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Upload() {
  const [authorized, setAuthorized] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({
    title: "",
    name: "",
    category: "",
    season: "",
    episode: "",
    releaseDate: "",
    country: "",
    duration: "",
    tags: "",
    imdbRating: "",
    downloadLink: "",
    qualityNotice: "",
    description1: "",
    description2: "",
    description3: "",
    description4: "",
    video4KLink: "",
    video1080pLink: "",
    video720pLink: "",
    video480pLink: "",
  });
  const [files, setFiles] = useState({});

  // ✅ Dynamic lists
  const [actors, setActors] = useState([{ name: "", photo: "" }]);
  const [dubbers, setDubbers] = useState([{ name: "", photo: "" }]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    setFiles({ ...files, [e.target.name]: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setStatus("⏳ Saving video metadata...");

      const formData = new FormData();

      for (const key in form) {
        if (form[key]) formData.append(key, form[key]);
      }

      for (const key in files) {
        if (files[key]) formData.append(key, files[key]);
      }

      // ✅ Serialize actors & dubbers
      formData.append("actors", JSON.stringify(actors));
      formData.append("dubbing", JSON.stringify(dubbers));

      setStatus("🚀 Uploading to server...");
      const res = await fetch(`${BASE}/api/videos/save`, {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok) {
        setStatus(`✅ Saved: ${json.video?.title || "Success"}`);
        setForm({});
        setFiles({});
        setActors([{ name: "", photo: "" }]);
        setDubbers([{ name: "", photo: "" }]);
      } else {
        setStatus(`❌ Server error: ${json.error || res.status}`);
      }
    } catch (err) {
      setStatus(`❌ Save failed: ${err.message}`);
    }
  };

  /* ----------------------------
      🔐 Admin Token Validation
  ----------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) return (window.location.href = "/admin-login");

    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        alert("Session expired. Please log in again.");
        localStorage.removeItem("adminToken");
        return (window.location.href = "/admin-login");
      }
    } catch {
      localStorage.removeItem("adminToken");
      return (window.location.href = "/admin-login");
    }

    setAuthorized(true);
  }, []);

  if (!authorized) return <p>🔒 Checking admin access...</p>;

  return (
    <div className="upload-container">
      <h2>📤 Upload Video Metadata</h2>
      <form onSubmit={handleSubmit}>
        {/* --- Basic Info --- */}
        <input type="text" name="title" placeholder="Title" onChange={handleChange} required />
        <input type="text" name="name" placeholder="Episode Name (optional)" onChange={handleChange} />
        <input type="text" name="category" placeholder="Category (e.g., Cartoon, English)" onChange={handleChange} />
        <input type="number" name="season" placeholder="Season" onChange={handleChange} />
        <input type="number" name="episode" placeholder="Episode" onChange={handleChange} />
        <input type="date" name="releaseDate" onChange={handleChange} />
        <input type="text" name="country" placeholder="Country" onChange={handleChange} />
        <input type="text" name="duration" placeholder="Duration" onChange={handleChange} />
        <input type="text" name="tags" placeholder="Tags" onChange={handleChange} />
        <input type="number" name="imdbRating" placeholder="IMDb (e.g., 6.2)" step="0.1" onChange={handleChange} />
        <input type="text" name="downloadLink" placeholder="Download Link" onChange={handleChange} />
        <input type="text" name="qualityNotice" placeholder="Notice" onChange={handleChange} />
        <textarea name="description1" placeholder="Description 1" onChange={handleChange} />
        <label>🎬 Trailer Link (optional)</label>
        <input type="text" name="trailerLink" placeholder="Paste R2 or external trailer link" onChange={handleChange} />

        
       {/* --- Video Links --- */}
        {["4K", "1080p", "720p", "480p"].map((q) => (
          <div key={q}>
            <label>🎞️ {q} Link</label>
            <input type="text" name={`video${q}Link`} placeholder={`Paste R2 ${q} Link`} onChange={handleChange} />
          </div>
        ))}

        {/* --- Thumbnails --- */}
        <label>🖼️ Thumbnail</label>
        <input type="text" name="thumbnailLink" placeholder="Paste thumbnail link" onChange={handleChange} />
        <label>🌆 Landscape Thumbnail</label>
        <input type="text" name="landscapeThumbnailLink" placeholder="Paste landscape link" onChange={handleChange} />

        {/* --- Photos --- */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <label>📸 Photo {i}</label>
            <input type="text" name={`photo${i}Link`} placeholder={`Photo ${i} link`} onChange={handleChange} />
            <input type="text" name={`description${i}`} placeholder={`Description ${i}`} onChange={handleChange} />
          </div>
        ))}

        {/* --- Actors --- */}
        <h3>🎭 Actors</h3>
        {actors.map((a, i) => (
          <div key={i} className="actor-row">
            <input
              type="text"
              placeholder="Actor Name"
              value={a.name}
              onChange={(e) => {
                const updated = [...actors];
                updated[i].name = e.target.value;
                setActors(updated);
              }}
            />
            <input
              type="text"
              placeholder="Actor Photo Link"
              value={a.photo}
              onChange={(e) => {
                const updated = [...actors];
                updated[i].photo = e.target.value;
                setActors(updated);
              }}
            />
            <button type="button" onClick={() => setActors(actors.filter((_, idx) => idx !== i))}>❌</button>
          </div>
        ))}
        <button type="button" onClick={() => setActors([...actors, { name: "", photo: "" }])}>➕ Add Actor</button>

        {/* --- Dubbers --- */}
        <h3>🎙️ Dubbers</h3>
        {dubbers.map((d, i) => (
          <div key={i} className="dubber-row">
            <input
              type="text"
              placeholder="Dubber Name"
              value={d.name}
              onChange={(e) => {
                const updated = [...dubbers];
                updated[i].name = e.target.value;
                setDubbers(updated);
              }}
            />
            <input
              type="text"
              placeholder="Dubber Photo Link"
              value={d.photo}
              onChange={(e) => {
                const updated = [...dubbers];
                updated[i].photo = e.target.value;
                setDubbers(updated);
              }}
            />
            <button type="button" onClick={() => setDubbers(dubbers.filter((_, idx) => idx !== i))}>❌</button>
          </div>
        ))}
        <button type="button" onClick={() => setDubbers([...dubbers, { name: "", photo: "" }])}>➕ Add Dubber</button>

        {/* --- Subtitle --- */}
        <label>💬 Subtitle</label>
        <input type="file" name="subtitle" accept=".vtt" onChange={handleFileChange} />
        <input type="text" name="subtitleLink" placeholder="or paste subtitle link" onChange={handleChange} />

        <button type="submit">🚀 Upload</button>
      </form>
      <p>{status}</p>
    </div>
  );
}
