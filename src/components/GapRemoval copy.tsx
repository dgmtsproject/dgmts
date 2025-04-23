// import React, { useState, useEffect } from "react";
// import * as XLSX from "xlsx";
// import { saveAs } from "file-saver";
// import HeaNavLogo from "./HeaNavLogo";
// import TrackMerger from "./MergeTracks";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   Legend,
// } from "recharts";
// import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

// const GapRemoval: React.FC = () => {
//   // const [gColumnData, setGColumnData] = useState<
//   //   Record<string, { index: number; value: number }[]>
//   // >({});
//   const [selectedColumn1, setSelectedColumn1] = useState<string>("");
//   const [selectedColumn2, setSelectedColumn2] = useState<string>("");
//   const [selectedColumn3, setSelectedColumn3] = useState<string>("");
//   const [processedBlob, setProcessedBlob] = useState<Blob | null>(null);
//   const [headers, setHeaders] = useState<string[]>([]);
//   const [showGraph, setShowGraph] = useState(false);
//   const [graphData1, setGraphData1] = useState<
//     { index: number; value: number }[]
//   >([]);
//   graphData1.sort((a, b) => a.index - b.index);

//   const [graphData2, setGraphData2] = useState<
//     { index: number; value: number }[]
//   >([]);
//   const [graphData3, setGraphData3] = useState<
//     { index: number; value: number }[]
//   >([]);

//   const [processedData, setProcessedData] = useState<string[][]>([]);

//   useEffect(() => {
//     // Load headers and data from localStorage
//     const storedHeaders = localStorage.getItem("processedHeaders");
//     const storedData = localStorage.getItem("processedData");

//     if (storedHeaders && storedData) {
//       setHeaders(JSON.parse(storedHeaders));
//       setProcessedData(JSON.parse(storedData));
//     }
//   }, []);

//   const handleProcess = () => {
//     const fileData = localStorage.getItem("mergedExcelFile");
//     if (!fileData) return;

//     const byteCharacters = atob(fileData);
//     const byteNumbers = new Array(byteCharacters.length)
//       .fill(null)
//       .map((_, i) => byteCharacters.charCodeAt(i));
//     const byteArray = new Uint8Array(byteNumbers);

//     const workbook = XLSX.read(byteArray, { type: "array" });
//     const worksheet = workbook.Sheets[workbook.SheetNames[0]];
//     const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as (
//       | string
//     )[][];

//     if (jsonData.length === 0) return;

//     const headers = jsonData[0];
//     const result: (string | number)[][] = [];
//     const graphColumnData: Record<string, { index: number; value: number }[]> =
//       {};

//     for (let i = 1; i < jsonData.length; i++) {
//       const row = jsonData[i];
//       const newRow: (string | number)[] = [row[0]];

//       for (let j = 1; j < headers.length; j += 2) {
//         const val1 = row[j];
//         const val2 = row[j + 1];
//         newRow.push(val1 ?? "", val2 ?? "");

//         if (
//           val1 !== undefined &&
//           val2 !== undefined &&
//           !isNaN(Number(val1)) &&
//           !isNaN(Number(val2))
//         ) {
//           const diff = Number(val1) - Number(val2);
//           newRow.push(diff);

//           // Store for graph data
//           if (
//             typeof headers[j] === "string" &&
//             typeof headers[j + 1] === "string"
//           ) {
//             const label = headers[j].toLowerCase().includes("height")
//               ? "Height Difference"
//               : headers[j].toLowerCase().includes("northing")
//               ? "Northing Difference"
//               : headers[j].toLowerCase().includes("easting")
//               ? "Easting Difference"
//               : "Other Difference";

//             if (!(label in graphColumnData)) {
//               graphColumnData[label] = [];
//             }

//             graphColumnData[label].push({ index: i, value: diff });
//           }
//         } else {
//           newRow.push("");
//         }
//       }

//       result.push(newRow);
//     }

//     const newHeader: (string | number)[] = [headers[0]];
//     for (let j = 1; j < headers.length; j += 2) {
//       const h1 = headers[j] ?? `Col${j}`;
//       const h2 = headers[j + 1] ?? `Col${j + 1}`;

//       let label = "Difference";
//       if (typeof h1 === "string" && typeof h2 === "string") {
//         if (
//           h1.toLowerCase().includes("easting") ||
//           h2.toLowerCase().includes("easting")
//         ) {
//           label = "Easting Difference";
//         } else if (
//           h1.toLowerCase().includes("northing") ||
//           h2.toLowerCase().includes("northing")
//         ) {
//           label = "Northing Difference";
//         } else if (
//           h1.toLowerCase().includes("height") ||
//           h2.toLowerCase().includes("height")
//         ) {
//           label = "Height Difference";
//         }
//       }

//       newHeader.push(h1, h2, label);
//     }

//     result.unshift(newHeader);

//     const ws: XLSX.WorkSheet = XLSX.utils.aoa_to_sheet(result);

//     for (let c = 3; c < newHeader.length; c += 3) {
//       for (let r = 0; r < result.length; r++) {
//         const cellAddress = XLSX.utils.encode_cell({ r, c });
//         const cell = ws[cellAddress];
//         if (cell) {
//           if (!cell.s) cell.s = {};
//         }
//       }
//     }

//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Processed");

//     const wbout = XLSX.write(wb, {
//       bookType: "xlsx",
//       type: "array",
//       cellStyles: true,
//     });

//     const blob = new Blob([wbout], { type: "application/octet-stream" });
//     setProcessedBlob(blob);

//     setShowGraph(true);

//     // Save headers and processed data to localStorage
//     localStorage.setItem("processedHeaders", JSON.stringify(newHeader));
//     localStorage.setItem("processedData", JSON.stringify(result));
//     setHeaders(newHeader as string[]);
//     setProcessedData(result as string[][]);
//   };

//   const handleDownload = () => {
//     if (processedBlob) {
//       saveAs(processedBlob, "difference_output.xlsx");
//     }
//   };



//   const handleColumnSelect = () => {
//     if (!selectedColumn1 || !selectedColumn2 || !selectedColumn3) return;

//     const selectedData1: string[] = [];
//     const selectedData2: string[] = [];
//     const selectedData3: string[] = [];

//     processedData.forEach((row: string[]) => {
//       const col1Index = headers.indexOf(selectedColumn1);
//       const col2Index = headers.indexOf(selectedColumn2);
//       const col3Index = headers.indexOf(selectedColumn3);

//       if (col1Index !== -1) selectedData1.push(row[col1Index]);
//       if (col2Index !== -1) selectedData2.push(row[col2Index]);
//       if (col3Index !== -1) selectedData3.push(row[col3Index]);
//     });

//     const mapToGraphValues = (data: string[]) =>
//       data.map((value, index) => ({
//         index,
//         value: isNaN(Number(value)) ? 0 : Number(value),
//       }));

//     setGraphData1(mapToGraphValues(selectedData1));
//     setGraphData2(mapToGraphValues(selectedData2));
//     setGraphData3(mapToGraphValues(selectedData3));
//   };

//   return (
//     <>
//       <HeaNavLogo />
//       <TrackMerger/>

//       <div className="p-4 flex flex-col gap-4">
//         <button
//           onClick={handleProcess}
//           className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
//         >
//           Process & Show Graph
//         </button>

//         {processedBlob && (
//           <button
//             onClick={handleDownload}
//             className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
//           >
//             Download Final File
//           </button>
//         )}

//         {showGraph && (
//           <div className="p-4">
//             <label className="mr-2 font-medium">Select First Header:</label>
//             <select
//               value={selectedColumn1}
//               onChange={(e) => setSelectedColumn1(e.target.value)}
//               className="border rounded p-2"
//             >
//               {headers.map((header, index) => (
//                 <option key={index} value={header}>
//                   {header}
//                 </option>
//               ))}
//             </select>

//             <label className="mr-2 font-medium mt-4">
//               Select Second Header:
//             </label>
//             <select
//               value={selectedColumn2}
//               onChange={(e) => setSelectedColumn2(e.target.value)}
//               className="border rounded p-2"
//             >
//               {headers.map((header, index) => (
//                 <option key={index} value={header}>
//                   {header}
//                 </option>
//               ))}
//             </select>

//             <label className="mr-2 font-medium mt-4">
//               Select Third Header:
//             </label>
//             <select
//               value={selectedColumn3}
//               onChange={(e) => setSelectedColumn3(e.target.value)}
//               className="border rounded p-2"
//             >
//               {headers.map((header, index) => (
//                 <option key={index} value={header}>
//                   {header}
//                 </option>
//               ))}
//             </select>

//             <button
//               onClick={handleColumnSelect}
//               className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
//             >
//               Generate Graphs
//             </button>

//             <div id="chartContainer" className="mt-4">
//               <TransformWrapper>
//                 <TransformComponent>
//                   <LineChart width={800} height={300} data={graphData1}>
//                     <CartesianGrid strokeDasharray="3 " />
//                     <XAxis />
//                     <YAxis domain={[-0.2, 0.2]} />
//                     <Tooltip />
//                     <Legend />
//                     <Line
//                       type="monotone"
//                       dataKey="value"
//                       stroke="#8884d8"
//                       activeDot={{ r: 8 }}
//                     />
//                   </LineChart>
//                   <LineChart width={500} height={300} data={graphData2}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="index" />
//                     <YAxis domain={[-0.2, 0.2]} />
//                     <Tooltip />
//                     <Legend />
//                     <Line
//                       type="monotone"
//                       dataKey="value"
//                       stroke="#82ca9d"
//                       activeDot={{ r: 8 }}
//                     />
//                   </LineChart>
//                   <LineChart width={500} height={300} data={graphData3}>
//                     <CartesianGrid strokeDasharray="3 3" />
//                     <XAxis dataKey="index" />
//                     <YAxis />
//                     <Tooltip />
//                     <Legend />
//                     <Line
//                       type="monotone"
//                       dataKey="value"
//                       stroke="#ff7300"
//                       activeDot={{ r: 8 }}
//                     />
//                   </LineChart>
//                 </TransformComponent>
//               </TransformWrapper>
//             </div>
//           </div>
//         )}
//       </div>
//     </>
//   );
// };

// export default GapRemoval;
