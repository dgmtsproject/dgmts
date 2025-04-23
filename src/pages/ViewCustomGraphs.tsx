import React, { useEffect, useState, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "../assets/logo.jpg";
import fullData from "../data/customGraphData.json";
import HeaNavLogo from "../components/HeaNavLogo";

interface GraphData {
  time: string;
  temperature: number;
  humidity: number;
  pressure: number;
  oxygenLevel?: number; // ✅ Made optional to fix type error
}

const sensorOptions = ["temperature", "humidity", "pressure"] as const;
type SensorType = (typeof sensorOptions)[number];

const ViewCustomGraphs: React.FC = () => {
  const [startDate, setStartDate] = useState("2025-04-01");
  const [endDate, setEndDate] = useState("2025-04-09");
  const [selectedSensor, setSelectedSensor] =
    useState<SensorType>("temperature");
  const [filteredData, setFilteredData] = useState<GraphData[]>([]);
  const chartRef = useRef<HTMLDivElement | null>(null);

  // Get today's date to disable future dates
  const todayDate = new Date().toISOString().split("T")[0];

  useEffect(() => {
    const alertShown = sessionStorage.getItem("alertShown");
    if (!alertShown && selectedSensor === "temperature") {
      fullData.forEach((data: GraphData) => {
        if (data.temperature > 100) {
          toast.error(
            `Alert: Temperature ${data.temperature} at ${data.time} exceeds 100!`
          );
        }
      });
      sessionStorage.setItem("alertShown", "true");
    }
  }, [selectedSensor]);

  const handleDateChange = () => {
    const filtered = (fullData as GraphData[]).filter((data) => {
      const dataDate = new Date(data.time);
      return dataDate >= new Date(startDate) && dataDate <= new Date(endDate);
    });
    setFilteredData(filtered);

    if (filtered.length > 0) {
      toast.success("Graph generated successfully!");
    } else {
      toast.warning("No data found for the selected date range.");
    }
  };

  const downloadGraph = () => {
    if (chartRef.current) {
      html2canvas(chartRef.current).then((canvas) => {
        const link = document.createElement("a");
        link.download = "graph.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GraphData");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const fileData = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(fileData, "graph-data.xlsx");
  };

  const inputStyle = {
    padding: "0.5rem",
    borderRadius: "8px",
    border: "1px solid #ccc",
    fontSize: "1rem",
    minWidth: "160px",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "0.3rem",
    fontWeight: 600,
  };

  const buttonStyle = {
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    padding: "0.6rem 1.2rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "1rem",
    marginTop: "1.8rem",
    minWidth: "160px",
  };

  return (
    <>
      <HeaNavLogo />

      <div
        style={{
          fontFamily: "Segoe UI, sans-serif",
          padding: "2rem",
          backgroundColor: "#f8f9fa",
          minHeight: "100vh",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "1.5rem",
            color: "#343a40",
          }}
        >
          📊 View Custom Graphs
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "1.5rem",
            marginBottom: "2rem",
            backgroundColor: "#fff",
            padding: "2rem",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <div>
            <label style={labelStyle}>Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={inputStyle}
              max={todayDate} // Disable future dates
            />
          </div>
          <div>
            <label style={labelStyle}>End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={inputStyle}
              max={todayDate} // Disable future dates
            />
          </div>
          <div>
            <label style={labelStyle}>Sensor</label>
            <select
              value={selectedSensor}
              onChange={(e) => setSelectedSensor(e.target.value as SensorType)}
              style={inputStyle}
            >
              {sensorOptions.map((sensor) => (
                <option key={sensor} value={sensor}>
                  {sensor.charAt(0).toUpperCase() + sensor.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button onClick={handleDateChange} style={buttonStyle}>
            Generate Graph
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: "1rem" }}>
          <button
            onClick={downloadGraph}
            style={{
              ...buttonStyle,
              backgroundColor: "#28a745",
              marginRight: "1rem",
            }}
          >
            📷 Download Image
          </button>
          <button
            onClick={exportToExcel}
            style={{ ...buttonStyle, backgroundColor: "#17a2b8" }}
          >
            📁 Export to Excel
          </button>
        </div>

        <div
          style={{
            margin: "0 auto",
            backgroundColor: "#fff",
            padding: "2rem",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            maxWidth: "750px",
            textAlign: "center",
            marginBottom: "40px", // add bottom space so it doesn’t get hidden behind the footer
          }}
        >
          <h3 style={{ marginBottom: "1rem", color: "#343a40" }}>
            {selectedSensor.charAt(0).toUpperCase() + selectedSensor.slice(1)}{" "}
            Graph
          </h3>
          {filteredData.length === 0 ? (
            <p>No data found for the selected range.</p>
          ) : (
            <div ref={chartRef}>
              <LineChart width={600} height={300} data={filteredData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={selectedSensor}
                  stroke="#ff7300"
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </div>
          )}
        </div>

        <img
          src={logo}
          alt="Logo"
          style={{
            position: "fixed",
            top: "70%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "30vw",
            opacity: 0.06,
            zIndex: -1,
          }}
        />

        <footer
          style={{
            textAlign: "center",
            marginTop: "2rem",
            fontSize: "0.9rem",
            color: "#aaa",
          }}
        >
          © 2025 DGMTS. All rights reserved.
        </footer>

        <ToastContainer />
      </div>
    </>
  );
};

export default ViewCustomGraphs;
