import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Auth.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import logo from "/logo192.png"; // Replace with your logo path

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function Auth() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState({ text: "", type: "" });

  // --- NEW: OTP states (replaces 2FA states) ---
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [otpToken, setOtpToken] = useState("");
  const [tempUserId, setTempUserId] = useState(null);

  // --- Resend verification state ---
  const [showResend, setShowResend] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("verified") === "true") {
      setMessage({
        text: "✅ Email verified successfully! Please log in.",
        type: "success",
      });
      window.history.replaceState(null, null, window.location.pathname);
    }
  }, []);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    setShowResend(false);
    try {
      const endpoint = mode === "login" ? "/login" : "/register";
      const res = await axios.post(`${BASE}/api/auth${endpoint}`, form);

      // --- NEW: Check for Email OTP ---
      if (mode === "login" && res.data.otpRequired) {
        setTempUserId(res.data.userId);
        setShowOtpForm(true); // Show the OTP form
        setMessage({ text: "Check your email for a 6-digit code.", type: "success" });
      } else if (mode === "login") {
        // Fallback for some reason, but should not be hit
        login(res.data);
        navigate("/");
      } else {
        // Registration success
        setMessage({ text: res.data.message, type: "success" });
        setForm({ name: "", email: "", password: "" });
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "❌ Something went wrong!";
      setMessage({ text: errorMsg, type: "error" });

      // Check for the "Please verify" error to show resend button
      if (mode === "login" && err.response?.data?.resend) {
        setShowResend(true);
      }
    }
  };

  // --- NEW: Handle OTP Submit (replaces handle2FASubmit) ---
const handleOtpSubmit = async (e) => {
  e.preventDefault();
  if (!tempUserId || !otpToken) {
    setMessage({ text: "Invalid request", type: "error" });
    return;
  }

  try {
    // Get timezone
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // ⭐ Get REAL IPv4 from API
    const realIp = await getRealIP();

    const res = await axios.post(`${BASE}/api/auth/login-verify-email`, {
      userId: tempUserId,
      token: otpToken,
      timezone,
      ip: realIp, 
    });

    login(res.data);
    navigate("/");
  } catch (err) {
    setMessage({
      text: err.response?.data?.message || "❌ Invalid or expired code!",
      type: "error",
    });
  }
};


      const getRealIP = async () => {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    return data.ip; // Real public IPv4
  } catch {
    return null;
  }
};


  const switchMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setMessage({ text: "", type: "" });
    setForm({ name: "", email: "", password: "" });
    setShowOtpForm(false);
    setTempUserId(null);
    setOtpToken("");
    setShowResend(false);
  };

  // --- Resend Email Handler (for registration) ---
  const handleResend = async () => {
    if (!form.email) {
      setMessage({ text: "Please enter your email in the field above.", type: "error" });
      return;
    }
    try {
      setMessage({ text: "Sending new email...", type: "success" });
      const res = await axios.post(`${BASE}/api/auth/resend-verify`, {
        email: form.email,
      });
      setMessage({ text: res.data.message, type: "success" });
      setShowResend(false); // Hide button after success
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "Error resending email.",
        type: "error",
      });
    }
  };

  

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        {/* Header */}
        <div className="auth-header">
          <img src={logo} alt="Logo" className="auth-logo" />
          <h1 className="brand-title">
            Cartoon<span>LK</span>
          </h1>
          <p className="brand-subtitle">Watch your world in Sinhala 🎬</p>
        </div>

          {showOtpForm ? (
            <form className="auth-form" onSubmit={handleOtpSubmit}>
              <h2>Check Your Email</h2>

              {message.text && (
                <p className={`message ${message.type}`}>{message.text}</p>
              )}

              <input
                type="text"
                name="otpToken"
                placeholder="6-digit code from email"
                value={otpToken}
                onChange={(e) => setOtpToken(e.target.value)}
                required
                autoFocus
                maxLength="6"
              />

              <button type="submit">Verify & Login</button>

              {/* 🔁 RESEND OTP BUTTON */}
              <button
                type="button"
                className="resend-btn"
                style={{
                  marginTop: "12px",
                  background: "linear-gradient(90deg, #00f7ff60, #5900ff41)",
                  color: "#fff",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={async () => {
                  try {
                    setMessage({ text: "Sending new code...", type: "success" });

                    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    const realIp = await getRealIP();

                    await axios.post(`${BASE}/api/auth/login`, {
                      email: form.email,
                      password: form.password,
                    });

                    setMessage({
                      text: "✅ New code sent to your email.",
                      type: "success",
                    });
                  } catch (err) {
                    setMessage({
                      text: "❌ Failed to resend code.",
                      type: "error",
                    });
                  }
                }}
              >
                Resend Code
              </button>

              <p
                className="switch"
                onClick={() => {
                  setShowOtpForm(false);
                  setTempUserId(null);
                  setOtpToken("");
                  setMessage({ text: "", type: "" });
                }}
              >
                Back to login
              </p>
            </form>
  ) : (
          // --- Login/Register form ---
          <form className="auth-form" onSubmit={handleSubmit}>
            <h2>{mode === "login" ? "Login" : "Register"}</h2>

            {message.text && (
              <p className={`message ${message.type}`}>{message.text}</p>
            )}

            {mode === "register" && (
              <input
                type="text"
                name="name"
                placeholder="Name"
                value={form.name}
                onChange={handleChange}
                required
              />
            )}

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
            />

            {mode === "login" && (
              <p
                onClick={() => navigate("/reset-flow")}
                style={{
                  color: "#4CAF50",
                  cursor: "pointer",
                  marginTop: "6px",
                  textAlign: "right",
                  fontSize: "14px",
                }}
              >
                Forgot password?
              </p>
            )}

            <button type="submit">
              {mode === "login" ? "Login" : "Register"}
            </button>

            {/* --- RESEND BUTTON --- */}
            {mode === "login" && showResend && (
              <button
                type="button"
                className="resend-btn"
                onClick={handleResend}
              >
                Resend Verification Email
              </button>
            )}

            <p className="switch" onClick={switchMode}>
              {mode === "login"
                ? "Don't have an account? Register here"
                : "Already have an account? Login here"}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}