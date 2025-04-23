// import React from "react";

// const moin = () => {
//     const [data1, setData1] = useState<ExcelRow[]>([]);
//       const [headers1, setHeaders1] = useState<string[]>([]);
//       const [data2, setData2] = useState<ExcelRow[]>([]);
//       const [headers2, setHeaders2] = useState<string[]>([]);
//       const [diffDataA, setDiffDataA] = useState<ExcelRow[]>([]);
//       const [diffDataB, setDiffDataB] = useState<ExcelRow[]>([]);
//       const [finalData, setFinalData] = useState<ExcelRow[]>([]);
//       const [loading, setLoading] = useState<LoadingState>({ file1: false, file2: false, diffFileA: false, diffFileB: false, finalFile: false });
//       const [error, setError] = useState<ErrorState>({ file1: null, file2: null, diffFileA: null, diffFileB: null, finalFile: null });
//   const sectionStyle: React.CSSProperties = {
//     marginTop: "40px",
//     padding: "20px",
//     background: "#fff",
//     borderRadius: "10px",
//     boxShadow: "0 4px 10px rgba(0,0,0,0.3)",
//     border: "1px solid black", // Corrected this line
//   };
//   const subHeadingStyle: React.CSSProperties = {
//     fontSize: "22px",
//     margin: "20px 0",
//     fontWeight: 600,
//     color: "#2c5282",
//   };

//   const handleFileUpload =
//     (fileNumber: number) => (event: ChangeEvent<HTMLInputElement>) => {
//       const key = fileNumber === 1 ? "file1" : "file2";
//       setLoading((prev) => ({ ...prev, [key]: true }));
//       setError((prev) => ({ ...prev, [key]: null }));

//       const file = event.target.files?.[0];
//       if (!file) {
//         setLoading((prev) => ({ ...prev, [key]: false }));
//         toast.error("No file selected!", {
//           position: "top-right",
//           autoClose: 3000,
//         });
//         return;
//       }

//       const reader = new FileReader();
//       reader.onload = (e: ProgressEvent<FileReader>) => {
//         try {
//           const arrayBuffer = e.target?.result;
//           if (!arrayBuffer) throw new Error("File read error");
//           const workbook = XLSX.read(arrayBuffer, { type: "array" });
//           const sheetName = workbook.SheetNames[0];
//           const worksheet = workbook.Sheets[sheetName];
//           const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
//             defval: null,
//             blankrows: true,
//           });

//           if (!jsonData || jsonData.length === 0) {
//             throw new Error("Empty or invalid Excel file");
//           }

//           const processedData = processData(jsonData);
//           const headers = Object.keys(processedData[0]).slice(0, 4);

//           if (fileNumber === 1) {
//             setHeaders1(headers);
//             setData1(processedData);
//           } else {
//             setHeaders2(headers);
//             setData2(processedData);
//           }
//         } catch (err: unknown) {
//           setError((prev) => ({
//             ...prev,
//             [key]:
//               "Error processing Excel file: " +
//               (err instanceof Error ? err.message : "Unknown error"),
//           }));
//           toast.error("Error processing file!", {
//             position: "top-right",
//             autoClose: 3000,
//           });
//         }
//         setLoading((prev) => ({ ...prev, [key]: false }));
//       };

//       reader.onerror = () => {
//         setError((prev) => ({ ...prev, [key]: "Error reading Excel file" }));
//         setLoading((prev) => ({ ...prev, [key]: false }));
//         toast.error("Error reading file!", {
//           position: "top-right",
//           autoClose: 3000,
//         });
//       };

//       reader.readAsArrayBuffer(file);
//     };
//   return (
//     <div style={sectionStyle}>
//       <h2 style={subHeadingStyle}>Upload Raw Excel Files</h2>
//       <input
//         type="file"
//         accept=".xlsx,.xls"
//         onChange={handleFileUpload(1)}
//         style={inputStyle}
//         onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
//         onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
//       />
//       {error.file1 && (
//         <p style={{ color: "#e53e3e", margin: "10px 0" }}>{error.file1}</p>
//       )}
//       {loading.file1 && (
//         <p style={{ color: "#4a5568", margin: "10px 0" }}>Loading file 1...</p>
//       )}

//       <input
//         type="file"
//         accept=".xlsx,.xls"
//         onChange={handleFileUpload(2)}
//         style={{ ...inputStyle, marginTop: "20px" }}
//         onFocus={(e) => (e.target.style.borderColor = "#4CAF50")}
//         onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
//       />
//       {error.file2 && (
//         <p style={{ color: "#e53e3e", margin: "10px 0" }}>{error.file2}</p>
//       )}
//       {loading.file2 && (
//         <p style={{ color: "#4a5568", margin: "10px 0" }}>Loading file 2...</p>
//       )}

//       {data1.length > 0 && (
//         <div>
//           <h3 style={{ ...subHeadingStyle, fontSize: "20px" }}>
//             File 1 Preview
//           </h3>
//           <table style={tableStyles}>
//             <thead>
//               <tr>
//                 {headers1.map((header) => (
//                   <th key={header} style={thStyle}>
//                     {header}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {data1.slice(0, 10).map((row, index) => (
//                 <tr key={index} style={alternateRowStyle(index)}>
//                   {headers1.map((header) => (
//                     <td key={header} style={tdStyle}>
//                       {row[header] != null ? row[header] : "-"}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           <button
//             style={{
//               ...buttonStyle,
//               background: "linear-gradient(45deg, #1e88e5, #4dabf7)",
//             }}
//             onClick={() =>
//               downloadSingleFile(
//                 data1,
//                 "File 1 Processed",
//                 "file1_processed.xlsx"
//               )
//             }
//             onMouseOver={(e) => {
//               e.currentTarget.style.transform = "scale(1.05)";
//               e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
//             }}
//             onMouseOut={(e) => {
//               e.currentTarget.style.transform = "scale(1)";
//               e.currentTarget.style.boxShadow = "none";
//             }}
//           >
//             Download File 1 Only
//           </button>
//         </div>
//       )}

//       {data2.length > 0 && (
//         <div>
//           <h3 style={{ ...subHeadingStyle, fontSize: "20px" }}>
//             File 2 Preview
//           </h3>
//           <table style={tableStyles}>
//             <thead>
//               <tr>
//                 {headers2.map((header) => (
//                   <th key={header} style={thStyle}>
//                     {header}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {data2.slice(0, 10).map((row, index) => (
//                 <tr key={index} style={alternateRowStyle(index)}>
//                   {headers2.map((header) => (
//                     <td key={header} style={tdStyle}>
//                       {row[header] != null ? row[header] : "-"}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           <button
//             style={{
//               ...buttonStyle,
//               background: "linear-gradient(45deg, #1e88e5, #4dabf7)",
//             }}
//             onClick={() =>
//               downloadSingleFile(
//                 data2,
//                 "File 2 Processed",
//                 "file2_processed.xlsx"
//               )
//             }
//             onMouseOver={(e) => {
//               e.currentTarget.style.transform = "scale(1.05)";
//               e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
//             }}
//             onMouseOut={(e) => {
//               e.currentTarget.style.transform = "scale(1)";
//               e.currentTarget.style.boxShadow = "none";
//             }}
//           >
//             Download File 2 Only
//           </button>
//         </div>
//       )}

//       {(data1.length > 0 || data2.length > 0) && (
//         <button
//           style={buttonStyle}
//           onClick={downloadExcel}
//           onMouseOver={(e) => {
//             e.currentTarget.style.transform = "scale(1.05)";
//             e.currentTarget.style.boxShadow = "0 4px 10px rgba(0,0,0,0.2)";
//           }}
//           onMouseOut={(e) => {
//             e.currentTarget.style.transform = "scale(1)";
//             e.currentTarget.style.boxShadow = "none";
//           }}
//         >
//           Download Combined File
//         </button>
//       )}
//     </div>
//   );
// };

// export default moin;
