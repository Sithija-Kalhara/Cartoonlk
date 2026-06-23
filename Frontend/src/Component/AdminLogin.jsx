import { useState } from "react";
import "./Adminlogin.css";

const BASE = import.meta.env.VITE_API_URL;

export default function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("adminToken", data.token);
        window.location.href = "/upload";
      } else {
        setStatus("❌ Invalid credentials");
      }
    } catch (err) {
      setStatus("❌ Error: " + err.message);
    }
  };

  return (
    <div className="login-container">
      <h2>🔐 Admin Login</h2>
      <form onSubmit={handleLogin}>
        <input type="text" placeholder="Username" onChange={(e) => setUsername(e.target.value)} />
        <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
        <button type="submit">Login</button>
      </form>
      <p>{status}</p>
    </div>
  );
}
