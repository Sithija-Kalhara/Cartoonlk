import React, { useState } from "react";
import axios from "axios";
import "./ResetFlow.css";
import { useNavigate } from "react-router-dom";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ResetFlow() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=email → 2=verify → 3=reset
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(false);

  const fadeStyle = {
    transition: "opacity 0.4s ease",
    opacity: loading ? 0.5 : 1,
  };

  // 🔹 Step 1: Request reset email
  const handleEmail = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    setLoading(true);

    try {
      const res = await axios.post(`${BASE}/api/auth/request-reset`, { email });
      setMessage({ text: res.data.message, type: "success" });
      setTimeout(() => setStep(2), 1000); // move to verify
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "❌ Something went wrong!",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Step 2: Verify code
  const handleVerify = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });
    setLoading(true);

    try {
      const res = await axios.post(`${BASE}/api/auth/verify-reset-code`, {
        email,
        otp,
      });
      setMessage({ text: res.data.message, type: "success" });
      setToken(res.data.token);
      console.log("🧩 Saved token:", res.data.token);
      setTimeout(() => setStep(3), 1000);
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "❌ Invalid or expired code!",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Step 3: Reset password
  const handleReset = async (e) => {
    e.preventDefault();
    setMessage({ text: "", type: "" });

    if (newPassword !== confirmPassword) {
      setMessage({ text: "❌ Passwords do not match!", type: "error" });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${BASE}/api/auth/reset-password`, {
        token,
        newPassword,
      });
      setMessage({
        text: "✅ Password reset successful! Redirecting to login...",
        type: "success",
      });
      setTimeout(() => navigate("/auth"), 1500);
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || "❌ Invalid or expired token!",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container" style={fadeStyle}>
        <h2 style={{ marginBottom: "10px" }}>
          {step === 1
            ? "Forgot Password"
            : step === 2
            ? "Verify Code"
            : "Set New Password"}
        </h2>

        {message.text && (
          <p className={`message ${message.type}`}>{message.text}</p>
        )}

        {/* Step 1 — Enter email */}
        {step === 1 && (
          <form className="auth-form" onSubmit={handleEmail}>
            <p style={{ marginBottom: "8px" }}>
              Enter your account email to receive a code.
            </p>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Code"}
            </button>
          </form>
        )}

        {/* Step 2 — Verify Code */}
{step === 2 && (
  <form className="auth-form" onSubmit={handleVerify}>
    <p style={{ marginBottom: "8px" }}>
      Enter the 6-digit code sent to <strong>{email}</strong>
    </p>

    {/* OTP Input */}
    <input
      type="text"
      placeholder="Enter 6-digit code"
      value={otp}
      onChange={(e) => setOtp(e.target.value)}
      required
    />

    {/* PRIMARY VERIFY BUTTON (first) */}
    <button type="submit" disabled={loading}>
      {loading ? "Verifying..." : "Verify Code"}
    </button>

    {/* 🔁 RESEND CODE BUTTON (AFTER VERIFY) */}
    <button
      type="button"
      onClick={async () => {
        try {
          setMessage({ text: "Sending a new code...", type: "success" });
          await axios.post(`${BASE}/api/auth/request-reset`, { email });
          setMessage({
            text: "✔ A new verification code has been sent!",
            type: "success",
          });
        } catch (err) {
          setMessage({
            text: err.response?.data?.message || "❌ Failed to resend code!",
            type: "error",
          });
        }
      }}
      style={{
        width: "100%",
        marginTop: "12px",
        background: "linear-gradient(90deg, #00f7ff60, #5900ff41)",
        color: "#fff",
        padding: "10px 16px",
        borderRadius: "8px",
        border: "none",
        cursor: "pointer",
        fontWeight: "600",
      }}
    >
      Resend Code
    </button>

    <p
      className="switch"
      onClick={() => setStep(1)}
      style={{ marginTop: "10px" }}
    >
      ← Back
    </p>
  </form>
)}



        {/* Step 3 — Set New Password */}
        {step === 3 && (
          <form className="auth-form" onSubmit={handleReset}>
            <p style={{ marginBottom: "8px" }}>
              Enter your new password below.
            </p>
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Reset Password"}
            </button>
          </form>
        )}

        {/* Back to login link */}
        {step !== 3 && (
          <p
            className="switch"
            onClick={() => navigate("/auth")}
            style={{ marginTop: "10px" }}
          >
            ← Back to Login
          </p>
        )}
      </div>
    </div>
  );
}
