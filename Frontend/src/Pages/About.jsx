import React from "react";
import { Helmet } from "react-helmet";
import NavBar from "../Component/NavBar";
import "./Pages.css";

const About = () => {
  return (
    <div className="cartoon-container">
      <Helmet>
        <title>About – CartoonLK | Sri Lanka’s #1 Cartoon Streaming Platform</title>
        <meta
          name="description"
          content="CartoonLK is Sri Lanka’s first HD cartoon and anime streaming site built by the Eyerone Team. Enjoy high-quality Sinhala, English, and Japanese content."
        />
        <link rel="canonical" href="https://cartoonlk.com/about" />
      </Helmet>

      <NavBar />

      <div className="page-content">
        <h1>About CartoonLK</h1>
        <p>
          <b>CartoonLK</b> is a modern cartoon and anime streaming platform created by the
          <b> Eyerone Team</b>. Our mission is to bring the best of international and Sri Lankan
          animated entertainment together in one place — free, fast, and ad-light.
        </p>

        <p>
          We feature <b>English, Sinhala, Hindi, and Japanese</b> cartoons and anime series with smooth
          playback and HD quality. Our platform is designed for simplicity, accessibility, and fun!
        </p>

        <p>
          Whether you grew up watching classics or are exploring new releases, CartoonLK is
          built for fans who truly love animation.
        </p>

        <h2>Ownership & Copyright</h2>
        <p>
          All original content on CartoonLK (including Sinhala dubs, artwork, and UI design) is
          owned and managed by the <b>Eyerone Team</b>. Third-party shows and animations featured
          here are presented under fair-use, fan-dubbing, or official content-sharing permissions.
        </p>

        <p>
          If you are a copyright holder and wish to contact us regarding content usage,
          please email us at <b>support@cartoonlk.com</b>. We take copyright compliance seriously
          and respond promptly to all verified requests.
        </p>

        <h2>Disclaimer</h2>
        <p>
          CartoonLK does not claim ownership of any third-party brands, logos, or shows
          displayed on this site. All trademarks belong to their respective owners.
        </p>
      </div>

      <footer className="footer">
        © {new Date().getFullYear()} CartoonLK | Owned and Operated by Eyerone Team. <br />
        All Rights Reserved. | <a href="/copyright-policy">Copyright Policy</a>
      </footer>
    </div>
  );
};

export default About;
