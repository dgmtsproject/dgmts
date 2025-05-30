import React, { useState, useEffect, useRef } from "react";
// import { forwardRef, useImperativeHandle } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import HeaNavLogo from "./HeaNavLogo";
import TrackMerger from "./MergeTracks";
import html2canvas from "html2canvas";
import Plot from "react-plotly.js";
import MainContentWrapper from "./MainContentWrapper";

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
  const [drillStartTimes, setDrillStartTimes] = useState<string[]>([]);
  const [drillEndTimes, setDrillEndTimes] = useState<string[]>([]);
  const [trackTrainTimes, setTrackTrainTimes] = useState<Record<string, string[]>>({});

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

    const tracksInData = new Set<string>();
    if (jsonData.length > 0) {
      const headers = jsonData[0];
      headers.forEach(header => {
        if (typeof header === 'string') {
          const match = header.match(/TK(\d+)/i);
          if (match && match[1]) {
            tracksInData.add(match[1]);
          }
        }
      });
    }

    const trackNumbers = new Set<string>();
    if (jsonData.length > 0) {
      const headers = jsonData[0];
      headers.forEach(header => {
        if (typeof header === 'string') {
          const match = header.match(/TK(\d+)/i);
          if (match && match[1]) {
            trackNumbers.add(match[1]);
          }
        }
      });
    }
    const drillFileData = localStorage.getItem("drillExcelFile");
    if (drillFileData) {
      const drillByteCharacters = atob(drillFileData);
      const drillByteNumbers = new Array(drillByteCharacters.length)
        .fill(null)
        .map((_, i) => drillByteCharacters.charCodeAt(i));
      const drillByteArray = new Uint8Array(drillByteNumbers);

      const drillWorkbook = XLSX.read(drillByteArray, { type: "array" });
      const drillWorksheet = drillWorkbook.Sheets[drillWorkbook.SheetNames[0]];
      const drillJsonData = XLSX.utils.sheet_to_json(drillWorksheet, { header: 1 });

      const startTimes: string[] = [];
      const endTimes: string[] = [];

      for (const row of drillJsonData) {
        if (Array.isArray(row) && row.length >= 2) {
          const activity = String(row[0]).trim().toUpperCase();
          const time = String(row[1]).trim();

          if (activity === 'DRILL START') {
            startTimes.push(time);
          } else if (activity === 'DRILL COMPLETED') {
            endTimes.push(time);
          }
        }
      }

      setDrillStartTimes(startTimes);
      setDrillEndTimes(endTimes);

      console.log("Drill Start Times:", startTimes);
      console.log("Drill End Times:", endTimes);
    } else {
      console.log("No drill file data found");
    }

    const trainFileData = localStorage.getItem("trainExcelFile");

    if (trainFileData) {
      const trainByteCharacters = atob(trainFileData);
      const trainByteArray = new Uint8Array(trainByteCharacters.length);
      for (let i = 0; i < trainByteCharacters.length; i++) {
        trainByteArray[i] = trainByteCharacters.charCodeAt(i);
      }

      const trainWorkbook = XLSX.read(trainByteArray, { type: "array" });
      const trainWorksheet = trainWorkbook.Sheets[trainWorkbook.SheetNames[0]];
      const trainJsonData = XLSX.utils.sheet_to_json(trainWorksheet, { header: 1 });
      console.log("Train JSON Data:", trainJsonData);

      const allTrainTimes: string[] = [];

      // Process each row of train data (skip header row)
      for (let i = 1; i < trainJsonData.length; i++) {
        const row = trainJsonData[i];
        if (Array.isArray(row) && row.length >= 2) {
          const timeStr = String(row[1]).trim();
          if (timeStr) {  // Only add if time exists
            allTrainTimes.push(timeStr);
          }
        }
      }

      // Sort all times chronologically
      allTrainTimes.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

      // Convert to trackTrainTimes format (using a dummy track key if needed)
      const trackTrainTimes = {
        "all": allTrainTimes  // Using "all" as the track key
      };

      console.log("All Train Times:", trackTrainTimes);
      setTrackTrainTimes(trackTrainTimes);
    } else {
      console.log("No train file data found");
    }
    console.log("Track Train Times:", trackTrainTimes);
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


  function formatTime(timeString: string): string {
    const date = new Date(timeString);
    return date.toLocaleString('en-US', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).replace(',', '');
  }
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
          usFormattedDate = `${day}/${month}/${year} ${timePart}`;
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


  // const generateTicks = (min: number, max: number) => {
  //   const range = max - min;
  //   const approxSteps = 10;
  //   const step = range / approxSteps;

  //   const ticks = [];
  //   for (let i = min; i <= max + 1e-9; i += step) {
  //     ticks.push(Number(i.toFixed(2)));
  //   }
  //   return ticks;
  // };


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

  const filteredHeaders = headers.filter(
    (header) =>
      typeof header === "string" &&
      !header.toLowerCase().includes("difference") &&
      !header.toLowerCase().includes("time")
  );

  // function formatDrillTime(timeString: string): string {
  //   if (!timeString) return '';

  //   const date = new Date(timeString);
  //   if (isNaN(date.getTime())) return '';

  //   // Format to match graph data's hourly format: 'MM/DD/YYYY HH:00'
  //   const pad = (num: number) => num.toString().padStart(2, '0');
  //   return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${pad(date.getHours())}:00`;
  // }

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
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
                  <div style={{ width: '100%', overflowX: 'auto' }}>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      First Graph ({selectedColumn1})
                    </h3>

                    <Plot
                      data={[
                        {
                          x: graphData1.map(item => new Date(item.time)),
                          y: graphData1.map(item => item.value),
                          type: 'scatter',
                          mode: 'lines+markers',
                          name: selectedColumn1,
                          line: { color: '#8884d8', shape: 'spline' },
                          marker: { size: 6, color: '#8884d8' },
                          hoverinfo: 'y+name',
                          hovertemplate: `
                                  <b>${selectedColumn1}</b><br>
                                  Time: %{x|%m/%d/%Y %H:%M}<br>
                                  Value: %{y:.6f}<extra></extra>
                                      `,
                          connectgaps: true
                        }
                      ]}
                      layout={{
                        autosize: true,
                        height: 500,
                        margin: {
                          l: 60,
                          r: 30,
                          b: 150,
                          t: 30,
                          pad: 4
                        },
                        xaxis: {
                          title: {
                            text: 'Time',
                            standoff: 25,
                            position: 'bottom right',
                            font: { size: 12, weight: 600 }
                          },
                          type: 'date',
                          tickmode: 'auto',
                          nticks: undefined,
                          tickformat: '%m/%d %H:%M',
                          tickangle: 0,
                          gridcolor: '#f0f0f0',
                          gridwidth: 1,
                          showgrid: true,
                          automargin: true,
                          autorange: true
                        },
                        yaxis: {
                          title: {
                            text: 'Movement Inches',
                            standoff: 15
                          },
                          autorange: true,
                          tickmode: 'auto',
                          gridcolor: '#f0f0f0',
                          gridwidth: 1,
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          zerolinewidth: 1,
                          showgrid: true,
                          fixedrange: false
                        },
                        shapes: [
                          ...drillStartTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          // Drill end lines (green)
                          ...drillEndTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          ...(trackTrainTimes["all"] || []).map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: {
                              color: '#2196F3',
                              width: 2,
                              dash: 'solid' as 'solid'
                            },
                            opacity: 0.5,
                            name: 'Train Time'
                          })),
                          // Alert lines (red)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.875,
                            y1: 0.875,
                            label: 'Alert' as any,
                            line: {
                              color: 'red',
                              width: 1,
                              dash: 'dash' as 'dash',
                              
                            },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.875,
                            y1: -0.875,
                            line: { color: 'red', width: 2, dash: 'dash' as 'dash' },
                          },
                          // Warning lines (orange)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.5,
                            y1: 0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.5,
                            y1: -0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash' },
                          },
                          // Internal warning lines (yellow)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.25,
                            y1: 0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.25,
                            y1: -0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash' },
                          }
                        ],
                        annotations: [
                          ...(drillStartTimes.length > 0 ? [{
                            x: 0,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'>Drill Start: ${formatTime(drillStartTimes[0])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'left' as 'left',
                            align: 'left' as 'left',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          // Only show last drill end annotation
                          ...(drillEndTimes.length > 0 ? [{
                            x: 1,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'> Drill End: ${formatTime(drillEndTimes[drillEndTimes.length - 1])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'right' as 'right',
                            align: 'right' as 'right',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          ...Object.entries(trackTrainTimes).flatMap(([track, times]) => {
                            if (times.length === 0) return [];
                            const firstTime = times[0];
                            const lastTime = times[times.length - 1];
                            const yPos = -0.25;
                            return [
                              {
                                x: 0,
                                y: yPos,
                                xref: 'paper' as 'paper',
                                yref: 'paper' as 'paper',
                                text: `<span style='color:#2196F3'>Trains TK-${track} Start Time: ${formatTime(firstTime)}</span>`,
                                showarrow: false,
                                font: { size: 10 },
                                xanchor: 'left' as 'left',
                                align: 'left' as 'left',
                                bgcolor: 'rgba(255,255,255,0.8)'
                              },
                              ...(firstTime !== lastTime ? [{
                                x: 1,
                                y: yPos,
                                xref: 'paper' as 'paper',
                                yref: 'paper' as 'paper',
                                text: `<span style='color:#2196F3'>Trains TK-${track} End Time: ${formatTime(lastTime)}</span>`,
                                showarrow: false,
                                font: { size: 10 },
                                xanchor: 'right' as 'right',
                                align: 'right' as 'right',
                                bgcolor: 'rgba(255,255,255,0.8)'
                              }] : [])
                            ];
                          }),
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
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.26,
                            yref: 'y',
                            text: 'Warning (Internal)',
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
                            text: 'Warning (Internal)',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          }
                        ],
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        showlegend: true,
                        legend: {
                          orientation: 'h',
                          y: -0.35,
                          x: 0.5,
                          xanchor: 'center' as 'center'
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
                        width: '100%',
                        minWidth: '800px',
                        height: '100%'
                      }}
                      useResizeHandler={true}
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
                          x: graphData2.map(item => new Date(item.time)),
                          y: graphData2.map(item => item.value),
                          type: 'scatter',
                          mode: 'lines+markers',
                          name: selectedColumn2,
                          line: {
                            color: '#82ca9d',
                            shape: 'spline',
                            width: 2
                          },
                          marker: {
                            size: 8,
                            color: '#82ca9d',
                            line: {
                              width: 1,
                              color: '#fff'
                            }
                          },
                          hovertemplate: `
                                    <b>${selectedColumn2}</b><br>
                                    Time: %{x|%m/%d/%Y %H:%M}<br>
                                    Value: %{y:.7f}<extra></extra>
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
                        autosize: true,
                        height: 500,
                        margin: {
                          l: 60,
                          r: 30,
                          b: 150,
                          t: 30,
                          pad: 4
                        },
                        xaxis: {
                          title: {
                            text: 'Time',
                            standoff: 25,
                            font: {
                              size: 12,
                              weight: 600
                            },
                          },
                          type: 'date',
                          tickmode: 'auto',
                          nticks: undefined,
                          tickformat: '%m/%d %H:%M',
                          tickangle: 0,
                          gridcolor: 'rgba(240, 240, 240, 0.7)',
                          gridwidth: 1,
                          showgrid: true,
                          automargin: true,
                          range: graphData2?.length
                            ? [
                              new Date(graphData2[0].time).getTime(),
                              new Date(graphData2[graphData2.length - 1].time).getTime()
                            ]
                            : [0, 0]
                        },
                        yaxis: {
                          title: {
                            text: 'Movement Inches',
                            standoff: 15
                          },
                          autorange: true,
                          tickmode: 'auto',
                          gridcolor: '#f0f0f0',
                          gridwidth: 1,
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          zerolinewidth: 1,
                          showgrid: true,
                          fixedrange: false
                        },
                        shapes: [
                          ...drillStartTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          // Drill end lines (green)
                          ...drillEndTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          ...(trackTrainTimes["all"] || []).map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: {
                              color: '#2196F3',
                              width: 2,
                              dash: 'solid' as 'solid'
                            },
                            opacity: 0.5,
                            name: 'Train Time'
                          })),
                          // Alert lines (red)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.875,
                            y1: 0.875,
                            label: 'Alert' as any,
                            line: {
                              color: 'red',
                              width: 2,
                              dash: 'dash' as 'dash',
                            },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.875,
                            y1: -0.875,
                            line: { color: 'red', width: 2, dash: 'dash' as 'dash' },
                          },
                          // Warning lines (orange)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.5,
                            y1: 0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash', },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.5,
                            y1: -0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash', },
                          },
                          // Internal warning lines (yellow)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.25,
                            y1: 0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.25,
                            y1: -0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash' },
                          },
                        ],
                        annotations: [
                          ...(drillStartTimes.length > 0 ? [{
                            x: 0,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'>Drill Start: ${formatTime(drillStartTimes[0])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'left' as 'left',
                            align: 'left' as 'left',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          // Only show last drill end annotation
                          ...(drillEndTimes.length > 0 ? [{
                            x: 1,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'>Drill End: ${formatTime(drillEndTimes[drillEndTimes.length - 1])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'right' as 'right',
                            align: 'right' as 'right',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          ...(trackTrainTimes["all"] || []).map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: {
                              color: '#2196F3',
                              width: 2,
                              dash: 'solid' as 'solid'
                            },
                            opacity: 0.5,
                            name: 'Train Time'
                          })),
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
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.26,
                            yref: 'y',
                            text: 'Warning (Internal)',
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
                            text: 'Warning (Internal)',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          }
                        ],
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        showlegend: true,
                        legend: {
                          orientation: 'h',
                          y: -0.2,
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
                        scrollZoom: true
                      }}
                      style={{
                        width: '100%',
                        minWidth: '800px',
                        height: '100%'
                      }}
                      useResizeHandler={true}
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
                          x: graphData3.map(item => new Date(item.time)),
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
        Time: %{x|%m/%d/%Y %H:%M}<br>
        Value: %{y:.7f}<extra></extra>
      `
                        }
                      ]}
                      layout={{
                        autosize: true,
                        height: 500,
                        margin: {
                          l: 60,
                          r: 30,
                          b: 150,
                          t: 30,
                          pad: 4
                        },
                        xaxis: {
                          title: {
                            text: 'Time',
                            standoff: 25,
                            font: {
                              size: 12,
                              weight: 600
                            },
                          },
                          type: 'date',
                          tickmode: 'auto',
                          nticks: Math.min(10, graphData3.length),
                          tickformat: '%m/%d %H:%M',
                          tickangle: 0,
                          gridcolor: '#f0f0f0',
                          gridwidth: 1,
                          showgrid: true,
                          automargin: true,
                          range: graphData3?.length
                            ? [
                              new Date(graphData3[0].time).getTime(),
                              new Date(graphData3[graphData3.length - 1].time).getTime()
                            ]
                            : [0, 0]
                        },
                        yaxis: {
                          title: {
                            text: 'Movement Inches',
                            standoff: 15
                          },
                          autorange: true,
                          tickmode: 'auto',
                          gridcolor: '#f0f0f0',
                          gridwidth: 1,
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          zerolinewidth: 1,
                          showgrid: true,
                          fixedrange: false
                        },
                        shapes: [
                          ...drillStartTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          // Drill end lines (green)
                          ...drillEndTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          ...(trackTrainTimes["all"] || []).map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: {
                              color: '#2196F3',
                              width: 2,
                              dash: 'solid' as 'solid'
                            },
                            opacity: 0.5,
                            name: 'Train Time'
                          })),
                          // Alert lines (red)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.875,
                            y1: 0.875,
                            label: 'Alert' as any,
                            line: {
                              color: 'red',
                              width: 2,
                              dash: 'dash' as 'dash',
                            },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.875,
                            y1: -0.875,
                            line: { color: 'red', width: 2, dash: 'dash' as 'dash' },
                          },
                          // Warning lines (orange)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.5,
                            y1: 0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash' },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.5,
                            y1: -0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash', },
                          },
                          // Internal warning lines (yellow)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.25,
                            y1: 0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash', },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.25,
                            y1: -0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash',},
                          },
                        ],
                        annotations: [
                          ...(drillStartTimes.length > 0 ? [{
                            x: 0,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'>Drill Start: ${formatTime(drillStartTimes[0])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'left' as 'left',
                            align: 'left' as 'left',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          // Only show last drill end annotation
                          ...(drillEndTimes.length > 0 ? [{
                            x: 1,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'>Drill End: ${formatTime(drillEndTimes[drillEndTimes.length - 1])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'right' as 'right',
                            align: 'right' as 'right',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          ...(trackTrainTimes["all"] && trackTrainTimes["all"].length > 0 ? [
                            {
                              x: 0,
                              y: -0.25,
                              xref: 'paper' as 'paper',
                              yref: 'paper' as 'paper',
                              text: `<span style='color:#2196F3'>First Train: ${formatTime(trackTrainTimes["all"][0])}</span>`,
                              showarrow: false,
                              font: { size: 10 },
                              xanchor: 'left' as 'left',
                              align: 'left' as 'left',
                              bgcolor: 'rgba(255,255,255,0.8)'
                            },
                            ...(trackTrainTimes["all"].length > 1 ? [{
                              x: 1,
                              y: -0.25,
                              xref: 'paper' as 'paper',
                              yref: 'paper' as 'paper',
                              text: `<span style='color:#2196F3'>Last Train: ${formatTime(trackTrainTimes["all"][trackTrainTimes["all"].length - 1])}</span>`,
                              showarrow: false,
                              font: { size: 10 },
                              xanchor: 'right' as 'right',
                              align: 'right' as 'right',
                              bgcolor: 'rgba(255,255,255,0.8)'
                            }] : [])
                          ] : []), 
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
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.26,
                            yref: 'y',
                            text: 'Warning (Internal)',
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
                            text: 'Warning (Internal)',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          }
                        ],
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        showlegend: true,
                        legend: {
                          orientation: 'h',
                          y: -0.2,
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
                        displaylogo: false,
                        scrollZoom: true
                      }}
                      style={{
                        width: '100%',
                        minWidth: '800px',
                        height: '100%'
                      }}
                      useResizeHandler={true}
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
                          x: combinedGraphData.map(item => new Date(item.time)),
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
        Time: %{x|%m/%d/%Y %H:%M}<br>
        Value: %{y:.6f}<extra></extra>
      `
                        },
                        {
                          x: combinedGraphData.map(item => new Date(item.time)),
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
        Time: %{x|%m/%d/%Y %H:%M}<br>
        Value: %{y:.6f}<extra></extra>
      `
                        },
                        {
                          x: combinedGraphData.map(item => new Date(item.time)),
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
        Time: %{x|%m/%d/%Y %H:%M}<br>
        Value: %{y:.6f}<extra></extra>
      `
                        }
                      ]}
                      layout={{
                        autosize: true,
                        height: 500,
                        margin: {
                          l: 60,
                          r: 30,
                          b: 150,
                          t: 30,
                          pad: 4
                        },
                        xaxis: {
                          title: {
                            text: 'Time',
                            standoff: 25,
                            position: 'bottom right',
                            font: {
                              size: 12,
                              weight: 600
                            },
                          },
                          type: 'date',
                          tickmode: 'auto',
                          nticks: Math.min(10, combinedGraphData.length),
                          tickformat: '%m/%d %H:%M',
                          tickangle: 0,
                          gridcolor: '#f0f0f0',
                          gridwidth: 1,
                          showgrid: true,
                          automargin: true,
                          range: combinedGraphData?.length
                            ? [
                              new Date(combinedGraphData[0].time).getTime(),
                              new Date(combinedGraphData[combinedGraphData.length - 1].time).getTime()
                            ]
                            : [0, 0]
                        },
                        yaxis: {
                          title: {
                            text: 'Movement Inches',
                            standoff: 15
                          },
                          autorange: true,
                          tickmode: 'auto',
                          gridcolor: '#f0f0f0',
                          gridwidth: 1,
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          zerolinewidth: 1,
                          showgrid: true,
                          fixedrange: false
                        },
                        shapes: [
                          ...drillStartTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          // Drill end lines (green)
                          ...drillEndTimes.map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: { color: 'red', width: 2, dash: 'solid' as 'solid' },
                            opacity: 0.7
                          })),
                          ...(trackTrainTimes["all"] || []).map(time => ({
                            type: 'line' as 'line',
                            xref: 'x' as 'x',
                            yref: 'paper' as 'paper',
                            x0: new Date(time),
                            y0: 0,
                            x1: new Date(time),
                            y1: 1,
                            line: {
                              color: '#2196F3',
                              width: 2,
                              dash: 'solid' as 'solid'
                            },
                            opacity: 0.5,
                            name: 'Train Time'
                          })),
                          // Alert lines (red)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.875,
                            y1: 0.875,
                            label: 'Alert' as any,
                            line: {
                              color: 'red',
                              width: 2,
                              dash: 'dash' as 'dash',
                            },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.875,
                            y1: -0.875,
                            line: { color: 'red', width: 2, dash: 'dash' as 'dash', },
                          },
                          // Warning lines (orange)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.5,
                            y1: 0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash', },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.5,
                            y1: -0.5,
                            line: { color: 'orange', width: 2, dash: 'dash' as 'dash', },
                          },
                          // Internal warning lines (yellow)
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: 0.25,
                            y1: 0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash', },
                          },
                          {
                            type: 'line',
                            x0: 0,
                            x1: 1,
                            xref: 'paper',
                            y0: -0.25,
                            y1: -0.25,
                            line: { color: 'yellow', width: 2, dash: 'dash' as 'dash', },
                          },
                        ],
                        annotations: [
                          ...(drillStartTimes.length > 0 ? [{
                            x: 0,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'>Drill Start: ${formatTime(drillStartTimes[0])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'left' as 'left',
                            align: 'left' as 'left',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          // Only show last drill end annotation
                          ...(drillEndTimes.length > 0 ? [{
                            x: 1,
                            y: -0.15,
                            xref: 'paper' as 'paper',
                            yref: 'paper' as 'paper',
                            text: `<span style='color:red'>Drill End: ${formatTime(drillEndTimes[drillEndTimes.length - 1])}</span>`,
                            showarrow: false,
                            font: { size: 10 },
                            xanchor: 'right' as 'right',
                            align: 'right' as 'right',
                            bgcolor: 'rgba(255,255,255,0.8)'
                          }] : []),
                          ...Object.entries(trackTrainTimes).flatMap(([track, times]) => {
                            if (times.length === 0) return [];
                            const firstTime = times[0];
                            const lastTime = times[times.length - 1];
                            const yPos = -0.25;
                            return [
                              {
                                x: 0,
                                y: yPos,
                                xref: 'paper' as 'paper',
                                yref: 'paper' as 'paper',
                                text: `<span style='color:#2196F3'>Trains TK-${track} Start Time: ${formatTime(firstTime)}</span>`,
                                showarrow: false,
                                font: { size: 10 },
                                xanchor: 'left' as 'left',
                                align: 'left' as 'left',
                                bgcolor: 'rgba(255,255,255,0.8)'
                              },
                              ...(firstTime !== lastTime ? [{
                                x: 1,
                                y: yPos,
                                xref: 'paper' as 'paper',
                                yref: 'paper' as 'paper',
                                text: `<span style='color:#2196F3'>Trains TK-${track} End Time: ${formatTime(lastTime)}</span>`,
                                showarrow: false,
                                font: { size: 10 },
                                xanchor: 'right' as 'right',
                                align: 'right' as 'right',
                                bgcolor: 'rgba(255,255,255,0.8)'
                              }] : [])
                            ];
                          }),
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
                          {
                            x: 0.001,
                            xref: 'paper',
                            y: 0.26,
                            yref: 'y',
                            text: 'Warning (Internal)',
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
                            text: 'Warning (Internal)',
                            showarrow: false,
                            font: { color: 'black', size: 10 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            xanchor: 'left'
                          }
                        ],
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        showlegend: true,
                        legend: {
                          orientation: 'h',
                          y: -0.2,
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
                        displaylogo: false,
                        scrollZoom: true
                      }}
                      style={{
                        width: '100%',
                        minWidth: '800px',
                        height: '100%'
                      }}
                      useResizeHandler={true}
                    />

                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </MainContentWrapper>
    </>
  );
};

export default GapRemoval;