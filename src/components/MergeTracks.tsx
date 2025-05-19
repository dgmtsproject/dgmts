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
    localStorage.clear(); // or removeItem("mergedExcelFile")
  }, []);
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [drillfile, setDrillfile] = useState<File | null>(null);
  const [trainfile, setTrainfile] = useState<File | null>(null);

  const readFile = async (file: File): Promise<(string | number | null)[][]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
  
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (!result) return reject("File read error: No result");
  
          if (file.name.endsWith('.csv')) {
            Papa.parse(result.toString(), {
              complete: (results) => {

                let data = results.data as (string | number | null)[][];
                data = data.filter(row => row.length > 0);
                
                const processedData = data.map(row => 
                  row.map(cell => {
                    if (cell === null || cell === undefined || cell === '') {
                      return null;
                    }
                    if (typeof cell === 'string') {
                      const date = new Date(cell);
                      if (!isNaN(date.getTime())) {
                        return date.toISOString();
                      }
       
                      if (!isNaN(Number(cell))) {
                        return Number(cell);
                      }
                    }
                    return cell;
                  })
                );
                

                if (processedData.length === 0) {
                  return reject("CSV file is empty");
                }
                
                resolve(processedData);
              },
              error: (error: any) => reject(error)
            });
          } else {

            const data = new Uint8Array(result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: "array", cellDates: true });
            const firstSheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[firstSheetName];

            const json = XLSX.utils.sheet_to_json(sheet, {
              header: 1, 
              defval: null, 
              raw: false 
            }) as (string | number | null)[][];

            const filteredJson = json.filter(row => row.length > 0);
            
            resolve(filteredJson);
          }
        } catch (err) {
          reject(err);
        }
      };
  
      reader.onerror = (err) => reject(err);
  
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
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
    const result: (string | number | null)[] = [rows[0][0]];
    const colCount = rows[0].length;
    for (let col = 1; col < colCount; col++) {
      let firstValue: string | number | null = null;
      for (const row of rows) {
        const value = row[col];
        if (value !== null) {
          firstValue = value;
          break;
        }
      }
      result.push(firstValue);
    }
    return result;
  };

const handleMerge = async () => {
  if (!fileA || !fileB) {
    toast.error("Please upload both tracks A and B Files!");
    return;
  }
  
  try {
    // Read required files
    const [dataA, dataB] = await Promise.all([
      readFile(fileA),
      readFile(fileB),
    ]);

    // Read optional files if they exist
    const [drilldata, traintimedata] = await Promise.all([
      drillfile ? readFile(drillfile).catch(() => null) : Promise.resolve(null),
      trainfile ? readFile(trainfile).catch(() => null) : Promise.resolve(null),
    ]);

    const headerA = dataA[0];
    const headerB = dataB[0];
    const groupedA = groupByDateHour(dataA);
    const groupedB = groupByDateHour(dataB);
    const allKeys = Array.from(
      new Set([...groupedA.keys(), ...groupedB.keys()])
    ).sort();

    const finalData: (string | number | null)[][] = [];

    const headerRow = ["Time"];
    const maxColumns = Math.max(headerA.length, headerB.length);
    for (let i = 1; i < maxColumns; i++) {
      if (i < headerA.length) headerRow.push(`${headerA[i]}`);
      if (i < headerB.length) headerRow.push(`${headerB[i]}`);
    }
    finalData.push(headerRow);

    for (const key of allKeys) {
      const row: (string | number | null)[] = [key];
      const firstA = groupedA.get(key)
        ? pickFirstValue(groupedA.get(key)!)
        : Array(headerA.length).fill(null);
      const firstB = groupedB.get(key)
        ? pickFirstValue(groupedB.get(key)!)
        : Array(headerB.length).fill(null);

      for (let i = 1; i < maxColumns; i++) {
        if (i < firstA.length) {
          const val = firstA[i];
          row.push(typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val);
        }
        if (i < firstB.length) {
          const val = firstB[i];
          row.push(typeof val === 'string' && !isNaN(Number(val)) ? Number(val) : val);
        }
      }
      finalData.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(finalData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Merged");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
    localStorage.setItem("mergedExcelFile", wbout);
    toast.success("Saved after successful merge!");

    // Save drill data only if it exists
    if (drilldata) {
      const drillws = XLSX.utils.aoa_to_sheet(drilldata);
      const drillwb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(drillwb, drillws, "Drill Data");
      const drillwbout = XLSX.write(drillwb, { bookType: "xlsx", type: "base64" });
      localStorage.setItem("drillExcelFile", drillwbout);
      toast.success("Saved drill data!");
    }

    // Save train data only if it exists
    if (traintimedata) {
      const trainws = XLSX.utils.aoa_to_sheet(traintimedata);
      const trainwb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(trainwb, trainws, "Train Data");
      const trainwbout = XLSX.write(trainwb, { bookType: "xlsx", type: "base64" });
      localStorage.setItem("trainExcelFile", trainwbout);
      toast.success("Saved train data!");
    }
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
          margin: "10px",
          padding: "10px",
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
          Track Merger
        </h2>

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
            Upload TKA File:
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
            Upload TKB File:
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
            Upload Drill Time File <span style={{color:"blue"}}>(Optional)</span>:
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setDrillfile(e.target.files?.[0] || null)}
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
            Upload Train Time File <span style={{color:"blue"}}>(Optional)</span>:
          </label>
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setTrainfile(e.target.files?.[0] || null)}
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
