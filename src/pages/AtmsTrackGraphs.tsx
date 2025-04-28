import React, { useState, useEffect, useRef } from "react";
import HeaNavLogo from "../components/HeaNavLogo";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import TrackMerger from "../components/MergeATMSTracks";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ReferenceLine,
} from "recharts";
import html2canvas from "html2canvas";
import { Scatter } from "recharts";


const AtmsTrackGraphs: React.FC = () => {
    const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
    const [processedData, setProcessedData] = useState<string[][]>([]);
    const [selectedRowTime1, setSelectedRowTime1] = useState<string>("placeholder");
    const [timeColumn, setTimeColumn] = useState<string[]>([]);
    const [showGraph, setShowGraph] = useState(false);
    const [headers, setHeaders] = useState<string[]>([]);
    const [xScale, setXScale] = useState<number>(1);
    const [yScale, setYScale] = useState<number>(1);
    const [selectedTrkColOption, setSelectedTrkColOption] = useState<string>("placeholder");
    const [combinedGraphData, setCombinedGraphData] = useState<
        Array<{
            x: number;
            amtsValue: number | null;
            prismA: number | null;
            prismB: number | null;
            time: string;
        }>
    >([]);
    const [xDomain, setXDomain] = useState<[number, number]>([-50, 50]);

    const amsts_track2_prism_size = 16;
    const amts_track2_start_distance = -10;
    const amts_track3_prism_size = 6;
    const amts_track3_start_distance = 10;
    const amts_offset = 25;

    const selectedTrkColOptions = [
        "Easting",
        "Northing",
        "Height"
    ];


    const processSaveRef = useRef<HTMLButtonElement>(null);
    const handleMergeClick = () => {
        processSaveRef.current?.click(); // simulate click
    };

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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];

        if (jsonData.length === 0) return;

        const headers = jsonData[0];
        const result: (string | number)[][] = [];
        const timeData: string[] = [];
        const atmsStartIndex = headers.findIndex(h =>
            typeof h === 'string' && h.includes('LBN-AMTS')
        );

        for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            const newRow: (string | number)[] = [row[0]];
            timeData.push(row[0]?.toString() || "");


            for (let j = 1; j < (atmsStartIndex > 0 ? atmsStartIndex : headers.length); j += 2) {
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

            if (atmsStartIndex > 0) {
                newRow.push(...row.slice(atmsStartIndex));
            }

            result.push(newRow);
        }

        const newHeader: (string | number)[] = [headers[0]]; // timestamp

        for (let j = 1; j < (atmsStartIndex > 0 ? atmsStartIndex : headers.length); j += 2) {
            const h1 = headers[j] ?? `Col${j}`;
            const h2 = headers[j + 1] ?? `Col${j + 1}`;
            let label = "Difference";

            if (typeof h1 === "string" && typeof h2 === "string") {
                if (h1.toLowerCase().includes("easting") || h2.toLowerCase().includes("easting")) {
                    label = `${h1.split(' - ')[0]},${h2.split(' - ')[0]} - Easting Difference`;
                } else if (h1.toLowerCase().includes("northing") || h2.toLowerCase().includes("northing")) {
                    label = `${h1.split(' - ')[0]},${h2.split(' - ')[0]} - Northing Difference`;
                } else if (h1.toLowerCase().includes("height") || h2.toLowerCase().includes("height")) {
                    label = `${h1.split(' - ')[0]},${h2.split(' - ')[0]} - Height Difference`;
                }
            }
            newHeader.push(h1, h2, label);
        }

        if (atmsStartIndex > 0) {
            newHeader.push(...headers.slice(atmsStartIndex));
        }

        result.unshift(newHeader);

        const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(result);
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
    useEffect(() => {
        const storedHeaders = localStorage.getItem("processedHeaders");
        const storedData = localStorage.getItem("processedData");

        if (storedHeaders && storedData) {
            setHeaders(JSON.parse(storedHeaders));
            setProcessedData(JSON.parse(storedData));
        }
    }, []);

    const handleDownload = () => {
        if (processedBlob) {
            saveAs(processedBlob, "difference_output-and-amts.xlsx");
        }
    };
    // filter the time values only get the time that the header which starts with "LBN-AMTS1-" has the value
    useEffect(() => {
        if (processedData.length > 1) {
            console.log('Full processedData:', processedData);
            const headers = processedData[0] || [];
            const amts1Columns = headers
                .map((header, index) => {
                    if (typeof header === 'string') {
                        const lowerHeader = header.toLowerCase();
                        if (lowerHeader.includes('amts1') ||
                            lowerHeader.includes('amts-1') ||
                            lowerHeader.includes('atms1')) {
                            console.log(`Found ATMS1 column: ${header} at index ${index}`);
                            return index;
                        }
                    }
                    return -1;
                })
                .filter(index => index !== -1);

            console.log('Final ATMS1 column indices:', amts1Columns);

            if (amts1Columns.length === 0) {
                console.warn('No ATMS1 columns found! Available headers:', headers);
                setTimeColumn([]);
                return;
            }

            const timeValues = processedData
                .slice(1)
                .filter(row =>
                    amts1Columns.some(colIndex => {
                        const val = row[colIndex];
                        const isValid = val !== null &&
                            val !== undefined &&
                            val !== '' &&
                            !isNaN(Number(val));
                        if (!isValid) {

                        }
                        return isValid;
                    })
                )
                .map(row => {
                    const timeVal = row[0];
                    return timeVal?.toString().trim() || '';
                })
                .filter(Boolean);

            setTimeColumn(timeValues);
        } else {
            console.warn('Not enough processed data');
            setTimeColumn([]);
        }
    }, [processedData]);

    const handleColumnSelect = () => {
        if (!selectedRowTime1 || !selectedTrkColOption) {
          return;
        }
      
        const timeIndex = headers.indexOf("Time");
        const selectedRow = processedData.find(row => row[timeIndex] === selectedRowTime1);
        if (!selectedRow) {
          return;
        }
      
        const isTrack3 = headers.some(h => h.includes('LBN-TP-TK3'));
        const prismSize = isTrack3 ? amts_track3_prism_size : amsts_track2_prism_size;
        const startDistance = isTrack3 ? amts_track3_start_distance : amts_track2_start_distance;
      
        const amtsColPrefix = `LBN-AMTS-1 - ${selectedTrkColOption}`;
        const amtsColIndex = headers.indexOf(amtsColPrefix);
        const amtsValue = selectedRow[amtsColIndex];
      
        const chartData = [];
      
        // Add prism data points
        for (let i = 1; i <= prismSize; i++) {
          const prismNumber = i.toString().padStart(2, '0');
          const xPos = startDistance + (i - 1) * amts_offset;
      
          const prismACol = `LBN-TP-TK${isTrack3 ? '3' : '2'}-${prismNumber}A - ${selectedTrkColOption}`;
          const prismAIndex = headers.indexOf(prismACol);
          const prismAValue = prismAIndex !== -1 ? Number(selectedRow[prismAIndex]) : null;
          
          const prismBCol = `LBN-TP-TK${isTrack3 ? '3' : '2'}-${prismNumber}B - ${selectedTrkColOption}`;
          const prismBIndex = headers.indexOf(prismBCol);
          const prismBValue = prismBIndex !== -1 ? Number(selectedRow[prismBIndex]) : null;
      
          chartData.push({
            x: xPos,
            amtsValue: null,
            prismA: prismAValue,
            prismB: prismBValue,
            time: selectedRowTime1
          });
        }
      
        // Force x-axis to start at -50
        const xValues = chartData.map(item => item.x);
        const minX = -50; // Hardcoded minimum
        const maxX = Math.max(...xValues, 50); // Ensure we show enough right side
      
        setCombinedGraphData([
          // Add AMTS reference point at x=0
          {
            x: 0,
            amtsValue: Number(amtsValue),
            prismA: null,
            prismB: null,
            time: selectedRowTime1
          },
          ...chartData.filter(item => item.prismA !== null || item.prismB !== null)
        ]);
      
        // Set fixed domain
        setXDomain([minX, maxX]);
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
                                Select Time for AMTS:
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
                                    Select a timestamp
                                </option>
                                {timeColumn.map((header, index) => (
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
                                <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                                    AMTS-1 GRAPH

                                </h3>
                                <LineChart
  width={800 * xScale}
  height={500}
  style={{ maxHeight: "800px" }}
  data={combinedGraphData}
  margin={{ left: 50, right: 50 }} // Add margin for labels
>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis
    dataKey="x"
    domain={xDomain}
    label={{ value: 'Distance', position: 'insideBottomRight', offset: -10 }}
    type="number"
    tickCount={10} // Control number of ticks
  />
  <YAxis
    domain={[-0.5 / yScale, 0.5 / yScale]}
    ticks={generateTicks(-0.5 / yScale, 0.5 / yScale)}
    label={{ 
      value: selectedTrkColOption, 
      angle: -90, 
      position: 'insideLeft',
      style: { textAnchor: 'middle' }
    }}
  />
  <Tooltip />
  <Legend />

  {/* Vertical Reference Line */}
  <ReferenceLine
    x={0}
    stroke="red"
    strokeWidth={2}
    label={{
      value: `AMTS-1 (${combinedGraphData[0]?.amtsValue})`,
      fill: 'red',
      fontSize: 12,
      offset: 10
    }}
  />


  <Line
    type="monotone" 
    dataKey="prismA"
    stroke="#8884d8"
    strokeWidth={2}
    dot={{ r: 5, strokeWidth: 2 }}
    activeDot={{ r: 8 }}
    name="Prism A"
    connectNulls={true}
  />
  <Line
    type="monotone"
    dataKey="prismB"
    stroke="#82ca9d"
    strokeWidth={2}
    dot={{ r: 5, strokeWidth: 2 }}
    activeDot={{ r: 8 }}
    name="Prism B"
    connectNulls={true}
  />

  <Scatter
    data={combinedGraphData.filter(d => d.x === 0)}
    dataKey="amtsValue"
    fill="red"
    shape={<circle r={6} />}
    name="AMTS Reference"
  />
</LineChart>
                            </div>
                        </div>
                    </div>
                )}
            </div>


        </>
    );
}

export default AtmsTrackGraphs;