import React from "react";
import logo from "../assets/logo.jpg";

const Header: React.FC = () => {
  return (
    <div
      className="header"
      style={{
        display: "flex",
        alignItems: "space-between",
        justifyContent: "space-evenly",

        // Align items vertically centered
        padding: "10px 20px", // Add padding on the sides
        gap: "20px", // Space between logo section and company info
        borderBottom: "1px solid #000", // Bottom border as seen in the image
      }}
    >
      {/* Logo and DGMTS—Instrumentation Monitoring Site */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <img
          src={logo}
          alt="DGMTS Logo"
          style={{ height: "50px", display: "block", margin: 0, padding: 0 }} // Ensure no extra margin or padding
        />
        <div
          style={{
            fontSize: "16px",
            lineHeight: "1", // Reduce line height to minimize vertical space
            marginTop: "-5px", // Pull the text closer to the logo
          }}
        >
          <span style={{ color: "Black", fontWeight: "bold" }}>DGMTS-imSite</span>
          {/* <span style={{ fontStyle: "italic", color: "#888" }}>
            Instrumentation Monitoring Site
          </span> */}
        </div>
      </div>

      {/* Company Info */}
      <div>
        <h1 style={{ fontSize: "18px", fontWeight: "normal", margin: 0 }}>
          Dulles Geotechnical and Material Testing Services Inc.
        </h1>
        <p style={{ margin: "0", color: "#ff8c00", fontSize: "12px" }}>
          A Certified SWaM and MBE/DBE Firm
        </p>
      </div>
    </div>
  );
};

export default Header;
