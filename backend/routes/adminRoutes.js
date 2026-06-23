const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USERNAME;
const ADMIN_PASS = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || "defaultsecret";

// ✅ Admin login route (case-insensitive username)
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  console.log("🟢 Incoming:", username, password);
  console.log("🟣 Env:", process.env.ADMIN_USERNAME, process.env.ADMIN_PASSWORD);

  if (
    username?.toLowerCase() === process.env.ADMIN_USERNAME?.toLowerCase() &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ token });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});


// ✅ Middleware to protect admin-only routes
const verifyAdmin = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(403).json({ error: "No token provided" });

  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role === "admin") return next();
    else return res.status(403).json({ error: "Unauthorized" });
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
};

module.exports = { router, verifyAdmin };
