import React, { useState } from "react";
import "./Upload.css";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");
const UPLOAD_URL = `${BASE}/api/chunks/upload-chunk`;
const MERGE_URL = `${BASE}/api/chunks/merge-chunks`;

export default function Upload() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [fileName, setFileName] = useState("");

  // 🔑 Upload single chunk with progress
  const uploadChunk = (chunk, index, total, name) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", UPLOAD_URL);

      xhr.setRequestHeader("chunkIndex", index);
      xhr.setRequestHeader("fileName", name);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const chunkProgress = ((index + e.loaded / e.total) / total) * 100;
          setProgress(Math.min(100, chunkProgress.toFixed(2)));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) resolve();
        else reject(new Error(`Chunk ${index} failed`));
      };

      xhr.onerror = () => reject(new Error("Network error"));
      xhr.send(chunk);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileName(file.name);
    setStatus("⏳ Uploading...");
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

    try {
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        await uploadChunk(chunk, i, totalChunks, file.name);
      }

      // Merge request
      const mergeRes = await fetch(MERGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, totalChunks }),
      });

      if (!mergeRes.ok) throw new Error("Merge failed");

      setProgress(100);
      setStatus("✅ Upload completed!");
    } catch (err) {
      console.error("❌ Upload error:", err);
      setStatus(`❌ Upload failed: ${err.message}`);
    }
  };

  return (
    <div className="upload-container">
      <h2 className="upload-title">📤 Upload Video to CartoonLK</h2>
      <input type="file" onChange={handleFileChange} />
      {fileName && <p>Uploading: <b>{fileName}</b></p>}
      <progress value={progress} max="100"></progress>
      <p>{progress.toFixed(2)}%</p>
      <p>{status}</p>
    </div>
  );
}
