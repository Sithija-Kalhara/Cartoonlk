const User = require("../models/User");
const transporter = require("../utils/mailer");

console.log("🔥🔥 movieRequestController LOADED 🔥🔥");


const createMovieRequest = async (req, res) => {
  try {
    console.log("🔥 Movie request API hit");

    const { movieName } = req.body;
    if (!movieName || !movieName.trim()) {
      return res.status(400).json({ message: "Movie name required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.movieRequests.push({ movieName: movieName.trim() });
    await user.save();

    console.log("🎬 Saved request, sending email…");

    const info = ({
      from: `"CartoonLK" <${process.env.EMAIL_USER}>`,
      to: "sithijakalhara2@gmail.com",
      subject: "🎬 New Movie Request",
      html: `
        <p><b>Movie:</b> ${movieName}</p>
        <p><b>User:</b> ${user.name}</p>
        <p><b>Email:</b> ${user.email}</p>
      `,
    });

    console.log("📧 Movie request mail sent:", info.messageId);

    res.json({ message: "Movie request sent" });
  } catch (err) {
    console.error("❌ Movie request error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createMovieRequest };
