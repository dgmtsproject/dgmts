// import React, { useState } from "react";
// import * as XLSX from "xlsx";
// import HeaNavLogo from "./HeaNavLogo";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const TrackMerger: React.FC = () => {
//   const [fileA, setFileA] = useState<File | null>(null);
//   const [fileB, setFileB] = useState<File | null>(null);

//   const readExcel = (file: File): Promise<(string | number | null)[][]> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = (e: ProgressEvent<FileReader>) => {
//         const result = e.target?.result;
//         if (!result) return reject("File read error: No result");

//         const data = new Uint8Array(result as ArrayBuffer);
//         const workbook = XLSX.read(data, { type: "array", cellDates: true });
//         const firstSheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[firstSheetName];

//         const json: (string | number | null)[][] = [];
//         const range = XLSX.utils.decode_range(sheet["!ref"]!);
//         for (let row = range.s.r; row <= range.e.r; row++) {
//           const rowData: (string | number | null)[] = [];
//           for (let col = range.s.c; col <= range.e.c; col++) {
//             const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
//             const cell = sheet[cellAddress];
//             if (!cell) {
//               rowData.push(null);
//               continue;
//             }
//             const value = cell.w !== undefined ? cell.w : cell.v;
//             rowData.push(value);
//           }
//           json.push(rowData);
//         }
//         resolve(json);
//       };
//       reader.onerror = (err) => reject(err);
//       reader.readAsArrayBuffer(file);
//     });
//   };

//   const parseDateHour = (timeStr: string | number | null): string | null => {
//     if (!timeStr) return null;
//     const dateObj = new Date(timeStr as string);
//     if (isNaN(dateObj.getTime())) return null;
//     const date = dateObj.toLocaleDateString("en-GB");
//     const hour = dateObj.getHours().toString().padStart(2, '0');
//     return `${date} ${hour}:00`;
//   };

//   const groupByDateHour = (data: (string | number | null)[][]): Map<string, (string | number | null)[][]> => {
//     const grouped = new Map<string, (string | number | null)[][]>();
//     for (let i = 1; i < data.length; i++) {
//       const row = data[i];
//       const key = parseDateHour(row[0]);
//       if (!key) continue;
//       if (!grouped.has(key)) grouped.set(key, []);
//       grouped.get(key)!.push(row);
//     }
//     return grouped;
//   };

//   const pickFirstValue = (rows: (string | number | null)[][]): (string | number | null)[] => {
//     const result: (string | number | null)[] = [rows[0][0]];
//     const colCount = rows[0].length;
//     for (let col = 1; col < colCount; col++) {
//       let firstValue: string | number | null = null;
//       for (const row of rows) {
//         const value = row[col];
//         if (value !== null) {
//           firstValue = value;
//           break; // Pick the first non-null value
//         }
//       }
//       result.push(firstValue);
//     }
//     return result;
//   };

//   const handleMerge = async () => {
//     if (!fileA || !fileB) {
//       toast.error("Please select both files!");
//       return;
//     }
//     try {
//       const [dataA, dataB] = await Promise.all([readExcel(fileA), readExcel(fileB)]);
//       const headerA = dataA[0];
//       const headerB = dataB[0];
//       const groupedA = groupByDateHour(dataA);
//       const groupedB = groupByDateHour(dataB);
//       const allKeys = Array.from(new Set([...groupedA.keys(), ...groupedB.keys()])).sort();

//       const finalData: (string | number | null)[][] = [];

//       const headerRow = ["Time"];
//       const maxColumns = Math.max(headerA.length, headerB.length);
//       for (let i = 1; i < maxColumns; i++) {
//         if (i < headerA.length) headerRow.push(`${headerA[i]} A`);
//         if (i < headerB.length) headerRow.push(`${headerB[i]} B`);
//       }
//       finalData.push(headerRow);

//       for (const key of allKeys) {
//         const row: (string | number | null)[] = [key];
//         const firstA = groupedA.get(key) ? pickFirstValue(groupedA.get(key)!) : Array(headerA.length).fill(null);
//         const firstB = groupedB.get(key) ? pickFirstValue(groupedB.get(key)!) : Array(headerB.length).fill(null);
//         for (let i = 1; i < maxColumns; i++) {
//           if (i < firstA.length) row.push(firstA[i]);
//           if (i < firstB.length) row.push(firstB[i]);
//         }
//         finalData.push(row);
//       }

//       const ws = XLSX.utils.aoa_to_sheet(finalData);
//       const wb = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(wb, ws, "Merged");
//       XLSX.writeFile(wb, "MergedData.xlsx");
//       toast.success("Merged successfully!");
//     } catch (err) {
//       toast.error("Error merging files");
//       console.error(err);
//     }
//   };

//   return (
//     <>
//       <HeaNavLogo />
//       <ToastContainer />
//       <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
//         <h2>Track Merger</h2>
//         <input type="file" accept=".xlsx, .xls" onChange={(e) => setFileA(e.target.files?.[0] || null)} />
//         <input type="file" accept=".xlsx, .xls" onChange={(e) => setFileB(e.target.files?.[0] || null)} />
//         <button onClick={handleMerge}>Merge Files</button>
//       </div>
//     </>
//   );
// };

// export default TrackMeimport React, { useState } from "react";
// import * as XLSX from "xlsx";
// import React, { useState } from "react";

// import HeaNavLogo from "./HeaNavLogo";
// import { ToastContainer, toast } from "react-toastify";
// import { useNavigate } from "react-router-dom";
// import "react-toastify/dist/ReactToastify.css";

// const TrackMerger: React.FC = () => {
//   const [fileA, setFileA] = useState<File | null>(null);
//   const [fileB, setFileB] = useState<File | null>(null);
//   const navigate = useNavigate();

//   const readExcel = (file: File): Promise<(string | number | null)[][]> => {
//     return new Promise((resolve, reject) => {
//       const reader = new FileReader();
//       reader.onload = (e: ProgressEvent<FileReader>) => {
//         const result = e.target?.result;
//         if (!result) return reject("File read error: No result");

//         const data = new Uint8Array(result as ArrayBuffer);
//         const workbook = XLSX.read(data, { type: "array", cellDates: true });
//         const firstSheetName = workbook.SheetNames[0];
//         const sheet = workbook.Sheets[firstSheetName];

//         const json: (string | number | null)[][] = [];
//         const range = XLSX.utils.decode_range(sheet["!ref"]!);
//         for (let row = range.s.r; row <= range.e.r; row++) {
//           const rowData: (string | number | null)[] = [];
//           for (let col = range.s.c; col <= range.e.c; col++) {
//             const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
//             const cell = sheet[cellAddress];
//             if (!cell) {
//               rowData.push(null);
//               continue;
//             }
//             const value = cell.w !== undefined ? cell.w : cell.v;
//             rowData.push(value);
//           }
//           json.push(rowData);
//         }
//         resolve(json);
//       };
//       reader.onerror = (err) => reject(err);
//       reader.readAsArrayBuffer(file);
//     });
//   };

//   const parseDateHour = (timeStr: string | number | null): string | null => {
//     if (!timeStr) return null;
//     const dateObj = new Date(timeStr as string);
//     if (isNaN(dateObj.getTime())) return null;
//     const date = dateObj.toLocaleDateString("en-GB");
//     const hour = dateObj.getHours().toString().padStart(2, '0');
//     return `${date} ${hour}:00`;
//   };

//   const groupByDateHour = (data: (string | number | null)[][]): Map<string, (string | number | null)[][]> => {
//     const grouped = new Map<string, (string | number | null)[][]>();
//     for (let i = 1; i < data.length; i++) {
//       const row = data[i];
//       const key = parseDateHour(row[0]);
//       if (!key) continue;
//       if (!grouped.has(key)) grouped.set(key, []);
//       grouped.get(key)!.push(row);
//     }
//     return grouped;
//   };

//   const pickFirstValue = (rows: (string | number | null)[][]): (string | number | null)[] => {
//     const result: (string | number | null)[] = [rows[0][0]];
//     const colCount = rows[0].length;
//     for (let col = 1; col < colCount; col++) {
//       let firstValue: string | number | null = null;
//       for (const row of rows) {
//         const value = row[col];
//         if (value !== null) {
//           firstValue = value;
//           break; // Pick the first non-null value
//         }
//       }
//       result.push(firstValue);
//     }
//     return result;
//   };

//   const handleMerge = async () => {
//     if (!fileA || !fileB) {
//       toast.error("Please select both files!");
//       return;
//     }
//     try {
//       const [dataA, dataB] = await Promise.all([readExcel(fileA), readExcel(fileB)]);
//       const headerA = dataA[0];
//       const headerB = dataB[0];
//       const groupedA = groupByDateHour(dataA);
//       const groupedB = groupByDateHour(dataB);
//       const allKeys = Array.from(new Set([...groupedA.keys(), ...groupedB.keys()])).sort();

//       const finalData: (string | number | null)[][] = [];

//       const headerRow = ["Time"];
//       const maxColumns = Math.max(headerA.length, headerB.length);
//       for (let i = 1; i < maxColumns; i++) {
//         if (i < headerA.length) headerRow.push(`${headerA[i]} A`);
//         if (i < headerB.length) headerRow.push(`${headerB[i]} B`);
//       }
//       finalData.push(headerRow);

//       for (const key of allKeys) {
//         const row: (string | number | null)[] = [key];
//         const firstA = groupedA.get(key) ? pickFirstValue(groupedA.get(key)!) : Array(headerA.length).fill(null);
//         const firstB = groupedB.get(key) ? pickFirstValue(groupedB.get(key)!) : Array(headerB.length).fill(null);
//         for (let i = 1; i < maxColumns; i++) {
//           if (i < firstA.length) row.push(firstA[i]);
//           if (i < firstB.length) row.push(firstB[i]);
//         }
//         finalData.push(row);
//       }

//       const ws = XLSX.utils.aoa_to_sheet(finalData);
//       const wb = XLSX.utils.book_new();
//       XLSX.utils.book_append_sheet(wb, ws, "Merged");
//       XLSX.writeFile(wb, "MergedData.xlsx");
//       toast.success("Merged successfully!");
//     } catch (err) {
//       toast.error("Error merging files");
//       console.error(err);
//     }
//   };

//   return (
//     <>
//       <HeaNavLogo />
//       <ToastContainer />
//       <div
//         style={{
//           padding: "2rem",
//           maxWidth: "600px",
//           margin: "0 auto",
//           fontFamily: "Segoe UI, sans-serif",
//           backgroundColor: "#f9f9f9",
//           borderRadius: "10px",
//           boxShadow: "0 0 12px rgba(0, 0, 0, 0.1)",
//         }}
//       >
//         <h2 style={{ textAlign: "center", marginBottom: "2rem", color: "#333" }}>Track Merger</h2>

//         <div style={{ marginBottom: "1.5rem" }}>
//           <label style={{ display: "block", marginBottom: "0.5rem" }}>Upload TKA File:</label>
//           <input
//             type="file"
//             accept=".xlsx, .xls, .csv"
//             onChange={(e) => setFileA(e.target.files?.[0] || null)}
//             style={{ width: "100%", padding: "0.5rem" }}
//           />
//         </div>

//         <div style={{ marginBottom: "2rem" }}>
//           <label style={{ display: "block", marginBottom: "0.5rem" }}>Upload TKB File :</label>
//           <input
//             type="file"
//             accept=".xlsx, .xls, .csv"
//             onChange={(e) => setFileB(e.target.files?.[0] || null)}
//             style={{ width: "100%", padding: "0.5rem" }}
//           />
//         </div>

//         <button
//           onClick={handleMerge}
//           style={{
//             width: "100%",
//             padding: "0.75rem",
//             backgroundColor: "#007bff",
//             color: "#fff",
//             border: "none",
//             borderRadius: "6px",
//             fontSize: "1rem",
//             cursor: "pointer",
//             marginBottom: "1rem",
//           }}
//         >
//           Merge and Download
//         </button>

//         <button
//           onClick={() => navigate("/GapRemoval")}
//           style={{
//             width: "100%",
//             padding: "0.75rem",
//             backgroundColor: "#28a745",
//             color: "#fff",
//             border: "none",
//             borderRadius: "6px",
//             fontSize: "1rem",
//             cursor: "pointer",
//           }}
//         >
//           Proceed to Gap Removal
//         </button>
//       </div>
//     </>
//   );
// };

// export default TrackMerger;
import * as XLSX from "xlsx";
import React, { useState } from "react";

import HeaNavLogo from "./HeaNavLogo";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";

const TrackMerger: React.FC = () => {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const navigate = useNavigate();

  const readExcel = (file: File): Promise<(string | number | null)[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const result = e.target?.result;
        if (!result) return reject("File read error: No result");

        const data = new Uint8Array(result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[firstSheetName];

        const json: (string | number | null)[][] = [];
        const range = XLSX.utils.decode_range(sheet["!ref"]!);
        for (let row = range.s.r; row <= range.e.r; row++) {
          const rowData: (string | number | null)[] = [];
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
            const cell = sheet[cellAddress];
            if (!cell) {
              rowData.push(null);
              continue;
            }
            const value = cell.w !== undefined ? cell.w : cell.v;
            rowData.push(value);
          }
          json.push(rowData);
        }
        resolve(json);
      };
      reader.onerror = (err) => reject(err);
      reader.readAsArrayBuffer(file);
    });
  };

  const parseDateHour = (timeStr: string | number | null): string | null => {
    if (!timeStr) return null;
    const dateObj = new Date(timeStr as string);
    if (isNaN(dateObj.getTime())) return null;
    const date = dateObj.toLocaleDateString("en-GB");
    const hour = dateObj.getHours().toString().padStart(2, '0');
    return `${date} ${hour}:00`;
  };

  const groupByDateHour = (data: (string | number | null)[][]): Map<string, (string | number | null)[][]> => {
    const grouped = new Map<string, (string | number | null)[][]>();
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const key = parseDateHour(row[0]);
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(row);
    }
    return grouped;
  };

  const pickFirstValue = (rows: (string | number | null)[][]): (string | number | null)[] => {
    const result: (string | number | null)[] = [rows[0][0]];
    const colCount = rows[0].length;
    for (let col = 1; col < colCount; col++) {
      let firstValue: string | number | null = null;
      for (const row of rows) {
        const value = row[col];
        if (value !== null) {
          firstValue = value;
          break; // Pick the first non-null value
        }
      }
      result.push(firstValue);
    }
    return result;
  };

  const handleMerge = async () => {
    if (!fileA || !fileB) {
      toast.error("Please select both files!");
      return;
    }
    try {
      const [dataA, dataB] = await Promise.all([readExcel(fileA), readExcel(fileB)]);
      const headerA = dataA[0];
      const headerB = dataB[0];
      const groupedA = groupByDateHour(dataA);
      const groupedB = groupByDateHour(dataB);
      const allKeys = Array.from(new Set([...groupedA.keys(), ...groupedB.keys()])).sort();

      const finalData: (string | number | null)[][] = [];

      const headerRow = ["Time"];
      const maxColumns = Math.max(headerA.length, headerB.length);
      for (let i = 1; i < maxColumns; i++) {
        if (i < headerA.length) headerRow.push(`${headerA[i]} A`);
        if (i < headerB.length) headerRow.push(`${headerB[i]} B`);
      }
      finalData.push(headerRow);

      for (const key of allKeys) {
        const row: (string | number | null)[] = [key];
        const firstA = groupedA.get(key) ? pickFirstValue(groupedA.get(key)!) : Array(headerA.length).fill(null);
        const firstB = groupedB.get(key) ? pickFirstValue(groupedB.get(key)!) : Array(headerB.length).fill(null);
        for (let i = 1; i < maxColumns; i++) {
          if (i < firstA.length) row.push(firstA[i]);
          if (i < firstB.length) row.push(firstB[i]);
        }
        finalData.push(row);
      }

      const ws = XLSX.utils.aoa_to_sheet(finalData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Merged");
      XLSX.writeFile(wb, "MergedData.xlsx");
      toast.success("Merged successfully!");
    } catch (err) {
      toast.error("Error merging files");
      console.error(err);
    }
  };

  return (
    <>
      <HeaNavLogo />
      <ToastContainer />
      <div
        style={{
          padding: "2rem",
          maxWidth: "600px",
          margin: "0 auto",
          fontFamily: "Segoe UI, sans-serif",
          backgroundColor: "#f9f9f9",
          borderRadius: "10px",
          boxShadow: "0 0 12px rgba(0, 0, 0, 0.1)",
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: "2rem", color: "#333" }}>Track Merger</h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Upload TKA File:</label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setFileA(e.target.files?.[0] || null)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Upload TKB File :</label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setFileB(e.target.files?.[0] || null)}
            style={{ width: "100%", padding: "0.5rem" }}
          />
        </div>

        <button
          onClick={handleMerge}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          Merge and Download
        </button>

        <button
          onClick={() => navigate("/GapRemoval")}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Proceed to Gap Removal
        </button>
      </div>
    </>
  );
};

export default TrackMerger;