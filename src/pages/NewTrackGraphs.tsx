import React, { useState, useEffect, useRef } from "react";
import HeaNavLogo from "../components/HeaNavLogo";
import BackButton from '../components/Back';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import TrackMerger from "../components/MergeTracks";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import html2canvas from "html2canvas"
import MainContentWrapper from "../components/MainContentWrapper";


const NewTrackGraphs: React.FC = () => {

  const processSaveRef = useRef<HTMLButtonElement>(null);
  const handleMergeClick = () => {
    processSaveRef.current?.click(); // simulate click
  };

  const [selectedRowTime1, setSelectedRowTime1] = useState<string>("placeholder");
  const [selectedRowTime2, setSelectedRowTime2] = useState<string>("placeholder");
  const [selectedRowTime3, setSelectedRowTime3] = useState<string>("placeholder");
  const [selectedAheader1, setSelectedAheader1] = useState<string>("placeholder");
  const [selectedAheader2, setSelectedAheader2] = useState<string>("placeholder");
  const [selectedAheader3, setSelectedAheader3] = useState<string>("placeholder");
  const [selectedAheader4, setSelectedAheader4] = useState<string>("placeholder");
  const [selectedAheader5, setSelectedAheader5] = useState<string>("placeholder");
  const [selectedTrack, setSelectedTrack] = useState<string>("placeholder");
  const [selectedTrkColOption, setSelectedTrkColOption] = useState<string>("placeholder");
  const [tracksizeoptions, setTrackSizeOptions] = useState<string>("placeholder");
  const [aheadersoptions, setAheadersOptions] = useState<string[]>([]);
  const [xScale, setXScale] = useState<number>(1.0);
  const [yScale, setYScale] = useState<number>(1.0);
  const [headers, setHeaders] = useState<string[]>([]);

  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [showGraph, setShowGraph] = useState(false);
  const [timeColumn, setTimeColumn] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<string[][]>([]);
  const [combinedData, setCombinedData] = useState<
    { header: string; value1: number; value2: number; value3: number }[]
  >([]);
  // const [combinedData2, setCombinedData2] = useState<
  //   { header: string; value1: number; value2: number; value3: number }[]
  // >([]);
  const [gdata, setGData] = useState<
    {
      time: string;
      gvalue1: number;
      gvalue2: number;
      gvalue3: number;
      gvalue4: number;
      gvalue5: number;
    }[]
  >([]);


  useEffect(() => {
    const storedHeaders = localStorage.getItem("processedHeaders");
    const storedData = localStorage.getItem("processedData");

    if (storedHeaders && storedData) {
      setHeaders(JSON.parse(storedHeaders));
      setProcessedData(JSON.parse(storedData));
    }
  }, []);

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
      const newRow: (string | number)[] = [row[0]]; // keep the first column (timestamp)
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
  
    const newHeader: (string | number)[] = [headers[0]]; // keep the first column (timestamp)
    for (let j = 1; j < headers.length; j += 2) {
      const h1 = headers[j] ?? `Col${j}`;
      const h2 = headers[j + 1] ?? `Col${j + 1}`;
      let label = "Difference"; // default label
  
      if (typeof h1 === "string" && typeof h2 === "string") {
        if (
          h1.toLowerCase().includes("easting") ||
          h2.toLowerCase().includes("easting")
        ) {
          label = `${h1.split(' - ')[0]},${h2.split(' - ')[0]} - Easting Difference`;
        } else if (
          h1.toLowerCase().includes("northing") ||
          h2.toLowerCase().includes("northing")
        ) {
          label = `${h1.split(' - ')[0]},${h2.split(' - ')[0]} - Northing Difference`;
        } else if (
          h1.toLowerCase().includes("height") ||
          h2.toLowerCase().includes("height")
        ) {
          label = `${h1.split(' - ')[0]},${h2.split(' - ')[0]} - Height Difference`;
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

  const handleTimeSelects = () => {
    if (!processedData.length || !headers.length) return;
  
    const track = selectedTrack; // like "LBN-TP-TK3-A"
    const columnType = selectedTrkColOption; // like "Easting" or "Easting Difference"
    const trackLimit = parseInt(tracksizeoptions, 10); // like 14
  
    if (!track || !columnType || isNaN(trackLimit)) {
      console.error("Missing track/column/track size options.");
      return;
    }
  
    const trackBase = track.slice(0, track.lastIndexOf("-")); // "LBN-TP-TK3"
    const trackSuffix = track.slice(-1); // "A" or "B"
  
    const isDifferenceType = columnType.includes("Difference");
  
    const expectedPrismPatterns = Array.from({ length: trackLimit }, (_, idx) => {
      const prismNumber = (idx + 1).toString().padStart(2, "0"); // "01", "02", etc.
  
      if (isDifferenceType) {
        // For "Easting Difference", "Northing Difference", "Height Difference"
        return `${trackBase}-${prismNumber}A,${trackBase}-${prismNumber}B - ${columnType}`;
      } else {
        // For normal "Easting", "Northing", "Height"
        return `${trackBase}-${prismNumber}${trackSuffix} - ${columnType}`;
      }
    });
  
    const matchingIndexes = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter(({ header }) => expectedPrismPatterns.includes(header));
  
    const findRow = (timestamp: string) =>
      processedData.find(row => row[0]?.toString().trim() === timestamp);
  
    const buildGraphData = (timestamp: string) => {
      const row = findRow(timestamp);
      if (!row) return [];
  
      return matchingIndexes.map(({ index, header }) => {
        const cellValue = row[index];
        return {
          header,
          value: (cellValue !== undefined && cellValue !== '' && cellValue !== null) ? Number(cellValue) : undefined,
          time: timestamp,
        };
      });
    };
  
    const data1 = buildGraphData(selectedRowTime1);
    const data2 = buildGraphData(selectedRowTime2);
    const data3 = buildGraphData(selectedRowTime3);
  
    let combinedData = matchingIndexes.map(({ header }, idx) => ({
      header,
      value1: data1[idx]?.value,
      value2: data2[idx]?.value,
      value3: data3[idx]?.value,
    }));
  
    combinedData = combinedData.filter(item => {
      return !(item.value1 === undefined && item.value2 === undefined && item.value3 === undefined);
    });
  
    setCombinedData(combinedData as { header: string; value1: number; value2: number; value3: number }[]);
  };

  const handleMovementSelects = () => {
    if (!processedData.length || !headers.length) return;

    const timeIndex = headers.indexOf("Time");
    const col1Index = headers.indexOf(selectedAheader1);
    const col2Index = headers.indexOf(selectedAheader2);
    const col3Index = headers.indexOf(selectedAheader3);
    const col4Index = headers.indexOf(selectedAheader4);
    const col5Index = headers.indexOf(selectedAheader5);

    const gData: any[] = [];

    processedData.forEach((row) => {
      const time = row[timeIndex];
      const value1 = parseFloat(row[col1Index]);
      const value2 = parseFloat(row[col2Index]);
      const value3 = parseFloat(row[col3Index]);
      const value4 = parseFloat(row[col4Index]);
      const value5 = parseFloat(row[col5Index]);


      if (
        !isNaN(value1) &&
        !isNaN(value2) &&
        !isNaN(value3) &&
        !isNaN(value4) &&
        !isNaN(value5)
      ) {
        gData.push({
          time,    // x-axis
          gvalue1: value1,
          gvalue2: value2,
          gvalue3: value3,
          gvalue4: value4,
          gvalue5: value5,
        });
      }
    });

    setGData(gData as { time: string; gvalue1: number; gvalue2: number; gvalue3: number; gvalue4: number; gvalue5: number }[]);
  };


  useEffect(() => {
    if (processedData.length > 1) {
      const timeValues = processedData.slice(1).map(row => row[0]?.toString().trim());
      setTimeColumn(timeValues as string[]);
    }
  }, [processedData]);

  useEffect(() => {
    const headers = processedData[0] || [];
    const aHeaders = headers.filter((header) =>
      typeof header === "string" &&
      /LBN-TP-[A-Za-z0-9]+-\d{2}A\s-\s(?:Easting|Height|Northing)/.test(header)
    );
    setAheadersOptions(aHeaders as string[]);
  }, [processedData]);


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
  const handleDownloadPrismGraph = () => {
    const chartContainer = document.getElementById("prismchartContainer");
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
  interface GenerateTrackOptionsProps {
    headers: string[];
  }

  const generateTrackOptions = (headers: GenerateTrackOptionsProps['headers']): string[] => {
    const trackOptions = new Set<string>(); 
    headers.forEach(header => {
    
      const match = header.match(/LBN-TP-(TK3|TK2)-/);

      if (match) {
        const trackBase = match[0]; 
        trackOptions.add(`${trackBase}A`);
        trackOptions.add(`${trackBase}B`);
      }
    });
    return Array.from(trackOptions);
  };


const selectedTrackOptions = generateTrackOptions(headers);
console.log(selectedTrackOptions);
// selectedtrackcol options Easting, Northing, Height,Easting Difference, Northing Difference, Height Difference
    const selectedTrkColOptions = [
        "Easting",
        "Northing",
        "Height",
        "Easting Difference",
        "Northing Difference",
        "Height Difference",
        ];
// selectedtrack size options 1,2,3,4,5 to 32
    const trackSizeOptions = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32"];
  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton />
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
            className="graph-container"
            style={{
              padding: "2rem",
              backgroundColor: "#ffffff",
              borderRadius: "0.5rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              marginTop: "1rem",
            }}
          >
            <div style={{ display: "flex", gap: "1rem", flexDirection: "column" }}>
              <h2
                style={{
                  fontWeight: "700",
                  fontSize: "1.5rem",
                  color: "#1f2937",
                  marginBottom: "1rem",
                }}
              >
                Select Headers For Prism Graph:
              </h2>
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
                  value={selectedRowTime1}
                  onChange={(e) => setSelectedRowTime1(e.target.value)}
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
                    Select First TimeStamp
                  </option>
                  {timeColumn.map((header, index) => (
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
                  Select Second TimeStamp:
                </label>
                <select
                  value={selectedRowTime2}
                  onChange={(e) => setSelectedRowTime2(e.target.value)}
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
                    Select Second TimeStamp
                  </option>
                  {timeColumn.map((header, index) => (
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
                  Select Third TimeStamp:
                </label>
                <select
                  value={selectedRowTime3}
                  onChange={(e) => setSelectedRowTime3(e.target.value)}
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
                    Select Third TimeStamp
                  </option>
                  {timeColumn.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}

                </select>
                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
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
                    Select a Track
                  </option>
                    {selectedTrackOptions.map((header, index) => (
                        <option key={index} value={header}>
                        {header}
                        </option>
                    ))}

                </select>
                <select
                  value={selectedTrkColOption}
                  onChange={(e) => setSelectedTrkColOption(e.target.value)}
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
                    Select Easting/Northing/Height
                  </option>
                    {selectedTrkColOptions.map((header, index) => (
                        <option key={index} value={header}>
                        {header}
                        </option>
                    ))}

                </select>
                <select
                  value={tracksizeoptions}
                  onChange={(e) => setTrackSizeOptions(e.target.value)}
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
                    Select Track Prism Size
                  </option>
                    {trackSizeOptions.map((header, index) => (
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
                onClick={handleTimeSelects}
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
                Generate Prism Graph
              </button>
              <button
                onClick={handleDownloadPrismGraph}
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
                Download Prism Graph
              </button>

              </div>
                              {/* First Chart */}
                              <div id="prismchartContainer" style={{ marginTop: "2rem" }}>
                              <div>
                  <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                    Prisms Graph
                  </h3>

                  <LineChart
                    width={800 * xScale}
                    height={500}
                    style={{ maxHeight: "800px" }}
                    data={combinedData}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="header"

                      scale="point"


                    />
                    <YAxis
                      domain={[-0.5 / yScale, 0.5 / yScale]}
                      ticks={generateTicks(-0.5 / yScale, 0.5 / yScale)}
                    />
                    <Tooltip />
                    <Legend />

                    {/* Line for graphData1 */}
                    <Line
                      type="monotone"
                      dataKey="value1"
                      stroke="#8884d8"
                      name={selectedRowTime1}
                      activeDot={{ r: 8 }}
                    />

                    {/* Line for graphData2 */}
                    <Line
                      type="monotone"
                      dataKey="value2"
                      stroke="#82ca9d"
                      name={selectedRowTime2}
                      activeDot={{ r: 8 }}
                    />

                    {/* Line for graphData3 */}
                    <Line
                      type="monotone"
                      dataKey="value3"
                      stroke="#ff7300"
                      name={selectedRowTime3}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>

                </div>
                </div>
              <h2
                style={{
                  fontWeight: "700",
                  fontSize: "1.5rem",
                  color: "#1f2937",
                  marginBottom: "1rem",
                }}
              >
                Select "A" Headers For Movement Graph:
              </h2>
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
                  value={selectedAheader1}
                  onChange={(e) => setSelectedAheader1(e.target.value)}
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
                    Select First A Header
                  </option>
                  {aheadersoptions.map((header, index) => (
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
                  Select Second A Header:
                </label>
                <select
                  value={selectedAheader2}
                  onChange={(e) => setSelectedAheader2(e.target.value)}
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
                  {aheadersoptions.map((header, index) => (
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
                  Select Third A Header:
                </label>
                <select
                  value={selectedAheader3}
                  onChange={(e) => setSelectedAheader3(e.target.value)}
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
                  {aheadersoptions.map((header, index) => (
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
                  Select Fourth A Header:
                </label>
                <select
                  value={selectedAheader4}
                  onChange={(e) => setSelectedAheader4(e.target.value)}
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
                  {aheadersoptions.map((header, index) => (
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
                  Select Fifth A Header:
                </label>
                <select
                  value={selectedAheader5}
                  onChange={(e) => setSelectedAheader5(e.target.value)}
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
                  {aheadersoptions.map((header, index) => (
                    <option key={index} value={header}>
                      {header}
                    </option>
                  ))}


                </select>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>

              <button
                onClick={handleMovementSelects}
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
                Generate Movment Graph
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
                Download Graph as Image
              </button>
            </div>
            <div id="chartContainer" style={{ marginTop: "2rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

                {/* Second Chart */}
                <div>
                  <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                    Movements Graph
                  </h3>

                  <LineChart
                    width={800 * xScale}
                    height={500}
                    style={{ maxHeight: "800px" }}
                    data={gdata}  
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="time"
                      type="category"
                      scale="point"
                    />
                    <YAxis
                      domain={[-0.5 / yScale, 0.5 / yScale]}
                      ticks={generateTicks(-0.5 / yScale, 0.5 / yScale)}
                    />
                    <Tooltip />
                    <Legend />

                    {/* Lines for each selected header */}
                    <Line
                      type="monotone"
                      dataKey="gvalue1"
                      stroke="#8884d8"
                      name={selectedAheader1}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gvalue2"
                      stroke="#82ca9d"
                      name={selectedAheader2}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gvalue3"
                      stroke="#ff7300"
                      name={selectedAheader3}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gvalue4"
                      stroke="#00bcd4"
                      name={selectedAheader4}
                      activeDot={{ r: 8 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="gvalue5"
                      stroke="#f44336"
                      name={selectedAheader5}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </MainContentWrapper>
    </>
  );
}

export default NewTrackGraphs;