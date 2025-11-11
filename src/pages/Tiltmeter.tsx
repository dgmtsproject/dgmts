import React, { useState, useEffect } from 'react';
import * as XLSX from "xlsx";
import Papa from "papaparse";
import Plot from "react-plotly.js";
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';
import { 
  Typography, 
  CircularProgress,
} from '@mui/material';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAdminContext } from '../context/AdminContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

interface TiltmeterData {
  time: string;
  x: number;
  y: number;
  z: number;
}

interface Instrument {
  instrument_id: string;
  instrument_name: string;
  project_id: number;
  instrument_location?: string;
}

const Tiltmeter: React.FC = () => {
  const { permissions } = useAdminContext();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<TiltmeterData[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showGraphs, setShowGraphs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);

  const locationOptions = [
    "LBN-TM-North-OhioAbutB",
    "LBN-TM-NPS", 
    "LBN-TM-WashChan-AbutA"
  ];

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

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);
    setError(null);

    try {
      const fileData = await readFile(uploadedFile);
      
      if (fileData.length === 0) {
        throw new Error("File is empty");
      }

      const fileHeaders = fileData[0] as string[];
      setHeaders(fileHeaders);

      // Store raw file data for processing different locations
      setRawFileData(fileData);
      toast.success("File uploaded successfully!");
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to process file";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const [rawFileData, setRawFileData] = useState<(string | number | null)[][]>([]);

  const fetchAvailableInstruments = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('instrument_id, instrument_name, project_id, instrument_location')
        .eq('instrument_id', 'TILTMETER')
        .single();

      if (error) {
        console.error('Error fetching instrument:', error);
        return;
      }

      if (data) {
        setAvailableInstruments([data]);
      }
    } catch (err) {
      console.error('Error fetching instrument:', err);
    }
  };

  const handleGenerateGraphs = () => {
    if (!selectedLocation || rawFileData.length === 0 || headers.length === 0) return;
    
    // Find the column indices for the selected location
    const xIndex = headers.findIndex(h => h === `${selectedLocation}-X-axis`);
    const yIndex = headers.findIndex(h => h === `${selectedLocation}-Y-axis`);
    const zIndex = headers.findIndex(h => h === `${selectedLocation}-Z-axis`);
    
    if (xIndex !== -1 && yIndex !== -1 && zIndex !== -1) {
      const processedData: TiltmeterData[] = [];
      
      for (let i = 1; i < rawFileData.length; i++) {
        const row = rawFileData[i];
        if (row && row.length >= Math.max(xIndex, yIndex, zIndex) + 1) {
          const time = String(row[0]);
          const x = Number(row[xIndex]) || 0;
          const y = Number(row[yIndex]) || 0;
          const z = Number(row[zIndex]) || 0;
          
          processedData.push({ time, x, y, z });
        }
      }
      
      setData(processedData);
      setShowGraphs(true);
    }
  };

  const createGraphData = () => {
    if (!data.length) return null;

    const times = data.map(d => d.time);
    const xValues = data.map(d => d.x);
    const yValues = data.map(d => d.y);
    const zValues = data.map(d => d.z);

    return {
      times,
      xValues,
      yValues,
      zValues
    };
  };

  const graphData = createGraphData();

  useEffect(() => {
    if (permissions && !permissions.view_graph) {
      toast.error("You do not have permission to view graphs.");
      navigate("/");
    }
    fetchAvailableInstruments();
  }, [permissions, navigate]);

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton />
        <Typography variant="h4" gutterBottom>
          Tiltmeter - ANC DAR-BC Vibration Monitoring
        </Typography>

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
            Tiltmeter Data Analysis
          </h2>

          {/* File Upload Section */}
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
              Upload Tiltmeter Data File:
            </label>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
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
            {loading && (
              <div style={{ marginTop: "0.5rem", textAlign: "center" }}>
                <CircularProgress size={20} />
              </div>
            )}
            {file && (
              <div style={{ marginTop: "0.5rem", color: "#059669", fontSize: "0.875rem" }}>
                Selected file: {file.name}
              </div>
            )}
            {error && (
              <div style={{ marginTop: "0.5rem", color: "#dc2626", fontSize: "0.875rem" }}>
                {error}
              </div>
            )}
          </div>

          {/* Location Selection and Graph Generation */}
          {rawFileData.length > 0 && (
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
                  Select Tiltmeter Location:
                </label>
                <select
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "0.375rem",
                    padding: "0.5rem",
                    fontSize: "0.875rem",
                    color: "#374151",
                    backgroundColor: "#f9fafb",
                    outline: "none",
                    transition: "border-color 0.2s ease",
                    width: "300px",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#2563eb")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#d1d5db")}
                >
                  <option value="">Select a location</option>
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                <button
                  onClick={handleGenerateGraphs}
                  disabled={!selectedLocation}
                  style={{
                    backgroundColor: selectedLocation ? "#2563eb" : "#9ca3af",
                    color: "#ffffff",
                    padding: "0.75rem 1.5rem",
                    borderRadius: "0.375rem",
                    fontWeight: "500",
                    cursor: selectedLocation ? "pointer" : "not-allowed",
                    transition: "background-color 0.2s ease, transform 0.1s ease",
                    border: "none",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                  onMouseOver={(e) => {
                    if (selectedLocation) {
                      e.currentTarget.style.backgroundColor = "#1d4ed8";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedLocation) {
                      e.currentTarget.style.backgroundColor = "#2563eb";
                    }
                  }}
                  onMouseDown={(e) => {
                    if (selectedLocation) {
                      e.currentTarget.style.transform = "scale(0.98)";
                    }
                  }}
                  onMouseUp={(e) => {
                    if (selectedLocation) {
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                >
                  Generate Graphs
                </button>
              </div>
            </div>
          )}

          {/* Graphs Section */}
          {showGraphs && graphData && (
            <div
              style={{
                padding: "2rem",
                backgroundColor: "#ffffff",
                borderRadius: "0.5rem",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                marginTop: "1rem",
              }}
            >
              <div id="chartContainer" style={{ marginTop: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
                  {/* X-Axis Chart */}
                  <div style={{ width: '100%', overflowX: 'auto', marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      X-Axis Readings ({selectedLocation}) - {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}
                    </h3>
                    <Plot
                      data={[
                        {
                          x: graphData.times.map(time => new Date(time)),
                          y: graphData.xValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: 'X-Axis',
                          line: { color: '#10b981', shape: 'spline' },
                          hovertemplate: `
                            <b>X-Axis</b><br>
                            Time: %{x|%m/%d/%Y %H:%M}<br>
                            Value: %{y:.6f}°<extra></extra>
                          `,
                          connectgaps: true
                        }
                      ]}
                      layout={{
                        autosize: true,
                        height: 550,
                        margin: { t: 60, b: 100, l: 80, r: 80 },
                        title: {
                          text: `X-Axis Readings (${selectedLocation}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}`,
                          font: { size: 20, weight: 700, color: '#1f2937' },
                          x: 0.5,
                          xanchor: 'center'
                        },
                        xaxis: {
                          title: {
                            text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER</span>`,
                            standoff: 20,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          type: 'date',
                          tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
                          gridcolor: '#f0f0f0',
                          showgrid: true,
                          tickfont: { size: 14, color: '#374151', weight: 700 },
                          tickangle: 0,
                          nticks: 10,
                          tickmode: 'linear' as const,
                          dtick: 'D1',
                          tick0: 'D1',
                          ticks: 'outside',
                          ticklen: 8,
                          tickwidth: 1,
                          tickcolor: '#666666',
                          showticklabels: true,
                          minor: {
                            nticks: 4,
                            ticklen: 4,
                            tickwidth: 0.5,
                            tickcolor: '#999999',
                            showgrid: false
                          }
                        },
                        yaxis: {
                          title: {
                            text: 'X-Axis Value (°)',
                            standoff: 25,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          fixedrange: false,
                          gridcolor: '#f0f0f0',
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          tickfont: { size: 14, color: '#374151', weight: 700 }
                        },
                        showlegend: true,
                        legend: {
                          x: 0.02,
                          xanchor: 'left' as const,
                          y: -0.30,
                          yanchor: 'top' as const,
                          orientation: 'h' as const,
                          font: { size: 12, weight: 700 },
                          bgcolor: 'rgba(255,255,255,0.8)',
                          bordercolor: '#CCC',
                          borderwidth: 1,
                          traceorder: 'normal' as const
                        },
                        hovermode: 'closest',
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        shapes: [createZeroReferenceLine()]
                      }}
                      config={{ responsive: true }}
                      style={{ width: '100%', height: 550 }}
                    />
                  </div>

                  {/* Y-Axis Chart */}
                  <div style={{ width: '100%', overflowX: 'auto', marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      Y-Axis Readings ({selectedLocation}) - {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}
                    </h3>
                    <Plot
                      data={[
                        {
                          x: graphData.times.map(time => new Date(time)),
                          y: graphData.yValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: 'Y-Axis',
                          line: { color: '#8b5cf6', shape: 'spline' },
                          hovertemplate: `
                            <b>Y-Axis</b><br>
                            Time: %{x|%m/%d/%Y %H:%M}<br>
                            Value: %{y:.6f}°<extra></extra>
                          `,
                          connectgaps: true
                        }
                      ]}
                      layout={{
                        autosize: true,
                        height: 550,
                        margin: { t: 60, b: 100, l: 80, r: 80 },
                        title: {
                          text: `Y-Axis Readings (${selectedLocation}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}`,
                          font: { size: 20, weight: 700, color: '#1f2937' },
                          x: 0.5,
                          xanchor: 'center'
                        },
                        xaxis: {
                          title: {
                            text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER</span>`,
                            standoff: 20,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          type: 'date',
                          tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
                          gridcolor: '#f0f0f0',
                          showgrid: true,
                          tickfont: { size: 14, color: '#374151', weight: 700 },
                          tickangle: 0,
                          nticks: 10,
                          tickmode: 'linear' as const,
                          dtick: 'D1',
                          tick0: 'D1',
                          ticks: 'outside',
                          ticklen: 8,
                          tickwidth: 1,
                          tickcolor: '#666666',
                          showticklabels: true,
                          minor: {
                            nticks: 4,
                            ticklen: 4,
                            tickwidth: 0.5,
                            tickcolor: '#999999',
                            showgrid: false
                          }
                        },
                        yaxis: {
                          title: {
                            text: 'Y-Axis Value (°)',
                            standoff: 25,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          fixedrange: false,
                          gridcolor: '#f0f0f0',
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          tickfont: { size: 14, color: '#374151', weight: 700 }
                        },
                        showlegend: true,
                        legend: {
                          x: 0.02,
                          xanchor: 'left' as const,
                          y: -0.30,
                          yanchor: 'top' as const,
                          orientation: 'h' as const,
                          font: { size: 12, weight: 700 },
                          bgcolor: 'rgba(255,255,255,0.8)',
                          bordercolor: '#CCC',
                          borderwidth: 1,
                          traceorder: 'normal' as const
                        },
                        hovermode: 'closest',
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        shapes: [createZeroReferenceLine()]
                      }}
                      config={{ responsive: true }}
                      style={{ width: '100%', height: 550 }}
                    />
                  </div>

                  {/* Z-Axis Chart */}
                  <div style={{ width: '100%', overflowX: 'auto', marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      Z-Axis Readings ({selectedLocation}) - {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}
                    </h3>
                    <Plot
                      data={[
                        {
                          x: graphData.times.map(time => new Date(time)),
                          y: graphData.zValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: 'Z-Axis',
                          line: { color: '#f59e0b', shape: 'spline' },
                          hovertemplate: `
                            <b>Z-Axis</b><br>
                            Time: %{x|%m/%d/%Y %H:%M}<br>
                            Value: %{y:.6f}°<extra></extra>
                          `,
                          connectgaps: true
                        }
                      ]}
                      layout={{
                        autosize: true,
                        height: 550,
                        margin: { t: 60, b: 100, l: 80, r: 80 },
                        title: {
                          text: `Z-Axis Readings (${selectedLocation}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}`,
                          font: { size: 20, weight: 700, color: '#1f2937' },
                          x: 0.5,
                          xanchor: 'center'
                        },
                        xaxis: {
                          title: {
                            text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER</span>`,
                            standoff: 20,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          type: 'date',
                          tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
                          gridcolor: '#f0f0f0',
                          showgrid: true,
                          tickfont: { size: 14, color: '#374151', weight: 700 },
                          tickangle: 0,
                          nticks: 10,
                          tickmode: 'linear' as const,
                          dtick: 'D1',
                          tick0: 'D1',
                          ticks: 'outside',
                          ticklen: 8,
                          tickwidth: 1,
                          tickcolor: '#666666',
                          showticklabels: true,
                          minor: {
                            nticks: 4,
                            ticklen: 4,
                            tickwidth: 0.5,
                            tickcolor: '#999999',
                            showgrid: false
                          }
                        },
                        yaxis: {
                          title: {
                            text: 'Z-Axis Value (°)',
                            standoff: 25,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          fixedrange: false,
                          gridcolor: '#f0f0f0',
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          tickfont: { size: 14, color: '#374151', weight: 700 }
                        },
                        showlegend: true,
                        legend: {
                          x: 0.02,
                          xanchor: 'left' as const,
                          y: -0.30,
                          yanchor: 'top' as const,
                          orientation: 'h' as const,
                          font: { size: 12, weight: 700 },
                          bgcolor: 'rgba(255,255,255,0.8)',
                          bordercolor: '#CCC',
                          borderwidth: 1,
                          traceorder: 'normal' as const
                        },
                        hovermode: 'closest',
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        shapes: [createZeroReferenceLine()]
                      }}
                      config={{ responsive: true }}
                      style={{ width: '100%', height: 550 }}
                    />
                  </div>

                  {/* Combined Chart */}
                  <div style={{ width: '100%', overflowX: 'auto', marginBottom: '2.5rem' }}>
                    <h3 style={{ fontWeight: "700", fontSize: "1.25rem", color: "#1f2937", marginBottom: "1rem" }}>
                      Combined X, Y, Z Readings ({selectedLocation}) - {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}
                    </h3>
                    <Plot
                      data={[
                        {
                          x: graphData.times.map(time => new Date(time)),
                          y: graphData.xValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: 'X-Axis',
                          line: { color: '#10b981', shape: 'spline' },
                          hovertemplate: `
                            <b>X-Axis</b><br>
                            Time: %{x|%m/%d/%Y %H:%M}<br>
                            Value: %{y:.6f}°<extra></extra>
                          `,
                          connectgaps: true
                        },
                        {
                          x: graphData.times.map(time => new Date(time)),
                          y: graphData.yValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: 'Y-Axis',
                          line: { color: '#8b5cf6', shape: 'spline' },
                          hovertemplate: `
                            <b>Y-Axis</b><br>
                            Time: %{x|%m/%d/%Y %H:%M}<br>
                            Value: %{y:.6f}°<extra></extra>
                          `,
                          connectgaps: true
                        },
                        {
                          x: graphData.times.map(time => new Date(time)),
                          y: graphData.zValues,
                          type: 'scatter',
                          mode: 'lines',
                          name: 'Z-Axis',
                          line: { color: '#f59e0b', shape: 'spline' },
                          hovertemplate: `
                            <b>Z-Axis</b><br>
                            Time: %{x|%m/%d/%Y %H:%M}<br>
                            Value: %{y:.6f}°<extra></extra>
                          `,
                          connectgaps: true
                        }
                      ]}
                      layout={{
                        autosize: true,
                        height: 550,
                        margin: { t: 60, b: 100, l: 80, r: 80 },
                        title: {
                          text: `Combined X, Y, Z Readings (${selectedLocation}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER')?.instrument_location : 'Location: None'}`,
                          font: { size: 20, weight: 700, color: '#1f2937' },
                          x: 0.5,
                          xanchor: 'center'
                        },
                        xaxis: {
                          title: {
                            text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER</span>`,
                            standoff: 20,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          type: 'date',
                          tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
                          gridcolor: '#f0f0f0',
                          showgrid: true,
                          tickfont: { size: 14, color: '#374151', weight: 700 },
                          tickangle: 0,
                          nticks: 10,
                          tickmode: 'linear' as const,
                          dtick: 'D1',
                          tick0: 'D1',
                          ticks: 'outside',
                          ticklen: 8,
                          tickwidth: 1,
                          tickcolor: '#666666',
                          showticklabels: true,
                          minor: {
                            nticks: 4,
                            ticklen: 4,
                            tickwidth: 0.5,
                            tickcolor: '#999999',
                            showgrid: false
                          }
                        },
                        yaxis: {
                          title: {
                            text: 'Axis Values (°)',
                            standoff: 25,
                            font: { size: 16, weight: 700, color: '#374151' }
                          },
                          fixedrange: false,
                          gridcolor: '#f0f0f0',
                          zeroline: true,
                          zerolinecolor: '#f0f0f0',
                          tickfont: { size: 14, color: '#374151', weight: 700 }
                        },
                        showlegend: true,
                        legend: {
                          x: 0.02,
                          xanchor: 'left' as const,
                          y: -0.30,
                          yanchor: 'top' as const,
                          orientation: 'h' as const,
                          font: { size: 12, weight: 700 },
                          bgcolor: 'rgba(255,255,255,0.8)',
                          bordercolor: '#CCC',
                          borderwidth: 1,
                          traceorder: 'normal' as const
                        },
                        hovermode: 'closest',
                        plot_bgcolor: 'white',
                        paper_bgcolor: 'white',
                        shapes: [createZeroReferenceLine()]
                      }}
                      config={{ responsive: true }}
                      style={{ width: '100%', height: 550 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </MainContentWrapper>
      <ToastContainer />
    </>
  );
};

export default Tiltmeter; 