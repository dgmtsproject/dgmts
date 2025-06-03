import React from "react";

const Header: React.FC = () => {
  return (
    <div
      className="header"
      style={{
        flex: 1, // Takes remaining space
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "18px 25px",
        borderBottom: "1px solid #000",
      }}
    >
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