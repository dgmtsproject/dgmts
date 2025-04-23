import React, { useState } from "react";
import * as XLSX from "xlsx";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import HeaNavLogo from "../components/HeaNavLogo";

const sensors = [
  "VM1 BatteryLevel",
  "VM1 LongFreq",
  "VM1 LongPPV",
  "VM1 MicL10",
  "VM1 PowerIn",
];

const getRandomValue = (): string => (Math.random() * 100).toFixed(2);

interface SensorData {
  time: string;
  [key: string]: string;
}

const generateMockData = (start: string, end: string): SensorData[] => {
  const readings: SensorData[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const oneHour = 1000 * 60 * 60;

  for (
    let time = startDate.getTime();
    time <= endDate.getTime();
    time += oneHour
  ) {
    const entry: SensorData = {
      time:
        new Date(time).toISOString().split("T")[0] +
        " " +
        new Date(time).toTimeString().slice(0, 5),
    };
    sensors.forEach((sensor) => {
      entry[sensor] = getRandomValue();
    });
    readings.push(entry);
  }

  return readings;
};

const ExportData: React.FC = () => {
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [data, setData] = useState<SensorData[]>([]);

  const maxDate = new Date().toISOString().split("T")[0];

  const handleGenerate = () => {
    if (!startDate || !endDate) {
      toast.warn("Please select both start and end dates.");
      return;
    }

    const mockData = generateMockData(startDate, endDate);
    setData(mockData);
  };

  const handleDownload = () => {
    if (data.length === 0) {
      toast.warn("No data to download. Please generate data first.");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sensor Data");
    XLSX.writeFile(workbook, "SensorData.xlsx");
  };

  return (
    <>
      <HeaNavLogo />
      <div
        style={{
          padding: "32px",
          maxWidth: "1200px",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
          color: "#4A4A4A",
        }}
      >
        <h2
          style={{
            fontSize: "2.5rem",
            fontWeight: "bold",
            textAlign: "center",
            marginBottom: "32px",
          }}
        >
          📅 Export Sensor Data
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div style={{ maxWidth: "300px", width: "100%" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              max={maxDate}
              style={{
                border: "1px solid #E0E0E0",
                borderRadius: "8px",
                padding: "8px 12px",
                width: "100%",
                fontSize: "1rem",
                outline: "none",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            />
          </div>
          <div style={{ maxWidth: "300px", width: "100%" }}>
            <label
              style={{
                display: "block",
                marginBottom: "8px",
                fontWeight: "600",
              }}
            >
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              max={maxDate}
              style={{
                border: "1px solid #E0E0E0",
                borderRadius: "8px",
                marginLeft: "30px",
                padding: "8px 12px",
                width: "100%",
                fontSize: "1rem",
                outline: "none",
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
              }}
            />
          </div>
          <button
            onClick={handleGenerate}
            style={{
              backgroundColor: "#4CAF50",
              color: "#fff",
              padding: "12px 24px",
              marginLeft: "60px",
              marginTop: "20px",
              borderRadius: "8px",
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#45A049")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#4CAF50")
            }
          >
            Show Table
          </button>
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: "#2196F3",
              color: "#fff",
              padding: "12px 24px",
              marginLeft: "10px",
              marginTop: "20px",
              borderRadius: "8px",
              fontSize: "1rem",
              cursor: "pointer",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "background-color 0.3s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#1E88E5")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#2196F3")
            }
          >
            📥 Download as Excel
          </button>
        </div>

        {data.length > 0 && (
          <div
            style={{
              overflowX: "auto",
              backgroundColor: "#fff",
              borderRadius: "8px",
              marginTop: "24px",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "1rem",
                border: "1px solid #999",
              }}
            >
              <thead
                style={{
                  backgroundColor: "#f5f5f5",
                  textAlign: "center",
                  color: "#333",
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: "12px",
                      fontWeight: "bold",
                      border: "1px solid #999",
                    }}
                  >
                    Time
                  </th>
                  {sensors.map((sensor) => (
                    <th
                      key={sensor}
                      style={{
                        padding: "12px",
                        fontWeight: "bold",
                        border: "1px solid #999",
                      }}
                    >
                      {sensor}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ textAlign: "center", color: "#555" }}>
                {data.map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      backgroundColor: idx % 2 === 0 ? "#f9f9f9" : "#f1f1f1",
                    }}
                  >
                    <td
                      style={{
                        padding: "12px",
                        border: "1px solid #999",
                      }}
                    >
                      {row.time}
                    </td>
                    {sensors.map((sensor) => (
                      <td
                        key={sensor}
                        style={{
                          padding: "12px",
                          border: "1px solid #999",
                        }}
                      >
                        {row[sensor]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ToastContainer />
    </>
  );
};

export default ExportData;
