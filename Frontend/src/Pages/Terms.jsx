import React from "react";
import { Helmet } from "react-helmet";
import NavBar from "../Component/NavBar";
import "./Pages.css";

const Terms = () => {
  return (
    <div className="cartoon-container">
      <Helmet>
        <title>Terms & Conditions – CartoonLK</title>
        <meta
          name="description"
          content="View CartoonLK's terms and conditions for streaming, copyright, and community rules."
        />
        <link rel="canonical" href="https://cartoonlk.com/terms" />
      </Helmet>

      <NavBar />
      <div className="page-content">
        <h1>Terms & Conditions</h1>
        <p>
          By using <b>CartoonLK</b>, you agree to follow all our streaming and content usage rules.
          All content available on this site is for entertainment and educational purposes only.
        </p>
        <p>
          Users are not permitted to upload or distribute copyrighted material without permission.
          Violation of these terms may result in suspension or removal of your access.
        </p>
        <p>
          We reserve the right to update or modify these terms at any time without prior notice.
        </p>
      </div>

      <footer className="footer">© {new Date().getFullYear()} Eyerone Team</footer>
    </div>
  );
};

export default Terms;
