const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true, // port 465 -> SSL
  requireTLS: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// App start wenakota mekama check karanawa - console eke result eka balanna
transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP verify failed:", err);
  } else {
    console.log("✅ SMTP ready (465 SSL)");
  }
});

module.exports = transporter;