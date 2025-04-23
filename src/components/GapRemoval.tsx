import React, { useState, useEffect, useRef } from "react";
// import { forwardRef, useImperativeHandle } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import HeaNavLogo from "./HeaNavLogo";
import TrackMerger from "./MergeTracks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import html2canvas from "html2canvas";

const GapRemoval: React.FC = () => {
  //double click logic-start
  const processSaveRef = useRef<HTMLButtonElement>(null);
  const handleMergeClick = () => {
    processSaveRef.current?.click(); // simulate click
  };
  //double click logic end

  //mergertracks

  //mergertracks
  const [selectedColumn1, setSelectedColumn1] = useState<string>("placeholder");
  const [selectedColumn2, setSelectedColumn2] = useState<string>("placeholder");
  const [selectedColumn3, setSelectedColumn3] = useState<string>("placeholder");
  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [showGraph, setShowGraph] = useState(false);
  const [graphData1, setGraphData1] = useState<
    { index: number; value: number; time: string }[]
  >([]);
  const [graphData2, setGraphData2] = useState<
    { index: number; value: number; time: string }[]
  >([]);
  const [graphData3, setGraphData3] = useState<
    { index: number; value: number; time: string }[]
  >([]);
  const [combinedGraphData, setCombinedGraphData] = useState<
    {
      index: number;
      value1: number;
      value2: number;
      value3: number;
      time: string;
    }[]
  >([]);
  // const [timeColumn, setTimeColumn] = useState<string[]>([]);
  const [xScale, setXScale] = useState<number>(1);
  const [yScale, setYScale] = useState<number>(1);

  useEffect(() => {
    const storedHeaders = localStorage.getItem("processedHeaders");
    const storedData = localStorage.getItem("processedData");

    if (storedHeaders && storedData) {
      setHeaders(JSON.parse(storedHeaders));
      setProcessedData(JSON.parse(storedData));
    }
  }, []);

  const [processedData, setProcessedData] = useState<string[][]>([]);

  const handleProcess = () => {
    const fileData = localStorage.getItem("mergedExcelFile");
    if (!fileData) return;

    const byteCharacters = atob(fileData);
    const byteNumbers = new Array(byteCharacters.length)
      .fill(null)
      .map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);

    const workbook = XLSX.read(byteArray, { type: "array" });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (
      | string
    )[][];

    if (jsonData.length === 0) return;

    const headers = jsonData[0];
    const result: (string | number)[][] = [];

    const timeData: string[] = [];

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      const newRow: (string | number)[] = [row[0]];
      timeData.push(row[0]?.toString() || "");

      for (let j = 1; j < headers.length; j += 2) {
        const val1 = row[j];
        const val2 = row[j + 1];
        newRow.push(val1 ?? "", val2 ?? "");

        if (
          val1 !== undefined &&
          val2 !== undefined &&
          !isNaN(Number(val1)) &&
          !isNaN(Number(val2))
        ) {
          const diff = Number(val1) - Number(val2);
          newRow.push(diff);
        } else {
          newRow.push("");
        }
      }
      result.push(newRow);
    }

    const newHeader: (string | number)[] = [headers[0]];
    for (let j = 1; j < headers.length; j += 2) {
      const h1 = headers[j] ?? `Col${j}`;
      const h2 = headers[j + 1] ?? `Col${j + 1}`;
      let label = "Difference";
      if (typeof h1 === "string" && typeof h2 === "string") {
        if (
          h1.toLowerCase().includes("easting") ||
          h2.toLowerCase().includes("easting")
        ) {
          label = "Easting Difference";
        } else if (
          h1.toLowerCase().includes("northing") ||
          h2.toLowerCase().includes("northing")
        ) {
          label = "Northing Difference";
        } else if (
          h1.toLowerCase().includes("height") ||
          h2.toLowerCase().includes("height")
        ) {
          label = "Height Difference";
        }
      }
      newHeader.push(h1, h2, label);
    }

    result.unshift(newHeader);
    // setTimeColumn(timeData);

    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(result);
    for (let c = 3; c < newHeader.length; c += 3) {
      for (let r = 0; r < result.length; r++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        const cell = ws[cellAddress];
        if (cell) {
          if (!cell.s) cell.s = {};
        }
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Processed");

    const wbout = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
      cellStyles: true,
    });

    const blob = new Blob([wbout], { type: "application/octet-stream" });
    setProcessedBlob(blob);
    setShowGraph(true);

    localStorage.setItem("processedHeaders", JSON.stringify(newHeader));
    localStorage.setItem("processedData", JSON.stringify(result));
    setHeaders(newHeader as string[]);
    setProcessedData(result as string[][]);
  };

  const handleDownload = () => {
    if (processedBlob) {
      saveAs(processedBlob, "difference_output.xlsx");
    }
  };

  const handleColumnSelect = () => {
    if (!selectedColumn1 || !selectedColumn2 || !selectedColumn3) return;
    const timeIndex = headers.indexOf("Time");
    const timeColumn: string[] = [];
    const selectedData1: string[] = [];
    const selectedData2: string[] = [];
    const selectedData3: string[] = [];

    processedData.forEach((row: string[]) => {
      const col1Index = headers.indexOf(selectedColumn1);
      const col2Index = headers.indexOf(selectedColumn2);
      const col3Index = headers.indexOf(selectedColumn3);

      if (timeIndex !== -1) timeColumn.push(row[timeIndex]);
      if (col1Index !== -1) selectedData1.push(row[col1Index]);
      if (col2Index !== -1) selectedData2.push(row[col2Index]);
      if (col3Index !== -1) selectedData3.push(row[col3Index]);
    });

    const mapToGraphValues = (data: string[]) =>
      data.map((value, index) => ({
        index,
        value: isNaN(Number(value)) ? 0 : Number(value),
        time: timeColumn[index] || "",
      }));

    const gData1 = mapToGraphValues(selectedData1);
    const gData2 = mapToGraphValues(selectedData2);
    const gData3 = mapToGraphValues(selectedData3);

    setGraphData1(gData1);
    setGraphData2(gData2);
    setGraphData3(gData3);

    const combined = gData1.map((item, index) => ({
      index,
      value1: item.value,
      value2: gData2[index]?.value || 0,
      value3: gData3[index]?.value || 0,
      time: item.time,
    }));
    setCombinedGraphData(combined);
  };

  const handleDownloadGraph = () => {
    const chartContainer = document.getElementById("chartContainer");
    if (chartContainer) {
      html2canvas(chartContainer).then((canvas) => {
        canvas.toBlob((blob) => {
          if (blob) {
            saveAs(blob, "graphs.png");
          }
        });
      });
    }
  };
  // console.log("Headers:", headers);

  return (
    <>
      <HeaNavLogo />
      <TrackMerger onMergeSave={handleMergeClick}  />

      <div
        style={{
          // padding: '2rem',
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          backgroundColor: "#f4f7fa",
          minHeight: "100vh",
          fontFamily: "'Inter', sans-serif",
          border: "4px solid black",
          margin: "10px",
          padding: "10px",
        }}
      >
        <button
          onClick={handleProcess}
          ref={processSaveRef}
          style={{
            display: "none", 
            backgroundColor: "#2563eb",
            color: "#ffffff",
            padding: "0.75rem 1.5rem",
            borderRadius: "0.375rem",
            fontWeight: "500",
            cursor: "pointer",
            transition: "background-color 0.2s ease, transform 0.1s ease",
            border: "none",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = "#1d4ed8")
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "#2563eb")
          }
          onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
          onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          Process & Show Graph
        </button>

        {processedBlob && (
          <button
            onClick={handleDownload}
            style={{
              backgroundColor: "#16a34a",
              color: "#ffffff",
              padding: "0.75rem 1.5rem",
              borderRadius: "0.375rem",
              fontWeight: "500",
              cursor: "pointer",
              transition: "background-color 0.2s ease, transform 0.1s ease",
              border: "none",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#15803d")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#16a34a")
            }
            onMouseDown={(e) =>
              (e.currentTarget.style.transform = "scale(0.98)")
            }
            onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            Download Final File
          </button>
        )}

        {showGraph && (
          <div
            style={{
              padding: "2rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              marginTop: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <label
                style={{
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                Select First Header:
              </label>
              <select
                value={selectedColumn1}
                onChange={(e) => setSelectedColumn1(e.target.value)}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                  width: "200px",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              >
                <option value="placeholder" disabled>
                  Select a header
                </option>
                {headers.map((header, index) => (
                  <option key={index} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <label
                style={{
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                Select Second Header:
              </label>
              <select
                value={selectedColumn2}
                onChange={(e) => setSelectedColumn2(e.target.value)}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                  width: "200px",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              >
                <option value="placeholder" disabled>
                  Select a header
                </option>
                {headers.map((header, index) => (
                  <option key={index} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <label
                style={{
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                Select Third Header:
              </label>
              <select
                value={selectedColumn3}
                onChange={(e) => setSelectedColumn3(e.target.value)}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                  width: "200px",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              >
                <option value="placeholder" disabled>
                  Select a header
                </option>
                {headers.map((header, index) => (
                  <option key={index} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginTop: "1rem",
              }}
            >
              <label
                style={{
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                X Scale:
              </label>
              <input
                type="number"
                value={xScale}
                onChange={(e) => setXScale(Number(e.target.value))}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  width: "100px",
                  transition: "border-color 0.2s ease",
                }}
                min="0.1"
                step="0.1"
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              />
              <label
                style={{
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                  marginLeft: "1rem",
                }}
              >
                Y Scale:
              </label>
              <input
                type="number"
                value={yScale}
                onChange={(e) => setYScale(Number(e.target.value))}
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  padding: "0.5rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  width: "100px",
                  transition: "border-color 0.2s ease",
                }}
                min="0.1"
                step="0.1"
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                onClick={handleColumnSelect}
                style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.375rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease, transform 0.1s ease",
                  border: "none",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#1d4ed8")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2563eb")
                }
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.98)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                Generate Graphs
              </button>

              <button
                onClick={handleDownloadGraph}
                style={{
                  backgroundColor: "#7c3aed",
                  color: "#ffffff",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.375rem",
                  fontWeight: "500",
                  cursor: "pointer",
                  transition: "background-color 0.2s ease, transform 0.1s ease",
                  border: "none",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.backgroundColor = "#6d28d9")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.backgroundColor = "#7c3aed")
                }
                onMouseDown={(e) =>
                  (e.currentTarget.style.transform = "scale(0.98)")
                }
                onMouseUp={(e) =>
                  (e.currentTarget.style.transform = "scale(1)")
                }
              >
                Download Graphs as Image
              </button>
            </div>

            <div id="chartContainer" style={{ marginTop: "2rem" }}>
              <TransformWrapper>
                <TransformComponent>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontWeight: "700",
                          fontSize: "1.25rem",
                          color: "#1f2937",
                          marginBottom: "1rem",
                        }}
                      >
                        First Graph ({selectedColumn1})
                      </h3>
                      <LineChart
                        width={800 * xScale}
                        height={300 * yScale}
                        data={graphData1}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[-0.2, 0.2]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                          name={selectedColumn1}
                        />
                      </LineChart>
                    </div>

                    <div>
                      <h3
                        style={{
                          fontWeight: "700",
                          fontSize: "1.25rem",
                          color: "#1f2937",
                          marginBottom: "1rem",
                        }}
                      >
                        Second Graph ({selectedColumn2})
                      </h3>
                      <LineChart
                        width={800 * xScale}
                        height={300 * yScale}
                        data={graphData2}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[-0.2, 0.2]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#82ca9d"
                          activeDot={{ r: 8 }}
                          name={selectedColumn2}
                        />
                      </LineChart>
                    </div>

                    <div>
                      <h3
                        style={{
                          fontWeight: "700",
                          fontSize: "1.25rem",
                          color: "#1f2937",
                          marginBottom: "1rem",
                        }}
                      >
                        Third Graph ({selectedColumn3})
                      </h3>
                      <LineChart
                        width={800 * xScale}
                        height={300 * yScale}
                        data={graphData3}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[-0.2, 0.2]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#ff7300"
                          activeDot={{ r: 8 }}
                          name={selectedColumn3}
                        />
                      </LineChart>
                    </div>

                    <div>
                      <h3
                        style={{
                          fontWeight: "700",
                          fontSize: "1.25rem",
                          color: "#1f2937",
                          marginBottom: "1rem",
                        }}
                      >
                        Combined Graph
                      </h3>
                      <LineChart
                        width={800 * xScale}
                        height={300 * yScale}
                        data={combinedGraphData}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="time" />
                        <YAxis domain={[-0.2, 0.2]} />
                        <Tooltip />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value1"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                          name={selectedColumn1}
                        />
                        <Line
                          type="monotone"
                          dataKey="value2"
                          stroke="#82ca9d"
                          activeDot={{ r: 8 }}
                          name={selectedColumn2}
                        />
                        <Line
                          type="monotone"
                          dataKey="value3"
                          stroke="#ff7300"
                          activeDot={{ r: 8 }}
                          name={selectedColumn3}
                        />
                      </LineChart>
                    </div>
                  </div>
                </TransformComponent>
              </TransformWrapper>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GapRemoval;
