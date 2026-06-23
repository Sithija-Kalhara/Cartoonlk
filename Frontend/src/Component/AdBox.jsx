import React, { useEffect } from "react";

const AdBox = ({ slot }) => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.warn("AdSense not ready:", err);
    }
  }, []);

  return (
    <div className="ad-box" style={{
      textAlign: "center",
      width: "100%",
      height: "100%",
      background: "black",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "10px"
    }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "100%" }}
        data-ad-client="ca-pub-7275249481303702"
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
};

export default AdBox;
