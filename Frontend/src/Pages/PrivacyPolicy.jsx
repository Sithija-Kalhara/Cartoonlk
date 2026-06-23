import React from "react";
import { Helmet } from "react-helmet";
import NavBar from "../Component/NavBar";
import "./Pages.css";

const PrivacyPolicy = () => {
  return (
    <div className="cartoon-container">
      <Helmet>
        <title>Privacy Policy – CartoonLK</title>
        <meta
          name="description"
          content="Read CartoonLK’s privacy policy to understand how we handle your data, cookies, and user security on our platform."
        />
        <link rel="canonical" href="https://cartoonlk.com/privacy-policy" />
      </Helmet>

      <NavBar />
      <div className="page-content">
        <h1>Privacy Policy</h1>
        <p>
          At <b>CartoonLK</b>, we respect your privacy. We collect minimal user information such as
          viewing history and preferences to improve your streaming experience. We never sell or
          share your personal data with third parties.
        </p>
        <p>
          We may use cookies to personalize recommendations, maintain session data, and analyze
          anonymous traffic patterns. You can disable cookies anytime via your browser settings.
        </p>
        <p>
          If you have any questions, contact us at <a href="mailto:support@cartoonlk.com">support@cartoonlk.com</a>.
        </p>
      </div>

      <footer className="footer">© {new Date().getFullYear()} Eyerone Team</footer>
    </div>
  );
};

export default PrivacyPolicy;
