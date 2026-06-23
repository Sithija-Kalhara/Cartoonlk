import React from "react";
import { Helmet } from "react-helmet";
import NavBar from "../Component/NavBar";
import "./Pages.css";

const CopyrightPolicy = () => {
  return (
    <div className="cartoon-container">
      <Helmet>
        <title>Copyright Policy – CartoonLK</title>
        <meta
          name="description"
          content="CartoonLK respects the intellectual property rights of creators and copyright holders. Read our full copyright policy here."
        />
        <link rel="canonical" href="https://cartoonlk.com/copyright-policy" />
      </Helmet>

      <NavBar />

      <div className="page-content">
        <h1>Copyright Policy</h1>

        <p>
          At <b>CartoonLK</b>, we respect the intellectual property rights of all creators, studios,
          and distributors. Our mission is to promote animated content responsibly while providing
          access to Sinhala, English, Hindi, and Japanese entertainment.
        </p>

        <h2>1. Ownership of Content</h2>
        <p>
          All original content created by the <b>Eyerone Team</b> — including Sinhala dubbing, artwork,
          designs, and code — is protected under copyright law. Unauthorized copying, reproduction,
          or redistribution of our content is strictly prohibited.
        </p>

        <h2>2. Third-Party Content</h2>
        <p>
          Some shows or clips available on CartoonLK are provided under fair use, fan-dubbing,
          educational, or partnership arrangements. All respective copyrights and trademarks
          belong to their original owners (e.g., Disney, Cartoon Network, Toei Animation, etc.).
          We make no claim of ownership over such third-party works.
        </p>

        <h2>3. Reporting Copyright Infringement (DMCA)</h2>
        <p>
          If you believe that any material on CartoonLK infringes your copyright,
          please notify us immediately. Include the following details in your message:
        </p>
        <ul>
          <li>Your full name and contact information</li>
          <li>URL(s) of the allegedly infringing content</li>
          <li>Proof of ownership or authorization</li>
          <li>A statement that the information you provide is accurate</li>
        </ul>

        <p>
          Send your report to: <b>support@cartoonlk.com</b>  
          We respond to all valid requests within 48 hours and remove or update
          content where necessary.
        </p>

        <h2>4. Counter Notice</h2>
        <p>
          If you believe content was removed by mistake or under a false claim,
          you may submit a counter-notice to <b>support@cartoonlk.com</b> including your reasoning
          and evidence of authorization.
        </p>

        <h2>5. Disclaimer</h2>
        <p>
          CartoonLK is a fan-driven platform and does not host or distribute pirated material.
          We aim to promote appreciation of animated content while complying with all applicable
          copyright laws and digital rights management policies.
        </p>
      </div>

      <footer className="footer">
        © {new Date().getFullYear()} CartoonLK | Owned and Operated by Eyerone Team.  
        All Rights Reserved.
      </footer>
    </div>
  );
};

export default CopyrightPolicy;
