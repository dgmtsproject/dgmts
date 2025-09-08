import React, { useState, useEffect, useRef } from "react";
import HeaNavLogo from "../components/HeaNavLogo";
import BackButton from '../components/Back';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import TrackMerger from "../components/MergeTracks";
import html2canvas from "html2canvas"
import Plot from "react-plotly.js";
import MainContentWrapper from "../components/MainContentWrapper";
import PrismsMultiSelect from "../components/PrismMultiSelect";

interface MovementData {
  prism: string;
  values: string[];
  times: string[];
  fullColumnName: string;
}
const TrackGraphs: React.FC = () => {

  const processSaveRef = useRef<HTMLButtonElement>(null);
  const handleMergeClick = () => {
    processSaveRef.current?.click();
  };

  const [selectedRowTime1, setSelectedRowTime1] = useState<string>("placeholder");
  const [selectedRowTime2, setSelectedRowTime2] = useState<string>("placeholder");
  const [selectedRowTime3, setSelectedRowTime3] = useState<string>("placeholder");

  const [selectedTrack, setSelectedTrack] = useState<string>("placeholder");
  const [selectedTrkColOption, setSelectedTrkColOption] = useState<string>("placeholder");
  // const [tracksizeoptions, setTrackSizeOptions] = useState<string>("placeholder");

  const [movementSelectedTrack, setmovementSelectedTrack] = useState<string>("placeholder");
  const [movementSelectedTrkColOption, setmovementSelectedTrkColOption] = useState<string>("placeholder");
  // const [movementTrackSizeoptions, setmovementTrackSizeOptions] = useState<string>("placeholder");
  const [movementSelectedPrisms, setMovementSelectedPrisms] = useState<string[]>([]);
  const [selectedPrisms, setSelectedPrisms] = useState<string[]>([]);
  const [movementData, setMovementData] = useState<MovementData[]>([]);

  const [combinedData, setCombinedData] = useState<
    { header: string; value1: number; value2: number; value3: number }[]
  >([]);

  const [xScale, setXScale] = useState<number>(1.0);
  const [yScale, setYScale] = useState<number>(1.0);
  const [primsxScale, setprismxScale] = useState<number>(1.0);
  const [prismyScale, setprismYScale] = useState<number>(1.0);
  const [headers, setHeaders] = useState<string[]>([]);

  const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
  const [drillStartTimes, setDrillStartTimes] = useState<string[]>([]);
  const [drillEndTimes, setDrillEndTimes] = useState<string[]>([]);
  const [trackTrainTimes, setTrackTrainTimes] = useState<Record<string, string[]>>({});
  const [showGraph, setShowGraph] = useState(false);
  const [timeColumn, setTimeColumn] = useState<string[]>([]);
  const [processedData, setProcessedData] = useState<string[][]>([]);
  const [yDomain, setYDomain] = useState([-0.5, 0.5]);

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

  // const getOptimizedTicks = (timeData: string | any[]) => {
  //   if (!timeData || timeData.length === 0) return [];

  //   const tickCount = Math.min(6, timeData.length);
  //   const step = Math.max(1, Math.floor(timeData.length / (tickCount - 1)));

  //   const ticks = [];
  //   ticks.push(timeData[0]);

  //   for (let i = 1; i < tickCount - 1; i++) {
  //     const index = Math.min(i * step, timeData.length - 1);
  //     ticks.push(timeData[index]);
  //   }
  //   if (timeData.length > 1 && timeData[timeData.length - 1] !== timeData[0]) {
  //     ticks.push(timeData[timeData.length - 1]);
  //   }

  //   return ticks;
  // };

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

  const handleTimeSelects = () => {
    if (!processedData.length || !headers.length) return;

    const track = selectedTrack; // like "LBN-TP-TK2-A"
    const columnType = selectedTrkColOption; // like "Easting"

    if (!track || !columnType || selectedPrisms.length === 0) {
      console.error("Missing track/column/prism options.");
      return;
    }

    const trackBase = track.slice(0, track.lastIndexOf("-")); // "LBN-TP-TK2"
    const trackSuffix = track.slice(-1); // "A"

    const isDifferenceType = columnType.includes("Difference");

    // Debug: Log the expected patterns
    const expectedPrismPatterns = selectedPrisms.map((prismNumber) => {
      const paddedPrism = prismNumber.padStart(2, '0'); // Convert "1" to "01"
      if (isDifferenceType) {
        return `${trackBase}-${paddedPrism}A,${trackBase}-${paddedPrism}B - ${columnType}`;
      } else {
        return `${trackBase}-${paddedPrism}${trackSuffix} - ${columnType}`;
      }
    });

    console.log("Expected patterns to match:", expectedPrismPatterns);

    // Get matching headers with their indices
    const matchingIndexes = headers
      .map((h, i) => ({ header: h, index: i }))
      .filter(({ header }) => {
        // More flexible matching that handles different header formats
        const prismPattern = isDifferenceType
          ? new RegExp(`${trackBase}-\\d+[AB],${trackBase}-\\d+[AB] - ${columnType}`)
          : new RegExp(`${trackBase}-\\d+${trackSuffix} - ${columnType}`);

        return prismPattern.test(header) &&
          selectedPrisms.some(prism => {
            const paddedPrism = prism.padStart(2, '0');
            return header.includes(`${trackBase}-${paddedPrism}${trackSuffix}`);
          });
      });

    console.log("Matching headers found:", matchingIndexes.map(x => x.header));

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
      value1: data1[idx]?.value !== undefined ? data1[idx].value : 0,
      value2: data2[idx]?.value !== undefined ? data2[idx].value : 0,
      value3: data3[idx]?.value !== undefined ? data3[idx].value : 0,
    }));

    combinedData = combinedData.filter(item => {
      return !(item.value1 === 0 && item.value2 === 0 && item.value3 === 0);
    });

    setCombinedData(combinedData);
    console.log("Final combined data:", combinedData);
  };

  // const movementColors = [
  //   "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#d0ed57", "#a4de6c", "#8dd1e1",
  // ];

  const handleMovementSelects = () => {
    if (!processedData.length || !headers.length) return;

    const track = movementSelectedTrack;
    const columnType = movementSelectedTrkColOption;

    if (!track || !columnType || movementSelectedPrisms.length === 0) {
      console.error("Missing track/column/prism options.");
      return;
    }

    const trackBase = track.slice(0, track.lastIndexOf("-"));
    const trackSuffix = track.slice(-1);

    // Get all unique time points
    const allTimes = Array.from(new Set(
      processedData.slice(1).map(row => row[0]?.toString().trim()).filter(Boolean)
    )).sort();

    const newMovementData: MovementData[] = [];

    movementSelectedPrisms.forEach(prismNum => {
      const prism = prismNum.padStart(2, '0') + trackSuffix;
      const searchPattern = columnType.includes("Difference")
        ? `${trackBase}-${prismNum.padStart(2, '0')}A,${trackBase}-${prismNum.padStart(2, '0')}B - ${columnType}`
        : `${trackBase}-${prismNum.padStart(2, '0')}${trackSuffix} - ${columnType}`;

      const columnIndex = headers.findIndex(h => h === searchPattern);
      if (columnIndex === -1) return;

      const fullColumnName = searchPattern;

      const timeValueMap = new Map<string, number>();
      for (let i = 1; i < processedData.length; i++) {
        const time = processedData[i][0]?.toString().trim();
        const value = processedData[i][columnIndex];
        if (time && value !== undefined && value !== "" && !isNaN(Number(value))) {
          timeValueMap.set(time, Number(value));
        }
      }

      newMovementData.push({
        prism,
        fullColumnName,
        values: allTimes.map(time => timeValueMap.get(time)?.toString() ?? "No value"),
        times: [...allTimes]
      });
    });

    // Sort by prism number
    newMovementData.sort((a, b) => {
      const aNum = parseInt(a.prism);
      const bNum = parseInt(b.prism);
      return aNum - bNum;
    });

    setMovementData(newMovementData);
    console.log("Movement Data:", newMovementData);
  };



  useEffect(() => {
    if (processedData.length > 1) {
      const timeValues = processedData.slice(1).map(row => row[0]?.toString().trim());
      setTimeColumn(timeValues as string[]);
    }
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
  // const generateTicks = (min: number, max: number) => {
  //   if (typeof min !== 'number' || typeof max !== 'number' || isNaN(min) || isNaN(max)) {
  //     return [];
  //   }

  //   const range = max - min;
  //   const approxSteps = 10;
  //   const step = range / approxSteps;

  //   const ticks = [];
  //   for (let i = min; i <= max + 1e-9; i += step) {
  //     ticks.push(Number(i.toFixed(2)));
  //   }
  //   return ticks;
  // };
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

  useEffect(() => {
    if (processedData && processedData.length > 0) {
      let allValues: number[] = [];

      processedData.forEach(row => {
        const values = row.slice(1); // Skip first column (time)
        values.forEach(val => {
          const num = parseFloat(val);
          if (!isNaN(num)) {
            allValues.push(num);
          }
        });
      });

      if (allValues.length > 0) {
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        setYDomain([min, max]);
      }
    }

  }, [processedData]);
  console.log(yDomain);


  const selectedTrackOptions = generateTrackOptions(headers);

  // selectedtrackcol options Easting, Northing, Height,Easting Difference, Northing Difference, Height Difference
  const selectedTrkColOptions = [
    "Easting",
    "Northing",
    "Height",
    "Easting Difference",
    "Northing Difference",
    "Height Difference",
  ];

  // map numbers from 1 to 33 to strings "1" to "33"
  const trackSizeOptions = Array.from({ length: 33 }, (_, i) => (i + 1).toString());

  const extendedColors = [
    '#ff7300', '#82ca9d', '#8884d8',
    '#ffc658', '#a4de6c', '#8dd1e1',
    '#ff8042', '#d0ed57', '#ffbb28',
    '#00c49f', '#ff6b6b', '#a28dff'
  ];
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
            margin: "2px",
            padding: "2px",
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
                  <PrismsMultiSelect
                    options={trackSizeOptions}
                    selected={selectedPrisms}
                    onChange={setSelectedPrisms}
                  />


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
                    {combinedData.length > 0 ? (
                      <div style={{ width: '100%', overflowX: 'auto' }}>
                        <Plot
                          data={[
                            {
                              x: combinedData.map(item => item.header),
                              y: combinedData.map(item => item.value1),
                              type: 'scatter',
                              mode: 'lines+markers',
                              name: selectedRowTime1,
                              line: { color: '#8884d8', shape: 'spline' },
                              marker: { size: 6, color: '#8884d8' },
                              hovertemplate: `<b>${selectedRowTime1}</b><br>Header: %{x}<br>Value: %{y:.6f}<extra></extra>`,
                              connectgaps: true
                            },
                            {
                              x: combinedData.map(item => item.header),
                              y: combinedData.map(item => item.value2),
                              type: 'scatter',
                              mode: 'lines+markers',
                              name: selectedRowTime2,
                              line: { color: '#82ca9d', shape: 'spline' },
                              marker: { size: 6, color: '#82ca9d' },
                              hovertemplate: `<b>${selectedRowTime2}</b><br>Header: %{x}<br>Value: %{y:.6f}<extra></extra>`,
                              connectgaps: true
                            },
                            {
                              x: combinedData.map(item => item.header),
                              y: combinedData.map(item => item.value3),
                              type: 'scatter',
                              mode: 'lines+markers',
                              name: selectedRowTime3,
                              line: { color: '#ff7300', shape: 'spline' },
                              marker: { size: 6, color: '#ff7300' },
                              hovertemplate: `<b>${selectedRowTime3}</b><br>Header: %{x}<br>Value: %{y:.6f}<extra></extra>`,
                              connectgaps: true
                            }
                          ]}
                          layout={{
                            autosize: true, // Enable automatic sizing
                            height: 700,
                            margin: {
                              l: 60,
                              r: 30, // Reduced right margin
                              b: 150,
                              t: 30,
                              pad: 4,
                            },
                            xaxis: {
                              title: {
                                text: 'Prisms',
                                // distance of title from x-axis to down
                                standoff: 10,

                              },
                              type: 'category',
                              tickmode: 'auto',
                              nticks: undefined,
                              tickangle: -90,
                              gridcolor: '#f0f0f0',
                              automargin: true,
                              showgrid: true,
                              autorange: true,
                              tickformat: '',
                              ticklabelstep: 1,
                              tickfont: {
                                size: 10
                              }
                            },
                            yaxis: {
                              title: { text: 'Movement(Inches)' },
                              autorange: true, // Let Plotly determine the best range
                              tickmode: 'auto', // Automatic tick generation
                              dtick: 'auto', // Automatic tick interval
                              gridcolor: '#f0f0f0',
                              zeroline: true,
                              zerolinecolor: '#f0f0f0',
                              fixedrange: false // Allows zooming/panning
                            },
                            legend: {
                              orientation: 'h',
                              y: -0.3,
                              x: 0.5,
                              xanchor: 'center'
                            },
                            plot_bgcolor: 'white',
                            paper_bgcolor: 'white',
                            hovermode: 'x unified',
                            shapes: [{
                              type: 'line',
                              x0: 0,
                              x1: 1,
                              xref: 'paper',
                              y0: 0,
                              y1: 0,
                              line: {
                                color: '#f0f0f0',
                                width: 2,


                              }
                            },
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
                                dash: 'solid'
                              },
                            },
                            {
                              type: 'line',
                              x0: 0,
                              x1: 1,
                              xref: 'paper',
                              y0: -0.875,
                              y1: -0.875,
                              line: { color: 'red', width: 2, dash: 'solid' },
                            },
                            // Warning lines (orange)
                            {
                              type: 'line',
                              x0: 0,
                              x1: 1,
                              xref: 'paper',
                              y0: 0.5,
                              y1: 0.5,
                              line: { color: 'orange', width: 2, dash: 'solid' },
                            },
                            {
                              type: 'line',
                              x0: 0,
                              x1: 1,
                              xref: 'paper',
                              y0: -0.5,
                              y1: -0.5,
                              line: { color: 'orange', width: 2, dash: 'solid' },
                            },
                            // Internal warning lines (yellow)
                            {
                              type: 'line',
                              x0: 0,
                              x1: 1,
                              xref: 'paper',
                              y0: 0.25,
                              y1: 0.25,
                              line: { color: 'yellow', width: 2, dash: 'solid' },
                            },
                            {
                              type: 'line',
                              x0: 0,
                              x1: 1,
                              xref: 'paper',
                              y0: -0.25,
                              y1: -0.25,
                              line: { color: 'yellow', width: 2, dash: 'solid' },
                            }
                            ],
                            annotations: [
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
                            ]
                          }}
                          config={{
                            displayModeBar: true,
                            responsive: true, // Enable responsive behavior
                            displaylogo: false,
                            scrollZoom: true,
                          }}
                          style={{
                            width: '100%', // Full width
                            height: '100%',
                            minWidth: '800px' // Minimum width to prevent squishing
                          }}
                          useResizeHandler={true}
                        />
                      </div>
                    ) : null}
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


                  <select
                    value={movementSelectedTrack}
                    onChange={(e) => setmovementSelectedTrack(e.target.value)}
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
                    value={movementSelectedTrkColOption}
                    onChange={(e) => setmovementSelectedTrkColOption(e.target.value)}
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
                  <PrismsMultiSelect
                    options={trackSizeOptions}
                    selected={movementSelectedPrisms}
                    onChange={setMovementSelectedPrisms}
                  />
                </div>
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
                  value={primsxScale}
                  onChange={(e) => setprismxScale(Number(e.target.value))}
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
                  value={prismyScale}
                  onChange={(e) => {
                    const val = Math.max(0.1, Number(e.target.value));
                    setprismYScale(val);
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

              <div id="chartContainer" style={{ marginTop: "2rem", width: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem", width: "100%" }}>
                  {/* Movements Graph */}
                  <div style={{ width: "100%" }}>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      Movements Graph
                    </h3>
                    <div style={{
                      height: "70vh",
                      minHeight: "500px",
                      width: "100%",
                      position: "relative"
                    }}>
                      {movementData.length > 0 ? (
                        <Plot
                          data={movementData.map((data, index) => ({
                            x: data.times.map(time => new Date(time)),
                            y: data.values,
                            type: 'scatter',
                            mode: 'lines+markers',
                            name: data.fullColumnName, // This will show in the legend
                            line: {
                              color: extendedColors[index % extendedColors.length],
                              shape: 'spline'
                            },
                            marker: {
                              size: 6,
                              color: extendedColors[index % extendedColors.length]
                            },
                            hovertemplate: `
                              <b>${data.fullColumnName}</b><br>
                              Time: %{x|%m/%d/%Y %H:%M}<br>
                              Value: %{y:.6f}<extra></extra>
                             `,
                            connectgaps: true
                          }))}
                          layout={{
                            autosize: true,
                            margin: {
                              l: 60,
                              r: 200,
                              b: 120,
                              t: 30,
                              pad: 4,
                            },
                            showlegend: true,
                            legend: {
                              x: 1.05, // Position legend outside the plot area
                              xanchor: 'left',
                              y: 0.5,
                              yanchor: 'middle',
                              font: {
                                size: 10,
                              },
                              bgcolor: 'rgba(255,255,255,0.8)',
                              bordercolor: '#CCC',
                              borderwidth: 1
                            },
                            xaxis: {
                              title: { text: 'Time' },
                              type: 'date', // Changed from 'category' to 'date'
                              tickformat: '%m/%d %H:%M', // Added date format
                              tickangle: 0,
                              gridcolor: '#f0f0f0',
                              gridwidth: 1,
                              showgrid: true,
                              automargin: true,
                              // Optional: Set range based on your data
                              range: movementData[0]?.times?.length ? [
                                new Date(movementData[0].times[0]).getTime(),
                                new Date(movementData[0].times[movementData[0].times.length - 1]).getTime()
                              ] : undefined
                            },
                            yaxis: {
                              title: {
                                text: 'Movement (inches)',
                                standoff: 30,
                                font: {
                                  size: 12,
                                  color: '#333'
                                }
                              },
                              tickmode: 'linear',
                              dtick: 0.25,
                              gridcolor: '#f0f0f0',
                              zeroline: true,
                              zerolinecolor: '#f0f0f0',
                              autorange: true,
                              automargin: true
                            },
                            plot_bgcolor: 'white',
                            paper_bgcolor: 'white',
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
                            hovermode: 'closest',
                          }}
                          config={{
                            displayModeBar: true,
                            responsive: true,
                            displaylogo: false,
                            scrollZoom: true
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            position: 'absolute'
                          }}
                          useResizeHandler={true}
                        />
                      ) : (
                        <div style={{
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px dashed #ccc"
                        }}>
                          Select track, easting/northing/etc and prism number
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* // empty div for spacing and margin */}
              <div style={{ height: "200px" }}></div>
            </div>
          )}

        </div>
      </MainContentWrapper>

    </>
  );
}

export default TrackGraphs;