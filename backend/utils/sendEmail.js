const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,           // 🔥 IMPORTANT
  requireTLS: true,        // 🔥 IMPORTANT
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify((err, success) => {
  if (err) {
    console.error("❌ SMTP verify failed:", err);
  } else {
    console.log("✅ SMTP ready (587 TLS)");
  }
});

module.exports = transporter;
