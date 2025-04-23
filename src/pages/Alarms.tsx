import React, { useState, useMemo } from "react";
// import Header from "../components/Header";
// import Navbar from "../components/Navbar";
import logo from "../assets/logo.jpg";
import alarmsData from "../data/alarmsData.json";
import HeaNavLogo from "../components/HeaNavLogo";

// Properly typed Alarm object with an index signature for dynamic key access
type Alarm = {
  timestamp: string;
  sensor: string;
  limit: string;
  equation: string;
  value: number;
  acknowledged: boolean;
  acknowledgedTimestamp: string | null;
  user: string | null;
  comment: string;
  [key: string]: string | number | boolean | null | undefined;
};

const Alarms: React.FC = () => {
  const [filterAck, setFilterAck] = useState(true);

  // Get unique list of all keys from the data
  const allKeys = useMemo(() => {
    const keys = new Set<string>();
    alarmsData.forEach((alarm: Alarm) => {
      Object.keys(alarm).forEach((key) => keys.add(key));
    });
    return Array.from(keys);
  }, []);

  // Filter the data based on acknowledgment status
  const filteredData = useMemo(() => {
    return alarmsData.filter(
      (alarm: Alarm) => alarm.acknowledged === filterAck
    );
  }, [filterAck]);

  // Update headers and data key mappings
  const updatedKeys = allKeys.map((key) => {
    if (key === "acknowledged") return "Confirmed";
    if (key === "acknowledgedTimestamp") return "Timestamp";
    return key;
  });

  return (
    <>
      <HeaNavLogo />
      <div className="page">
        {/* <Header />
      <Navbar /> */}
        <div className="content" style={{ padding: "2rem" }}>
          <h2>Alarms</h2>

          {/* Dropdown to toggle acknowledged/unacknowledged */}
          <div style={{ marginBottom: "1rem" }}>
            <select
              id="ackFilter"
              value={filterAck ? "true" : "false"}
              onChange={(e) => setFilterAck(e.target.value === "true")}
              style={{
                padding: "10px",
                fontSize: "16px",
                border: "1px solid #000", // Black border
                borderRadius: "4px",
                backgroundColor: "#fff",
                width: "200px",
                outline: "none",
                boxShadow: "0 2px 5px rgba(0, 0, 0, 0.1)",
              }}
            >
              <option value="true">Confirmed</option>
              <option value="false">Not Confirmed</option>
            </select>
          </div>

          {/* Alarms Table */}
          <div className="data-table">
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                tableLayout: "fixed",
              }}
            >
              <thead>
                <tr>
                  {updatedKeys.map((key) => (
                    <th
                      key={key}
                      style={{
                        border: "1px solid #000", // Black border for header cells
                        padding: "12px",
                        backgroundColor: "#f4f4f4",
                        color: "#333",
                        textAlign: "left",
                        fontWeight: "bold",
                        wordWrap: "break-word",
                        maxWidth: "200px",
                      }}
                    >
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((alarm: Alarm, idx) => (
                  <tr
                    key={idx}
                    style={{
                      transition: "background-color 0.3s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#f0f0f0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#fff";
                    }}
                  >
                    {updatedKeys.map((key) => (
                      <td
                        key={key}
                        style={{
                          border: "1px solid #000", // Black border for table cells
                          padding: "12px",
                          textAlign: "left",
                          wordWrap: "break-word",
                          maxWidth: "200px",
                        }}
                      >
                        {alarm[key] !== undefined ? String(alarm[key]) : "N/A"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Centered Background Logo */}
          <div className="centered-logo">
            <img
              src={logo}
              alt="DGMTS Logo"
              style={{
                position: "fixed",
                top: "65%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "30vw",
                opacity: 0.1,
                zIndex: -1,
                pointerEvents: "none",
              }}
            />
          </div>
        </div>

        <footer>© 2025 DGMTS. All rights reserved.</footer>
      </div>
    </>
  );
};

export default Alarms;
