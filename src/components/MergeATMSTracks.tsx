import * as XLSX from "xlsx";
import React, { useEffect, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Papa from "papaparse";
type Props = {
  onMergeSave: () => void;
};
const TrackMerger: React.FC<Props> = ({ onMergeSave }) => {
  useEffect(() => {
    localStorage.clear(); //check
  }, []);
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [tkFileA, setTkFileA] = useState<File | null>(null);
  const [tkFileB, setTkFileB] = useState<File | null>(null);
  const [fileAtms1, setFileAtms1] = useState<File | null>(null);
  const [fileAtms2, setFileAtms2] = useState<File | null>(null);


  // csv issue new handler
  const readFile = async (file: File): Promise<(string | number | null)[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (!result) return reject("File read error: No result");

          // Handle CSV files
          if (file.name.endsWith('.csv')) {
            Papa.parse(result.toString(), {
              complete: (results) => {
                const data = results.data as (string | number | null)[][];

                // Convert numeric strings to numbers
                const processedData = data.map(row =>
                  row.map(cell => {
                    if (typeof cell === 'string' && !isNaN(Number(cell)) && cell.trim() !== '') {
                      return Number(cell);
                    }
                    return cell;
                  })
                );

                resolve(processedData);
              },
              error: (error: any) => reject(error)
            });
          }
          // Handle Excel files (previous logic)
          else {
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
                const value = cell.t === 'n' ? cell.v : (cell.w !== undefined ? cell.w : cell.v);
                rowData.push(value);
              }
              json.push(rowData);
            }
            resolve(json);
          }
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);

      // Read differently based on file type
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file); // reader call to read as text for CSV
      } else {
        reader.readAsArrayBuffer(file); // reader call to read as array buffer for Excel
      }
    });
  };

  const parseDateHour = (timeStr: string | number | null): string | null => {
    if (!timeStr) return null;

    let dateObj: Date;

    if (typeof timeStr === "string" || typeof timeStr === "number") {
      dateObj = new Date(timeStr);
    } else {
      return null;
    }

    if (isNaN(dateObj.getTime())) return null;

    const month = (dateObj.getMonth() + 1).toString().padStart(2, "0");
    const day = dateObj.getDate().toString().padStart(2, "0");
    const year = dateObj.getFullYear();
    const hour = dateObj.getHours().toString().padStart(2, "0");

    return `${month}/${day}/${year} ${hour}:00`;
  };

  const groupByDateHour = (
    data: (string | number | null)[][]
  ): Map<string, (string | number | null)[][]> => {
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



  const pickFirstValue = (
    rows: (string | number | null)[][]
): (string | number | null)[] => {
    if (!rows || rows.length === 0) return [];
    
    const result: (string | number | null)[] = [rows[0][0]]; // Keep the timestamp
    const colCount = rows[0].length;
    
    for (let col = 1; col < colCount; col++) {
        let firstValue: string | number | null = null;
        
        // First try to find a non-null, non-zero value
        for (const row of rows) {
            const value = row[col];
            if (value !== null && value !== "" && value !== 0) {
                firstValue = value;
                break;
            }
        }
        
        // If still not found, take any value (including null/0)
        if (firstValue === null) {
            for (const row of rows) {
                if (row[col] !== undefined) {
                    firstValue = row[col];
                    break;
                }
            }
        }
        
        result.push(firstValue);
    }
    return result;
};

  const handleMerge = async () => {
    if (!fileA || !fileB || !fileAtms1 || !fileAtms2 || !tkFileA || !tkFileB) {
        toast.error("Please select all files!");
        return;
    }

    try {
        const [dataA, dataB, dataAtms1, dataAtms2, dataTk3A, dataTk3B] = await Promise.all([
            readFile(fileA),    // TK-2A
            readFile(fileB),    // TK-2B
            readFile(fileAtms1),
            readFile(fileAtms2),
            readFile(tkFileA),  // TK-3A
            readFile(tkFileB)   // TK-3B
        ]);

        // Process all files
        const headerA = dataA[0];
        const headerB = dataB[0];
        const headerTk3A = dataTk3A[0];
        const headerTk3B = dataTk3B[0];

        const groupedA = groupByDateHour(dataA);
        const groupedB = groupByDateHour(dataB);
        const groupedTk3A = groupByDateHour(dataTk3A);
        const groupedTk3B = groupByDateHour(dataTk3B);
        const groupedAtms1 = groupByDateHour(dataAtms1);
        const groupedAtms2 = groupByDateHour(dataAtms2);

        // Process ATMS files - skip the first column (Time)
        const headerAtms1 = dataAtms1[0].slice(1);
        const headerAtms2 = dataAtms2[0].slice(1);

        // Combine all time keys
        const allKeys = Array.from(
            new Set([
                ...groupedA.keys(),
                ...groupedB.keys(),
                ...groupedTk3A.keys(),
                ...groupedTk3B.keys(),
                ...groupedAtms1.keys(),
                ...groupedAtms2.keys()
            ])
        ).sort();

        const finalData: (string | number | null)[][] = [];

        // Create header row - modified to preserve all columns
        const headerRow = ["Time"];
        
        // Add all TK-2A columns (skip Time column)
        headerRow.push(...headerA.slice(1).map(h => h !== null ? h.toString() : ''));
        
        // Add all TK-2B columns (skip Time column)
        headerRow.push(...headerB.slice(1).map(h => h !== null ? h.toString() : ''));
        
        // Add all TK-3A columns (skip Time column)
        headerRow.push(...headerTk3A.slice(1).map(h => h !== null ? h.toString() : ''));
        
        // Add all TK-3B columns (skip Time column)
        headerRow.push(...headerTk3B.slice(1).map(h => h !== null ? h.toString() : ''));
        
        // Add ATMS headers exactly as they are
        headerRow.push(...headerAtms1.filter((val): val is string => val !== null && typeof val === 'string'));
        headerRow.push(...headerAtms2.filter((val): val is string => val !== null && typeof val === 'string'));

        finalData.push(headerRow);

        // Process each time key
        for (const key of allKeys) {
            const row: (string | number | null)[] = [key];

            // Get values from TK-2 files
            const firstA = groupedA.get(key)
                ? pickFirstValue(groupedA.get(key)!)
                : Array(headerA.length).fill(null);
            const firstB = groupedB.get(key)
                ? pickFirstValue(groupedB.get(key)!)
                : Array(headerB.length).fill(null);

            // Get values from TK-3 files
            const firstTk3A = groupedTk3A.get(key)
                ? pickFirstValue(groupedTk3A.get(key)!)
                : Array(headerTk3A.length).fill(null);
            const firstTk3B = groupedTk3B.get(key)
                ? pickFirstValue(groupedTk3B.get(key)!)
                : Array(headerTk3B.length).fill(null);

            // Get values from ATMS files (skip Time column)
            const firstAtms1 = groupedAtms1.get(key)
                ? pickFirstValue(groupedAtms1.get(key)!).slice(1)
                : Array(headerAtms1.length).fill(null);
            const firstAtms2 = groupedAtms2.get(key)
                ? pickFirstValue(groupedAtms2.get(key)!).slice(1)
                : Array(headerAtms2.length).fill(null);

            // Add all TK-2A values (skip Time column)
            row.push(...firstA.slice(1).map(val => 
                typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val
            ));
            
            // Add all TK-2B values (skip Time column)
            row.push(...firstB.slice(1).map(val => 
                typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val
            ));
            
            // Add all TK-3A values (skip Time column)
            row.push(...firstTk3A.slice(1).map(val => 
                typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val
            ));
            
            // Add all TK-3B values (skip Time column)
            row.push(...firstTk3B.slice(1).map(val => 
                typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val
            ));
            
            // Add ATMS values
            row.push(...firstAtms1.map(val =>
                typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val
            ));
            row.push(...firstAtms2.map(val =>
                typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val
            ));

            finalData.push(row);
        }

        // Create and save the merged file
        const ws = XLSX.utils.aoa_to_sheet(finalData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Merged");
        const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
        localStorage.setItem("mergedExcelFile", wbout);
        toast.success("Files merged successfully!");
    } catch (err) {
        toast.error("Error merging files");
        console.error(err);
    }

    onMergeSave();
};

  return (
    <>
      <ToastContainer />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f4f7fa",
          fontFamily: "'Inter', sans-serif",
          border: "4px solid black",
          padding: "5px",
          boxSizing: "border-box", // Add this
        width: "calc(100% - 8px)", // Account for border width
        maxWidth: "calc(100vw - 240px - 40px)", // Account for sidebar and padding
        overflow: "hidden" 
        }}
      >
        <h2
          style={{
            textAlign: "center",
            marginBottom: "2rem",
            color: "#1f2937",
            fontWeight: "700",
            fontSize: "1.5rem",
          }}
        >
          AMTS Track Merger
        </h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexDirection: "row",
              width: "100%", // Full width container
              gap: "1rem",   // Optional spacing between columns
            }}
          >
            {/* First input group */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                Upload TK-2A File:
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFileA(e.target.files?.[0] || null)}
                style={{
                  width: "98%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              />
            </div>

            {/* Second input group */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                Upload TK-2B File:
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setFileB(e.target.files?.[0] || null)}
                style={{
                  width: "98%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              />
            </div>
          </div>

        </div>
        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              flexDirection: "row",
              width: "100%", // Full width container
              gap: "1rem",   // Optional spacing between columns
            }}
          >
            {/* First input group */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                Upload TK-3A File:
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setTkFileA(e.target.files?.[0] || null)}
                style={{
                  width: "98%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              />
            </div>

            {/* Second input group */}
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontWeight: "600",
                  color: "#1f2937",
                  fontSize: "0.9rem",
                }}
              >
                Upload TK-3B File:
              </label>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => setTkFileB(e.target.files?.[0] || null)}
                style={{
                  width: "98%",
                  padding: "0.5rem",
                  border: "1px solid #d1d5db",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                  backgroundColor: "#f9fafb",
                  outline: "none",
                  transition: "border-color 0.2s ease",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
              />
            </div>
          </div>

        </div>



        <div style={{ marginBottom: "1.5rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
              color: "#1f2937",
              fontSize: "0.9rem",
            }}
          >
            Upload AMTS1 File:
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setFileAtms1(e.target.files?.[0] || null)}
            style={{
              width: "98%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              color: "#374151",
              backgroundColor: "#f9fafb",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          />
        </div>
        <div style={{ marginBottom: "2rem" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
              color: "#1f2937",
              fontSize: "0.9rem",
            }}
          >
            Upload AMTS2 File:
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setFileAtms2(e.target.files?.[0] || null)}
            style={{
              width: "98%",
              padding: "0.5rem",
              border: "1px solid #d1d5db",
              borderRadius: "0.375rem",
              fontSize: "0.875rem",
              color: "#374151",
              backgroundColor: "#f9fafb",
              outline: "none",
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
          />
        </div>

        <button
          onClick={handleMerge}
          // onClick={onMergeSave}
          style={{
            width: "100%",
            padding: "0.75rem",
            backgroundColor: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "0.375rem",
            fontSize: "1rem",
            fontWeight: "500",
            cursor: "pointer",
            marginBottom: "1rem",
            transition: "background-color 0.2s ease, transform 0.1s ease",
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
          Merge and Save
        </button>
      </div>
    </>
  );
};

export default TrackMerger;
