import React, { createContext, useContext, useState, useEffect } from "react";

// 🔹 Create Context
const AuthContext = createContext();

// 🔹 Custom hook (easy import)
export const useAuth = () => useContext(AuthContext);

// 🔹 Provider Component
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧩 Load user on app start (restore session)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("user");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(parsed);
      }
    } catch (err) {
      console.warn("⚠️ Failed to parse saved user:", err);
      localStorage.removeItem("user");
    } finally {
      setLoading(false);
    }
  }, []);

  // 🚀 Login → set + save user
  const login = (data) => {
    if (!data) return;
    setUser(data);
    localStorage.setItem("user", JSON.stringify(data));
  };

  // 🚪 Logout → clear user + localStorage
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  // 🧠 Optional: token getter helper
  const getToken = () => {
    try {
      const u = JSON.parse(localStorage.getItem("user"));
      return u?.token || null;
    } catch {
      return null;
    }
  };

    return (
      <AuthContext.Provider
        value={{ user, setUser, login, logout, getToken, loading }}
      >
        {!loading && children}
      </AuthContext.Provider>
    );

};
