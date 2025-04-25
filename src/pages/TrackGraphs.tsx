// import React , {useState, useEffect, useRef }from "react";
// import HeaNavLogo from "../components/HeaNavLogo";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import TrackMerger from "../components/MergeTracks";
// import {
//     LineChart,
//     Line,
//     XAxis,
//     YAxis,
//     CartesianGrid,
//     Tooltip,
//     Legend,
//   } from "recharts";


// const TrackGraphs: React.FC = () => {

//     const processSaveRef = useRef<HTMLButtonElement>(null);
//       const handleMergeClick = () => {
//         processSaveRef.current?.click(); // simulate click
//       };

//       const [selectedRowTime1, setSelectedRowTime1] = useState<string>("placeholder");
//     const [selectedRowTime2, setSelectedRowTime2] = useState<string>("placeholder");
//     const [selectedRowTime3, setSelectedRowTime3] = useState<string>("placeholder");
//     const [headers, setHeaders] = useState<string[]>([]);
//     const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
//      const [showGraph, setShowGraph] = useState(false);
//      const [processedData, setProcessedData] = useState<string[][]>([]);
//       const [graphData1, setGraphData1] = useState<
//          { index: number; value: number; time: string }[]
//        >([]);

//          useEffect(() => {
//            const storedHeaders = localStorage.getItem("processedHeaders");
//            const storedData = localStorage.getItem("processedData");
       
//            if (storedHeaders && storedData) {
//              setHeaders(JSON.parse(storedHeaders));
//              setProcessedData(JSON.parse(storedData));
//            }
//          }, []);

//            const handleProcess = () => {
//              const fileData = localStorage.getItem("mergedExcelFile");
//              if (!fileData) return;
         
//              const byteCharacters = atob(fileData);
//              const byteNumbers = new Array(byteCharacters.length)
//                .fill(null)
//                .map((_, i) => byteCharacters.charCodeAt(i));
//              const byteArray = new Uint8Array(byteNumbers);
         
//              const workbook = XLSX.read(byteArray, { type: "array" });
//              const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//              const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (
//                | string
//              )[][];
         
//              if (jsonData.length === 0) return;
         
//              const headers = jsonData[0];
//              const result: (string | number)[][] = [];
         
//              const timeData: string[] = [];
         
//              for (let i = 1; i < jsonData.length; i++) {
//                const row = jsonData[i];
//                const newRow: (string | number)[] = [row[0]];
//                timeData.push(row[0]?.toString() || "");
         
//                for (let j = 1; j < headers.length; j += 2) {
//                  const val1 = row[j];
//                  const val2 = row[j + 1];
//                  newRow.push(val1 ?? "", val2 ?? "");
         
//                  if (
//                    val1 !== undefined &&
//                    val2 !== undefined &&
//                    !isNaN(Number(val1)) &&
//                    !isNaN(Number(val2))
//                  ) {
//                    const diff = Number(val1) - Number(val2);
//                    newRow.push(diff);
//                  } else {
//                    newRow.push("");
//                  }
//                }
//                result.push(newRow);
//              }
         
//              const newHeader: (string | number)[] = [headers[0]];
//              for (let j = 1; j < headers.length; j += 2) {
//                const h1 = headers[j] ?? `Col${j}`;
//                const h2 = headers[j + 1] ?? `Col${j + 1}`;
//                let label = "Difference";
//                if (typeof h1 === "string" && typeof h2 === "string") {
//                  if (
//                    h1.toLowerCase().includes("easting") ||
//                    h2.toLowerCase().includes("easting")
//                  ) {
//                    label = "Easting Difference";
//                  } else if (
//                    h1.toLowerCase().includes("northing") ||
//                    h2.toLowerCase().includes("northing")
//                  ) {
//                    label = "Northing Difference";
//                  } else if (
//                    h1.toLowerCase().includes("height") ||
//                    h2.toLowerCase().includes("height")
//                  ) {
//                    label = "Height Difference";
//                  }
//                }
//                newHeader.push(h1, h2, label);
//              }
         
//              result.unshift(newHeader);
//              // setTimeColumn(timeData);
         
//              const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(result);
//              for (let c = 3; c < newHeader.length; c += 3) {
//                for (let r = 0; r < result.length; r++) {
//                  const cellAddress = XLSX.utils.encode_cell({ r, c });
//                  const cell = ws[cellAddress];
//                  if (cell) {
//                    if (!cell.s) cell.s = {};
//                  }
//                }
//              }
         
//              const wb = XLSX.utils.book_new();
//              XLSX.utils.book_append_sheet(wb, ws, "Processed");
         
//              const wbout = XLSX.write(wb, {
//                bookType: "xlsx",
//                type: "array",
//                cellStyles: true,
//              });
         
//              const blob = new Blob([wbout], { type: "application/octet-stream" });
//              setProcessedBlob(blob);
//              setShowGraph(true);
         
//              localStorage.setItem("processedHeaders", JSON.stringify(newHeader));
//              localStorage.setItem("processedData", JSON.stringify(result));
//              setHeaders(newHeader as string[]);
//              setProcessedData(result as string[][]);
//            };
         
//            const handleDownload = () => {
//              if (processedBlob) {
//                saveAs(processedBlob, "difference_output.xlsx");
//              }
//            };

    
//     return (
//         <>
//             <HeaNavLogo />
//             <TrackMerger onMergeSave={handleMergeClick}  />
//             <div
//         style={{
//           // padding: '2rem',
//           display: "flex",
//           flexDirection: "column",
//           gap: "1.5rem",
//           backgroundColor: "#f4f7fa",
//           minHeight: "100vh",
//           fontFamily: "'Inter', sans-serif",
//           border: "4px solid black",
//           margin: "10px",
//           padding: "10px",
//         }}
//       >
//         <button
//           onClick={handleProcess}
//           ref={processSaveRef}
//           style={{
//             display: "none", 
//             backgroundColor: "#2563eb",
//             color: "#ffffff",
//             padding: "0.75rem 1.5rem",
//             borderRadius: "0.375rem",
//             fontWeight: "500",
//             cursor: "pointer",
//             transition: "background-color 0.2s ease, transform 0.1s ease",
//             border: "none",
//             boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
//           }}
//           onMouseOver={(e) =>
//             (e.currentTarget.style.backgroundColor = "#1d4ed8")
//           }
//           onMouseOut={(e) =>
//             (e.currentTarget.style.backgroundColor = "#2563eb")
//           }
//           onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")}
//           onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
//         >
//           Process & Show Graph
//         </button>

//         {processedBlob && (
//           <button
//             onClick={handleDownload}
//             style={{
//               backgroundColor: "#16a34a",
//               color: "#ffffff",
//               padding: "0.75rem 1.5rem",
//               borderRadius: "0.375rem",
//               fontWeight: "500",
//               cursor: "pointer",
//               transition: "background-color 0.2s ease, transform 0.1s ease",
//               border: "none",
//               boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
//             }}
//             onMouseOver={(e) =>
//               (e.currentTarget.style.backgroundColor = "#15803d")
//             }
//             onMouseOut={(e) =>
//               (e.currentTarget.style.backgroundColor = "#16a34a")
//             }
//             onMouseDown={(e) =>
//               (e.currentTarget.style.transform = "scale(0.98)")
//             }
//             onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
//           >
//             Download Final File
//           </button>
//         )}
       
                

//             </div>
//         </>
//     );
//     }

// export default TrackGraphs;