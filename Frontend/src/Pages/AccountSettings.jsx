import React, { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../AuthContext";
import "./AccountSettings.css";
import { useNavigate } from "react-router-dom";

// ✅ Base API setup
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const API = `${BASE.replace(/\/+$/, "")}/api`;

export default function AccountSettings() {
  const navigate = useNavigate();
  const { user, logout, setUser, token } = useAuth(); // <-- Make sure to get token from context
  const [tab, setTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(user?.profilePic || "/default-avatar.png");
  const [showPasswordEdit, setShowPasswordEdit] = useState(false);
  
  // --- REMOVED 2FA STATES ---
  // const [qrCode, setQrCode] = useState(null);
  // const [twoFAToken, setTwoFAToken] = useState("");
  // const [twoFAStage, setTwoFAStage] = useState("idle");
  // const [twoFASecret, setTwoFASecret] = useState("");
  // const [copyMsg, setCopyMsg] = useState("");
  
  const [devices, setDevices] = useState([]);
  const [deviceLoading, setDeviceLoading] = useState(false);

  // 🔹 Create an axios instance with auth headers
  const api = axios.create({
    baseURL: `${API}/auth`,
    headers: token ? { Authorization: `Bearer ${token}` } : {},

  });

  // 🔹 Handle text input change
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔹 Save profile info (name/email)
  const handleSave = async () => {
    try {
      setLoading(true);
      const res = await api.put(`/update/${user._id}`, { name: form.name, email: form.email });
      const updatedUser = res.data.user;
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setMessage("✅ Profile updated successfully");
      setEditing(false);
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to update profile");
      setTimeout(() => setMessage(""), 4000);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Upload new profile picture
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const res = await api.post(`/upload-pic/${user._id}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      console.log("✅ Updated profile picture:", res.data.url);

      // ✅ Update user context + localStorage + preview
      const updated = { ...user, profilePic: res.data.url };
      setUser(updated);
      localStorage.setItem("user", JSON.stringify(updated));
      setPreview(`${res.data.url}?v=${Date.now()}`); // cache-buster
      setMessage("✅ Profile picture updated!");
      setTimeout(() => setMessage(""), 4000);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setMessage("❌ Failed to upload picture");
      setTimeout(() => setMessage(""), 4000);
    } finally {
      setUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!form.currentPassword || !form.newPassword) {
      setMessage("⚠️ Please fill both fields");
      setTimeout(() => setMessage(""), 4000);
      return;
    }

    try {
      setLoading(true);
      const res = await api.put(`/change-password/${user._id}`, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });

      setMessage("✅ Password updated successfully!");
      setForm({
        ...form,
        currentPassword: "",
        newPassword: "",
      });
      setShowPasswordEdit(false); // Close the form
    } catch (err) {
      console.error("❌ Password update failed:", err);
      const msg =
        err.response?.data?.message || "❌ Invalid current password or server error";
      setMessage(msg);
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };
  
  // --- REMOVED 2FA HANDLERS ---
  // handleEnable2FA, handleVerify2FA, handleDisable2FA are all removed.
  
  // 🔹 Load user's logged-in devices
  const loadDevices = async () => {
    // --- BSONERROR FIX 1 ---
    if (!user?._id) {
      console.log("User not ready, skipping device fetch.");
      return; // Stop the function if user is not loaded
    }
    // --- END OF FIX ---

    try {
      setDeviceLoading(true);
      console.log("🟡 Fetching devices from:", `${api.defaults.baseURL}/devices/${user._id}`);
      const res = await api.get(`/auth/devices/${user._id}`);
      console.log("🟢 Response:", res.data);
      setDevices(res.data || []);
    } catch (err) {
      console.error("❌ Failed to load devices:", err.response || err.message);
      setMessage("Failed to load devices");
    } finally {
      setDeviceLoading(false);
    }
  };

  const handleLogoutAll = async () => {
    if (!window.confirm("Are you sure you want to log out of all devices?")) return;
    try {
      await api.post(`/logout-all/${user._id}`);

      // ✅ Forcefully remove all session data from browser
      logout(); // Use the logout function from context
      setDevices([]);
      setMessage("✅ All devices logged out!");
      navigate("/auth"); // redirect to login page
    } catch (err) {
      console.error("❌ Logout-all failed:", err);
      setMessage("Failed to log out of all devices");
    } finally {
      setTimeout(() => setMessage(""), 4000);
    }
  };

  // 🔹 Auto-load devices when tab selected
  useEffect(() => {
    if (tab === "devices") {
      loadDevices();
    }
  }, [tab, user]); // <-- BSONERROR FIX 2: Added 'user'

  const handleLogoutOne = async (deviceId) => {
    if (!window.confirm("Log out this device?")) return;
    try {
      await api.post(`/logout-device/${user._id}/${deviceId}`);
      setDevices((prev) => prev.filter((d) => d._id !== deviceId));
      setMessage("✅ Device logged out!");

      // Check if user logged out their *current* device
      // This is complex, better to just remove from list.
      // If you logged out your own session, you'll find out on next refresh.
      
    } catch (err) {
      console.error("❌ Single logout failed:", err);
      setMessage("Failed to log out this device");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className="account-container">
      {/* 🔹 Tabs */}
      <div className="account-tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          Overview
        </button>
        <button
          className={tab === "security" ? "active" : ""}
          onClick={() => setTab("security")}
        >
          Security
        </button>
        <button
          className={tab === "devices" ? "active" : ""}
          onClick={() => setTab("devices")}
        >
          Devices
        </button>
      </div>

      {/* 🔸 Content */}
      <div className="tab-content">
        {/* === Overview Tab === */}
        {tab === "overview" && (
          <div className="tab-pane">
            <h2>Profile Overview</h2>

            {/* === Profile Picture Upload === */}
            <div className="profile-photo-block">
              <img src={preview} alt="Profile" className="profile-preview" />
              <label className="upload-btn">
                📸 {uploading ? "Uploading..." : "Change Photo"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* === Info / Edit Form === */}
            {!editing ? (
              <div className="info-card">
                <p><strong>Name:</strong> {user?.name}</p>
                <p><strong>Email:</strong> {user?.email}</p>
                <p>
                  <strong>Member since:</strong>{" "}
                  {user?.createdAt?.slice(0, 10) || "N/A"}
                </p>
                <button className="security-btn" onClick={() => setEditing(true)}>
                  ✏️ Edit Profile
                </button>
              </div>
            ) : (
              <div className="edit-form">
                <label>
                  Name:
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                  />
                </label>
                <label>
                  Email:
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </label>
                <div className="button-row">
                  <button onClick={handleSave} disabled={loading} className="blue-btn">
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                  <button onClick={() => setEditing(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
                {message && <p className="status-msg">{message}</p>}
              </div>
            )}
          </div>
        )}

        {/* === Security Tab === */}
        {tab === "security" && (
          <div className="tab-pane">
            <h2>Security Settings</h2>

            {/* --- Password Section --- */}
            <div className="info-card">
              <h3>Password</h3>
              <p>Change your account password securely.</p>

              {!showPasswordEdit ? (
                <button
                  className="security-btn"
                  onClick={() => setShowPasswordEdit(true)}
                >
                  ✏️ Edit Password
                </button>
              ) : (
                <div className="password-edit-form">
                  <label>
                    Current Password:
                    <input
                      type="password"
                      name="currentPassword"
                      placeholder="Enter current password"
                      value={form.currentPassword || ""}
                      onChange={handleChange}
                    />
                  </label>

                  <label>
                    New Password:
                    <input
                      type="password"
                      name="newPassword"
                      placeholder="Enter new password"
                      value={form.newPassword || ""}
                      onChange={handleChange}
                    />
                  </label>

                  <div className="button-row">
                    <button
                      className="blue-btn"
                      disabled={loading}
                      onClick={handlePasswordChange}
                    >
                      {loading ? "Updating..." : "Save"}
                    </button>

                    <button
                      className="cancel-btn"
                      onClick={() => setShowPasswordEdit(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {message && <p className="status-msg">{message}</p>}
            </div>

            {/* --- 2FA SECTION REMOVED --- */}
            {/* The old QR Code 2FA card was here. It is now gone. */}
            
          </div>
        )}

        {/* === Devices Tab === */}
        {tab === "devices" && (
          <div className="tab-pane">
            <h2>Logged-in Devices</h2>
            <div className="info-card">
              <p>View where your account is currently signed in.</p>

              {deviceLoading ? (
                <p>🔄 Loading devices...</p>
              ) : !Array.isArray(devices) || devices.length === 0 ? (
                <p>No active devices found.</p>
              ) : (
                <ul className="device-list">
                  {devices.map((d, i) => (
                    <li key={d._id || i}> {/* Added fallback key */}
                      <strong>{d.deviceName}</strong>
                      <br />
                      <span style={{ color: "#9cb3d3", fontSize: "13px" }}>
                        IP: {d.ip || "Unknown"} • Logged in at:{" "}
                        {new Date(d.loggedInAt).toLocaleString()}
                      </span>
                      <br />
                      <button
                        className="logout-one-btn"
                        onClick={() => handleLogoutOne(d._id)}
                      >
                        Log out this device
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <hr style={{ opacity: 0.2, margin: "15px 0" }} />

              <button className="security-btn" onClick={handleLogoutAll}>
                Log out of all devices
              </button>

              {message && <p className="status-msg">{message}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}