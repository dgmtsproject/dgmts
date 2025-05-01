import React, { useState, useEffect, useRef } from "react";
// import { forwardRef, useImperativeHandle } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import HeaNavLogo from "./HeaNavLogo";
import TrackMerger from "./MergeTracks";
import html2canvas from "html2canvas";
import Plot from "react-plotly.js";

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
  // seperate headers for the 
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
  const differenceOptions = headers
    .map((header, index) => {
      if (
        typeof header === "string" &&
        header.toLowerCase().includes("difference")
      ) {
        // Try to find matching A and B headers by walking back 1 and 2 positions
        const aHeader = headers[index - 2];
        const bHeader = headers[index - 1];

        if (
          typeof aHeader === "string" &&
          typeof bHeader === "string" &&
          aHeader.includes("A") &&
          bHeader.includes("B")
        ) {
          const label = `${aHeader.split(" - ")[0]} and ${bHeader.split(" - ")[0]} - ${header}`;
          return { label, value: header };
        }
      }
      return null;
    })
    .filter(Boolean) as { label: string; value: string }[];
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
  const getOptimizedTicks = (timeData: string | any[]) => {
    if (!timeData || timeData.length === 0) return [];

    const tickCount = Math.min(6, timeData.length);
    const step = Math.max(1, Math.floor(timeData.length / (tickCount - 1)));

    const ticks = [];
    ticks.push(timeData[0]);

    for (let i = 1; i < tickCount - 1; i++) {
      const index = Math.min(i * step, timeData.length - 1);
      ticks.push(timeData[index]);
    }
    if (timeData.length > 1 && timeData[timeData.length - 1] !== timeData[0]) {
      ticks.push(timeData[timeData.length - 1]);
    }

    return ticks;
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
      data.map((value, index) => {
        const rawTime = timeColumn[index] || "";

        let usFormattedDate = rawTime;

        // Split date and time
        const [datePart, timePart] = rawTime.split(" ");
        const [day, month, year] = datePart.split("/");

        if (day && month && year && timePart) {
          // Convert to MM/DD/YYYY format
          usFormattedDate = `${month}/${day}/${year} ${timePart}`;
        }

        return {
          index,
          value: isNaN(Number(value)) ? 0 : Number(value),
          time: usFormattedDate,
        };
      });

    const gData1 = mapToGraphValues(selectedData1);

    const gData2 = mapToGraphValues(selectedData2);
    const gData3 = mapToGraphValues(selectedData3);



    // remove 0 values from graph data so it doesn't show in the graph

    setGraphData1(gData1.filter((item) => item.value !== 0));
    setGraphData2(gData2.filter((item) => item.value !== 0));
    setGraphData3(gData3.filter((item) => item.value !== 0));


    const combined = gData1.map((item, index) => ({
      index,
      value1: item.value,
      value2: gData2[index]?.value || 0,
      value3: gData3[index]?.value || 0,
      time: item.time,
    }));
    setCombinedGraphData(
      combined.filter((item) => item.value1 !== 0 || item.value2 !== 0 || item.value3 !== 0));
  };
  console.log("Graph Data 1:", graphData1);
  console.log("Graph Data 2:", graphData2);
  console.log("Combined Graph Data:", combinedGraphData);
  const generateTicks = (min: number, max: number) => {
    const range = max - min;
    const approxSteps = 10;
    const step = range / approxSteps;

    const ticks = [];
    for (let i = min; i <= max + 1e-9; i += step) {
      ticks.push(Number(i.toFixed(2)));
    }
    return ticks;
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
  // all headers except difference headers
  const filteredHeaders = headers.filter(
    (header) =>
      typeof header === "string" &&
      !header.toLowerCase().includes("difference") &&
      !header.toLowerCase().includes("time")
  );

  return (
    <>
      <HeaNavLogo />
      <TrackMerger onMergeSave={handleMergeClick} />

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
                {filteredHeaders.map((header, index) => (
                  <option key={index} value={header}>
                    {header}
                  </option>
                ))}
                {differenceOptions.map(({ label, value }, index) => (
                  <option key={index} value={value}>
                    {label}
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
                {filteredHeaders.map((header, index) => (
                  <option key={index} value={header}>
                    {header}
                  </option>
                ))}
                {differenceOptions.map(({ label, value }, index) => (
                  <option key={index} value={value}>
                    {label}
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

                {filteredHeaders.map((header, index) => (
                  <option key={index} value={header}>
                    {header}
                  </option>
                ))}
                {differenceOptions.map(({ label, value }, index) => (
                  <option key={index} value={value}>
                    {label}
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
                max="1.4"
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
                onChange={(e) => {
                  const val = Math.max(0.1, Number(e.target.value));
                  setYScale(val);
                }}
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
                min="0.2"
                step="0.1"
                max="5.0"
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
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                {/* First Chart */}
                <div>
                  <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                    First Graph ({selectedColumn1})
                  </h3>

                  <Plot
                    data={[
                      {
                        x: graphData1.map(item => item.time),
                        y: graphData1.map(item => item.value),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: selectedColumn1,
                        line: {
                          color: '#8884d8',
                          shape: 'spline'
                        },
                        marker: {
                          size: 6,
                          color: '#8884d8'
                        },
                        hoverinfo: 'y+name',
                        hovertemplate: `
        <b>${selectedColumn1}</b><br>
        Time: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `
                      }
                    ]}
                    layout={{
                      width: 800 * xScale,
                      height: 500,
                      margin: {
                        l: 60,
                        r: 30,
                        b: 80,
                        t: 30,
                        pad: 4
                      },
                      xaxis: {
                        title: 'Time',
                        type: 'category',
                        tickmode: 'array',
                        tickvals: getOptimizedTicks(graphData1.map(item => item.time)), // Custom function to select ticks
                        tickangle: 0,
                        gridcolor: '#f0f0f0',
                        gridwidth: 1,
                        showgrid: true,
                        automargin: true
                      },
                      yaxis: {
                        title: selectedColumn1,
                        range: [-0.5 / yScale, 0.5 / yScale],
                        tickvals: generateTicks(-0.5 / yScale, 0.5 / yScale),
                        tickmode: 'array',
                        nticks: 6,
                        gridcolor: '#f0f0f0',
                        gridwidth: 1,
                        zeroline: true,
                        zerolinecolor: '#f0f0f0',
                        zerolinewidth: 1
                      },
                      plot_bgcolor: 'white',
                      paper_bgcolor: 'white',
                      showlegend: true,
                      legend: {
                        orientation: 'h',
                        y: 1.1,
                        x: 0.5,
                        xanchor: 'center'
                      },
                      hovermode: 'x unified',
                      hoverlabel: {
                        bgcolor: 'white',
                        bordercolor: '#ddd',
                        font: {
                          family: 'Arial',
                          size: 12,
                          color: 'black'
                        }
                      }
                    }}
                    config={{
                      displayModeBar: true,
                      responsive: true,
                      displaylogo: false
                    }}
                    style={{ maxHeight: '800px' }}
                  />

                </div>

                {/* Second Chart */}
                <div>
                  <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                    Second Graph ({selectedColumn2})
                  </h3>

                  <Plot
                    data={[
                      {
                        x: graphData2.map(item => item.time),
                        y: graphData2.map(item => item.value),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: selectedColumn2,
                        line: {
                          color: '#82ca9d', // Matching your Recharts green color exactly
                          shape: 'spline',
                          width: 2
                        },
                        marker: {
                          size: 8, // Increased to match Recharts' activeDot size
                          color: '#82ca9d',
                          line: {
                            width: 1,
                            color: '#fff'
                          }
                        },
                        hovertemplate: `
        <b>${selectedColumn2}</b><br>
        <b>Time:</b> %{x}<br>
        <b>Value:</b> %{y:.7f}<extra></extra>
      `,
                        hoverlabel: {
                          bgcolor: '#fff',
                          bordercolor: '#82ca9d',
                          font: {
                            family: 'Arial',
                            size: 12,
                            color: '#333'
                          }
                        }
                      }
                    ]}
                    layout={{
                      width: 800 * xScale,
                      height: 500,
                      margin: {
                        l: 60,
                        r: 30,
                        b: 80,
                        t: 30,
                        pad: 4
                      },
                      xaxis: {
                        title: 'Time',
                        type: 'category',
                        tickmode: 'array',
                        tickvals: getOptimizedTicks(graphData2.map(item => item.time)),
                        tickangle: 0,
                        gridcolor: 'rgba(240, 240, 240, 0.7)',
                        gridwidth: 1,
                        showgrid: true,
                        automargin: true,
                        tickfont: {
                          size: 11
                        }
                      },
                      yaxis: {
                        title: {
                          text: selectedColumn2,
                          standoff: 15
                        },
                        range: [-0.5 / yScale, 0.5 / yScale],
                        tickvals: generateTicks(-0.5 / yScale, 0.5 / yScale),
                        tickmode: 'array',
                        nticks: 6,
                        gridcolor: 'rgba(240, 240, 240, 0.7)',
                        gridwidth: 1,
                        zeroline: true,
                        zerolinecolor: 'rgba(240, 240, 240, 0.7)',
                        zerolinewidth: 1,
                        tickfont: {
                          size: 11
                        }
                      },
                      plot_bgcolor: 'white',
                      paper_bgcolor: 'white',
                      showlegend: true,
                      legend: {
                        orientation: 'h',
                        y: 1.1,
                        x: 0.5,
                        xanchor: 'center',
                        font: {
                          size: 12
                        }
                      },
                      hovermode: 'x unified',
                      hoverlabel: {
                        bgcolor: 'white',
                        bordercolor: '#ddd',
                        font: {
                          family: 'Arial',
                          size: 12,
                          color: 'black'
                        }
                      }
                    }}
                    config={{
                      displayModeBar: true,
                      responsive: true,
                      displaylogo: false,
                     
                    }}
                    style={{
                      maxHeight: '800px',
                      border: '1px solid #f0f0f0',
                      borderRadius: '4px'
                    }}
                  />

                </div>

                {/* Third Chart */}
                <div>
                  <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                    Third Graph ({selectedColumn3})
                  </h3>

                  <Plot
                    data={[
                      {
                        x: graphData3.map(item => item.time),
                        y: graphData3.map(item => item.value),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: selectedColumn3,
                        line: {
                          color: '#ff7300',
                          shape: 'spline'
                        },
                        marker: {
                          size: 6,
                          color: '#ff7300'
                        },
                        hoverinfo: 'y+name',
                        hovertemplate: `
                                      <b>${selectedColumn3}</b><br>
                                      Time: %{x}<br>
                                      Value: %{y:.7f}<extra></extra>
                                      `
                      }
                    ]}
                    layout={{
                      width: 800 * xScale,
                      height: 500,
                      margin: {
                        l: 60,
                        r: 30,
                        b: 80,
                        t: 30,
                        pad: 4
                      },
                      xaxis: {
                        title: 'Time',
                        type: 'category',
                        tickmode: 'array',
                        tickvals: getOptimizedTicks(graphData3.map(item => item.time)), // Custom function to select ticks
                        tickangle: 0,
                        gridcolor: '#f0f0f0',
                        gridwidth: 1,
                        showgrid: true,
                        automargin: true
                      },
                      yaxis: {
                        title: selectedColumn3,
                        range: [-0.5 / yScale, 0.5 / yScale],
                        tickvals: generateTicks(-0.5 / yScale, 0.5 / yScale),
                        tickmode: 'array',
                        nticks: 6,
                        gridcolor: '#f0f0f0',
                        gridwidth: 1,
                        zeroline: true,
                        zerolinecolor: '#f0f0f0',
                        zerolinewidth: 1
                      },
                      plot_bgcolor: 'white',
                      paper_bgcolor: 'white',
                      showlegend: true,
                      legend: {
                        orientation: 'h',
                        y: 1.1,
                        x: 0.5,
                        xanchor: 'center'
                      },
                      hovermode: 'x unified',
                      hoverlabel: {
                        bgcolor: 'white',
                        bordercolor: '#ddd',
                        font: {
                          family: 'Arial',
                          size: 12,
                          color: 'black'
                        }
                      }
                    }}
                    config={{
                      displayModeBar: true,
                      responsive: true,
                      displaylogo: false
                    }}
                    style={{ maxHeight: '800px' }}
                  />

                </div>

                {/* Combined Chart */}
                <div>
                  <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                    Combined Graph
                  </h3>

                  <Plot
                    data={[
                      {
                        x: combinedGraphData.map(item => item.time),
                        y: combinedGraphData.map(item => item.value1),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: selectedColumn1,
                        line: {
                          color: '#8884d8',
                          shape: 'spline'
                        },
                        marker: {
                          size: 6,
                          color: '#8884d8'
                        },
                        hovertemplate: `
        <b>${selectedColumn1}</b><br>
        Time: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `
                      },
                      {
                        x: combinedGraphData.map(item => item.time),
                        y: combinedGraphData.map(item => item.value2),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: selectedColumn2,
                        line: {
                          color: '#82ca9d',
                          shape: 'spline'
                        },
                        marker: {
                          size: 6,
                          color: '#82ca9d'
                        },
                        hovertemplate: `
        <b>${selectedColumn2}</b><br>
        Time: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `
                      },
                      {
                        x: combinedGraphData.map(item => item.time),
                        y: combinedGraphData.map(item => item.value3),
                        type: 'scatter',
                        mode: 'lines+markers',
                        name: selectedColumn3,
                        line: {
                          color: '#ff7300',
                          shape: 'spline'
                        },
                        marker: {
                          size: 6,
                          color: '#ff7300'
                        },
                        hovertemplate: `
        <b>${selectedColumn3}</b><br>
        Time: %{x}<br>
        Value: %{y:.6f}<extra></extra>
      `
                      }
                    ]}
                    layout={{
                      width: 800 * xScale,
                      height: 500,
                      margin: {
                        l: 60,
                        r: 30,
                        b: 80,
                        t: 30,
                        pad: 4
                      },
                      xaxis: {
                        title: 'Time',
                        type: 'category',
                        tickmode: 'array',
                        tickvals: getOptimizedTicks(combinedGraphData.map(item => item.time)),
                        tickangle: 0,
                        gridcolor: '#f0f0f0',
                        gridwidth: 1,
                        showgrid: true,
                        automargin: true
                      },
                      yaxis: {
                        title: 'Value',
                        range: [-0.5 / yScale, 0.5 / yScale],
                        tickvals: generateTicks(-0.5 / yScale, 0.5 / yScale),
                        tickmode: 'array',
                        nticks: 6,
                        gridcolor: '#f0f0f0',
                        gridwidth: 1,
                        zeroline: true,
                        zerolinecolor: '#f0f0f0',
                        zerolinewidth: 1
                      },
                      plot_bgcolor: 'white',
                      paper_bgcolor: 'white',
                      showlegend: true,
                      legend: {
                        orientation: 'h',
                        y: 1.1,
                        x: 0.5,
                        xanchor: 'center'
                      },
                      hovermode: 'x unified',
                      hoverlabel: {
                        bgcolor: 'white',
                        bordercolor: '#ddd',
                        font: {
                          family: 'Arial',
                          size: 12,
                          color: 'black'
                        }
                      }
                    }}
                    config={{
                      displayModeBar: true,
                      responsive: true,
                      displaylogo: false
                    }}
                    style={{ maxHeight: '800px' }}
                  />

                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default GapRemoval;
