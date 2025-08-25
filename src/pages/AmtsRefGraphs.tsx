import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import HeaNavLogo from "../components/HeaNavLogo";
import BackButton from '../components/Back';
import TrackMerger from "../components/MergeAmtsRefTracks";
import html2canvas from "html2canvas";
import Plot from "react-plotly.js";
import { toast } from "react-toastify";
import MainContentWrapper from "../components/MainContentWrapper";

const AmtsRefGraphs: React.FC = () => {

  const processSaveRef = useRef<HTMLButtonElement>(null);

  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [selectedColumn1, setSelectedColumn1] = useState<string>("placeholder");
  const [selectedColumn2, setSelectedColumn2] = useState<string>("placeholder");
  const [xScale, setXScale] = useState<number>(1);
  const [yScale, setYScale] = useState<number>(1);
  const [headers, setHeaders] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<string[][]>([]);
  const [allLinesData1, setAllLinesData1] = useState<any[]>([]);
  const [allLinesData2, setAllLinesData2] = useState<any[]>([]);
  // seperate headers for the 
  const [showGraph, setShowGraph] = useState(false);
  const handleMergeClick = () => {
    processSaveRef.current?.click(); // simulate click
  };
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
  const selectoptions = [
    "Easting",
    "Northing",
    "Height",
  ]

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
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (string | number | null)[][];

    if (jsonData.length === 0) return;

    // Filter out null/empty headers and their corresponding columns
    const headers = jsonData[0].filter((header, index) => {
      // Keep Time column and all non-null headers
      return index === 0 || (header !== null && header !== "null" && header !== "");
    });

    // Reorganize the data to group AMTS-1 and AMTS-2 columns together
    const reorderedHeaders = ["Time"];
    const amts1Columns = [];
    const amts2Columns = [];

    // Separate AMTS-1 and AMTS-2 columns
    for (let i = 1; i < headers.length; i++) {
      const header = headers[i];
      if (typeof header === 'string') {
        if (header.includes('AMTS1')) {
          amts1Columns.push({ header, index: i });
        } else if (header.includes('AMTS2')) {
          amts2Columns.push({ header, index: i });
        }
      }
    }

    // Sort AMTS-1 and AMTS-2 columns by reference number and measurement type
    const sortColumns = (columns: { header: string, index: number }[]) => {
      return columns.sort((a, b) => {
        // Extract reference number (e.g., Ref01, Ref02)
        const refA = a.header.match(/Ref(\d+)/)?.[1] || '0';
        const refB = b.header.match(/Ref(\d+)/)?.[1] || '0';

        // Extract measurement type (Easting, Northing, Height)
        const typeA = a.header.split(' - ')[1];
        const typeB = b.header.split(' - ')[1];

        return refA.localeCompare(refB) || typeA.localeCompare(typeB);
      });
    };

    const sortedAmts1 = sortColumns(amts1Columns);
    const sortedAmts2 = sortColumns(amts2Columns);

    sortedAmts1.forEach(col => reorderedHeaders.push(col.header));
    sortedAmts2.forEach(col => reorderedHeaders.push(col.header));


    const processedData = jsonData.map((row, rowIndex) => {
      if (rowIndex === 0) return reorderedHeaders;

      const newRow: (string | number | null)[] = [row[0]];


      sortedAmts1.forEach(col => {
        newRow.push(row[col.index]);
      });

      sortedAmts2.forEach(col => {
        newRow.push(row[col.index]);
      });

      return newRow;
    });


    const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(processedData);
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


    localStorage.setItem("processedHeaders", JSON.stringify(reorderedHeaders));
    localStorage.setItem("processedData", JSON.stringify(processedData));
    setHeaders(reorderedHeaders as string[]);
    setProcessedData(processedData as string[][]);
  };
  const handleColumnSelect = () => {
    if (selectedColumn1 === "placeholder" || selectedColumn2 === "placeholder") {
      toast.error("Please select both measurement types");
      return;
    }
    const selected1 = selectedColumn1.trim();
    const selected2 = selectedColumn2.trim();
    // Get processed data from localStorage
    const processedData = JSON.parse(localStorage.getItem("processedData") || "[]");
    if (processedData.length === 0) return;

    const headers = processedData[0];
    const timeIndex = 0;

    const amts1Lines: React.SetStateAction<any[]> = [];
    const amts1Data = [];

    const amts2Lines: React.SetStateAction<any[]> = [];
    const amts2Data = [];

    for (let i = 1; i < headers.length; i++) {
      const header = headers[i];
      if (typeof header === 'string') {
        if (header.includes('AMTS1') && header.includes(selected1)) {
          // For AMTS-1 chart
          const lineData = {
            x: [] as string[],
            y: [] as number[],
            name: header,
            type: 'scatter',
            mode: 'lines+markers',
            line: { shape: 'spline' },
            marker: { size: 6 }
          };
          for (let j = 1; j < processedData.length; j++) {
            const row = processedData[j];
            lineData.x.push(row[timeIndex] as string);
            lineData.y.push(Number(row[i]) || 0);
          }

          amts1Lines.push(lineData);
          amts1Data.push(...lineData.y);
        }
        else if (header.includes('AMTS2') && header.includes(selected2)) {
          const lineData = {
            x: [] as string[],
            y: [] as number[],
            name: header,
            type: 'scatter',
            mode: 'lines+markers',
            line: { shape: 'spline' },
            marker: { size: 6 }
          };

          for (let j = 1; j < processedData.length; j++) {
            const row = processedData[j];
            lineData.x.push(row[timeIndex] as string);
            lineData.y.push(Number(row[i]) || 0);
          }

          amts2Lines.push(lineData);
          amts2Data.push(...lineData.y);
        }
      }
    }

    // Calculate ranges for the charts
    // const minValue1 = Math.min(...amts1Data);
    // const maxValue1 = Math.max(...amts1Data);
    // const minValue2 = Math.min(...amts2Data);
    // const maxValue2 = Math.max(...amts2Data);


    setAllLinesData1(amts1Lines);
    setAllLinesData2(amts2Lines);

  };
  console.log("all lines data 1", allLinesData1);
  console.log("all lines data 2", allLinesData2);

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


  useEffect(() => {
    const storedHeaders = localStorage.getItem("processedHeaders");
    const storedData = localStorage.getItem("processedData");

    if (storedHeaders && storedData) {
      setHeaders(JSON.parse(storedHeaders));
      setProcessedData(JSON.parse(storedData));
    }
  }, []);
  // do anything for processed data and headers
  console.log("processed data", processedData);
  console.log("headers", headers);

  const handleDownload = () => {
    if (processedBlob) {
      saveAs(processedBlob, "Amts-reference-tracks.xlsx");
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


  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton to="/dashboard" />
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
                  Select For AMTS-1 Ref Prisms
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
                    Select an option
                  </option>
                  {selectoptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
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
                  Select for AMTS-2 Ref Prisms:
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
                    Select an option
                  </option>
                  {selectoptions.map((option, index) => (
                    <option key={index} value={option}>
                      {option}
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
                  {/* First Chart */}
                  <div>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      AMTS 1 - Ref -Prisms-{selectedColumn1}
                    </h3>

                    <Plot
                      data={allLinesData1}
                      layout={{
                        width: 800 * xScale,
                        height: 500,
                        margin: { l: 60, r: 30, b: 80, t: 30, pad: 4 },
                        shapes: [
                          // Alert lines (red)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.875,
                            y1: 0.875,
                            line: { color: 'red', width: 1, dash: 'solid' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.875,
                            y1: -0.875,
                            line: { color: 'red', width: 1, dash: 'solid' },
                          },
                          // Warning lines (orange)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.5,
                            y1: 0.5,
                            line: { color: 'orange', width: 1, dash: 'solid' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.5,
                            y1: -0.5,
                            line: { color: 'orange', width: 1, dash: 'solid' },
                          },
                          // Internal warning lines (yellow)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.25,
                            y1: 0.25,
                            line: { color: 'yellow', width: 1, dash: 'solid' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.25,
                            y1: -0.25,
                            line: { color: 'yellow', width: 1, dash: 'solid' },
                          }
                        ],
                        annotations: [
                          // Alert line labels (floating at left edge)
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.88,
                            yref: 'y',
                            text: 'Alert',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: -0.88,
                            yref: 'y',
                            text: 'Alert',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          // Warning line labels
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.51,
                            yref: 'y',
                            text: 'Warning',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: -0.51,
                            yref: 'y',
                            text: 'Warning',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          // Internal warning line labels
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.26,
                            yref: 'y',
                            text: 'Internal',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: -0.26,
                            yref: 'y',
                            text: 'Internal',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          }
                        ],
                        xaxis: {
                          title: { text: 'Time' },
                          type: 'category',
                          tickmode: 'array',
                          tickvals: allLinesData1[0]?.x ? getOptimizedTicks(allLinesData1[0].x) : [],
                          tickangle: 0,
                          gridcolor: 'rgba(240, 240, 240, 0.7)',
                          gridwidth: 1,
                          showgrid: true,
                          automargin: true,
                          tickfont: { size: 11 }
                        },
                        yaxis: {
                          title: { text: selectedColumn1, standoff: 15 },
                          gridcolor: 'rgba(240, 240, 240, 0.7)',
                          gridwidth: 1,
                          zeroline: true,
                          zerolinecolor: 'rgba(240, 240, 240, 0.7)',
                          zerolinewidth: 1,
                          tickfont: { size: 11 }
                        },
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        showlegend: true,
                        legend: {
                          orientation: 'h',
                          y: -0.2,
                          x: 0.5,
                          xanchor: 'center',
                          font: { size: 12 }
                        },
                        hovermode: 'x unified',
                        hoverlabel: {
                          bgcolor: 'white',
                          bordercolor: '#ddd',
                          font: { family: 'Arial', size: 12, color: 'black' }
                        }
                      }}
                      config={{
                        displayModeBar: true,
                        responsive: true,
                        displaylogo: false,
                        scrollZoom: true,
                      }}
                      style={{
                        maxHeight: '800px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '4px'
                      }}
                    />

                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '10px' }}>
                      AMTS-1-Ref-Prisms-{selectedColumn1}
                    </div>
                  </div>

                  {/* Second Chart */}
                  <div style={{ marginTop: '3rem' }}>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      AMTS 2 - Ref -Prisms-{selectedColumn2}
                    </h3>

                    <Plot
                      data={allLinesData2}
                      layout={{
                        width: 800 * xScale,
                        height: 500,
                        margin: { l: 60, r: 30, b: 80, t: 30, pad: 4 },
                                                shapes: [
                          // Alert lines (red)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.875,
                            y1: 0.875,
                            line: { color: 'red', width: 1, dash: 'solid' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.875,
                            y1: -0.875,
                            line: { color: 'red', width: 1, dash: 'solid' },
                          },
                          // Warning lines (orange)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.5,
                            y1: 0.5,
                            line: { color: 'orange', width: 1, dash: 'solid' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.5,
                            y1: -0.5,
                            line: { color: 'orange', width: 1, dash: 'solid' },
                          },
                          // Internal warning lines (yellow)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.25,
                            y1: 0.25,
                            line: { color: 'yellow', width: 1, dash: 'solid' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.25,
                            y1: -0.25,
                            line: { color: 'yellow', width: 1, dash: 'solid' },
                          }
                        ],
                        annotations: [
                          // Alert line labels (floating at left edge)
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.88,
                            yref: 'y',
                            text: 'Alert',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: -0.88,
                            yref: 'y',
                            text: 'Alert',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          // Warning line labels
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.51,
                            yref: 'y',
                            text: 'Warning',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: -0.51,
                            yref: 'y',
                            text: 'Warning',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          // Internal warning line labels
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.26,
                            yref: 'y',
                            text: 'Internal',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          },
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: -0.26,
                            yref: 'y',
                            text: 'Internal',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          }
                        ],
                        xaxis: {
                          title: { text: 'Time' },
                          type: 'category',
                          tickmode: 'array',
                          tickvals: allLinesData2[0]?.x ? getOptimizedTicks(allLinesData2[0].x) : [],
                          tickangle: 0,
                          gridcolor: 'rgba(240, 240, 240, 0.7)',
                          gridwidth: 1,
                          showgrid: true,
                          automargin: true,
                          tickfont: { size: 11 }
                        },
                        yaxis: {
                          title: { text: selectedColumn2, standoff: 15 },
                          range: [-0.5 / yScale, 0.5 / yScale],
                          tickvals: generateTicks(-0.5 / yScale, 0.5 / yScale),
                          tickmode: 'linear',
                          dtick: 0.25,
                          nticks: 6,
                          gridcolor: 'rgba(240, 240, 240, 0.7)',
                          gridwidth: 1,
                          zeroline: true,
                          zerolinecolor: 'rgba(240, 240, 240, 0.7)',
                          zerolinewidth: 1,
                          tickfont: { size: 11 }
                        },
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        showlegend: true,
                        legend: {
                          orientation: 'h',
                          y: -0.2,
                          x: 0.5,
                          xanchor: 'center',
                          font: { size: 12 }
                        },
                        hovermode: 'x unified',
                        hoverlabel: {
                          bgcolor: 'white',
                          bordercolor: '#ddd',
                          font: { family: 'Arial', size: 12, color: 'black' }
                        }
                      }}
                      config={{
                        displayModeBar: true,
                        responsive: true,
                        displaylogo: false,
                        scrollZoom: true
                      }}
                      style={{
                        maxHeight: '800px',
                        border: '1px solid #f0f0f0',
                        borderRadius: '4px'
                      }}
                    />

                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginTop: '10px' }}>
                      AMTS-2-Ref-Prisms-{selectedColumn2}
                    </div>
                  </div>



                </div>
              </div>
            </div>
          )}
        </div>
      </MainContentWrapper>
    </>
  )
}

export default AmtsRefGraphs;