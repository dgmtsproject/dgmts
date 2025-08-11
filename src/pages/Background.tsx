import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { Box, Typography, CircularProgress, Button, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';

// const MAX_POINTS = 1000;

interface InstrumentSettings {
  alert_value: number;
  warning_value: number;
  shutdown_value: number;
}

interface Project {
  id: number;
  name: string;
}

interface Instrument {
  instrument_id: string;
  instrument_name: string;
  project_id: number;
}

const Background: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);
  const [project, setProject] = useState<Project | null>(location.state?.project || null);
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);
  
  // Separate data structures for each plot

  // Fetch instrument settings and project info on component mount
  useEffect(() => {
    fetchInstrumentSettings();
    if (!location.state?.project) {
      fetchProjectInfo();
    } else {
      // If project is passed from navigation, fetch available instruments for this project
      fetchAvailableInstruments(location.state.project.id);
    }
  }, [location.state?.project]);

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value')
        .eq('instrument_id', 'SMG1')
        .single();

      if (error) {
        console.error('Error fetching instrument settings:', error);
        return;
      }
      
      setInstrumentSettings(data);
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  const fetchProjectInfo = async () => {
    try {
      // First get the project_id for SMG1
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id')
        .eq('instrument_id', 'SMG1')
        .single();

      if (instrumentError) {
        console.error('Error fetching instrument project:', instrumentError);
        return;
      }

      // Then get the project details
      const { data: projectData, error: projectError } = await supabase
        .from('Projects')
        .select('id, name')
        .eq('id', instrumentData.project_id)
        .single();

      if (projectError) {
        console.error('Error fetching project details:', projectError);
        return;
      }

      setProject(projectData);
      fetchAvailableInstruments(projectData.id);
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  };

  const fetchAvailableInstruments = async (projectId: number) => {
    try {
      // Fetch all instruments for this project that have graphs
      const { data: instrumentsData, error: instrumentsError } = await supabase
        .from('instruments')
        .select('instrument_id, instrument_name, project_id')
        .eq('project_id', projectId)
        .in('instrument_id', ['SMG1', 'SMG-2', 'SMG-3', 'AMTS-1', 'AMTS-2', 'TILT-142939', 'TILT-143969'])
        .order('instrument_id');

      if (instrumentsError) {
        console.error('Error fetching available instruments:', instrumentsError);
        return;
      }

      setAvailableInstruments(instrumentsData);
    } catch (err) {
      console.error('Error fetching available instruments:', err);
    }
  };

  const handleInstrumentChange = (instrumentId: string) => {
    switch (instrumentId) {
      case 'SMG1':
        navigate('/background');
        break;
      case 'SMG-2':
        navigate('/anc-seismograph');
        break;
      case 'SMG-3':
        navigate('/smg3-seismograph');
        break;
      case 'AMTS-1':
      case 'AMTS-2':
        navigate('/single-prism-with-time');
        break;
      case 'TILT-142939':
        navigate('/tiltmeter-142939');
        break;
      case 'TILT-143969':
        navigate('/tiltmeter-143969');
        break;
      default:
        break;
    }
  };

  const processedData = useMemo(() => {
    if (!rawData.length) {
      return {
        combined: { time: [], x: [], y: [], z: [] },
        x: { time: [], values: [] },
        y: { time: [], values: [] },
        z: { time: [], values: [] }
      };
    }

        // Date and hour-based filtering: Ensure at least one point per hour per date
    const getDateHourKey = (timestamp: string) => {
      const date = timestamp.split('T')[0]; // Get YYYY-MM-DD
      const hour = timestamp.split('T')[1]?.split(':')[0]; // Get HH
      return `${date}-${hour}`;
    };

    // Group data by date and hour
    const dataByDateHour = new Map<string, any[]>();
    rawData.forEach(entry => {
      const dateHourKey = getDateHourKey(entry[0]);
      if (!dataByDateHour.has(dateHourKey)) {
        dataByDateHour.set(dateHourKey, []);
      }
      dataByDateHour.get(dateHourKey)!.push(entry);
    });

    // For each date-hour, keep the entry with the highest value (max of all axes) to ensure date-hour coverage
    const dateHourCoverageData: any[] = [];
    dataByDateHour.forEach((dateHourEntries) => {
      // Find the entry with the highest value across all axes
      let maxEntry = dateHourEntries[0];
      let maxValue = Math.max(
        Math.abs(Number(dateHourEntries[0][1])), // X axis
        Math.abs(Number(dateHourEntries[0][2])), // Y axis
        Math.abs(Number(dateHourEntries[0][3]))  // Z axis
      );
      
      dateHourEntries.forEach(entry => {
        const currentMax = Math.max(
          Math.abs(Number(entry[1])), // X axis
          Math.abs(Number(entry[2])), // Y axis
          Math.abs(Number(entry[3]))  // Z axis
        );
        if (currentMax > maxValue) {
          maxValue = currentMax;
          maxEntry = entry;
        }
      });
      
      dateHourCoverageData.push(maxEntry); // Get the entry with highest value
    });

    // Ensure minimum 500 points per chart while covering all dates
    const MIN_POINTS = 500;
    
    // Combined: at least one axis is nonzero (from date-hour coverage data)
    const combined = dateHourCoverageData.filter((entry: any) => {
      const x = Math.abs(Number(entry[1]));
      const y = Math.abs(Number(entry[2]));
      const z = Math.abs(Number(entry[3]));
      return x > 0.0001 || y > 0.0001 || z > 0.0001;
    });
    
    // Ensure combined has at least MIN_POINTS or all available data
    const combinedFiltered = combined.length <= MIN_POINTS ? combined : 
      combined.filter((_, index) => index % Math.max(1, Math.floor(combined.length / MIN_POINTS)) === 0);

    // X: ensure at least MIN_POINTS while covering dates
    const xFiltered = dateHourCoverageData.filter((entry: any) => Math.abs(Number(entry[1])) > 0.0001);
    const xDown = xFiltered.length <= MIN_POINTS ? xFiltered : 
      xFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(xFiltered.length / MIN_POINTS)) === 0);

    // Y: ensure at least MIN_POINTS while covering dates
    const yFiltered = dateHourCoverageData.filter((entry: any) => Math.abs(Number(entry[2])) > 0.0001);
    const yDown = yFiltered.length <= MIN_POINTS ? yFiltered : 
      yFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(yFiltered.length / MIN_POINTS)) === 0);

    // Z: ensure at least MIN_POINTS while covering dates
    const zFiltered = dateHourCoverageData.filter((entry: any) => Math.abs(Number(entry[3])) > 0.0001);
    const zDown = zFiltered.length <= MIN_POINTS ? zFiltered : 
      zFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(zFiltered.length / MIN_POINTS)) === 0);

    const result = {
      combined: {
        time: combinedFiltered.map(entry => parseISO(entry[0])),
        x: combinedFiltered.map(entry => entry[1]),
        y: combinedFiltered.map(entry => entry[2]),
        z: combinedFiltered.map(entry => entry[3])
      },
      x: {
        time: xDown.map(entry => parseISO(entry[0])),
        values: xDown.map(entry => entry[1])
      },
      y: {
        time: yDown.map(entry => parseISO(entry[0])),
        values: yDown.map(entry => entry[2])
      },
      z: {
        time: zDown.map(entry => parseISO(entry[0])),
        values: zDown.map(entry => entry[3])
      }
    };

    return result;
  }, [rawData]);

  useEffect(() => {
    console.log('rawData', rawData.slice(0, 5));
    console.log('X', processedData.x);
    console.log('Y', processedData.y);
    console.log('Z', processedData.z);
    console.log('Date-hour-based filtering stats:', {
      totalRawData: rawData.length,
      totalProcessedData: processedData.combined.time.length,
      xDataPoints: processedData.x.time.length,
      yDataPoints: processedData.y.time.length,
      zDataPoints: processedData.z.time.length,
      uniqueDates: new Set(rawData.map(entry => entry[0].split('T')[0])).size,
      uniqueDateHours: new Set(rawData.map(entry => `${entry[0].split('T')[0]}-${entry[0].split('T')[1]?.split(':')[0]}`)).size,
      minPointsTarget: 500
    });
  }, [rawData, processedData]);

  useEffect(() => {
    if (rawData.length > 0) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [rawData]);

  const fetchData = async () => {
    if (!fromDate || !toDate) return;

    try {
      setLoading(true);
      setError(null);

      const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
      const startParam = formatDate(fromDate);
      const endParam = formatDate(toDate);

      const apiUrl = import.meta.env.DEV
        ? `/api/public-api/v1/records/background/15092/data?start=${startParam}&end=${endParam}`
        : `/api/fetchBackgroundData?start=${startParam}&end=${endParam}&instrumentId=15092`;

      const response = await fetch(apiUrl, {
        headers: {
          ...(import.meta.env.DEV && {
            "x-scs-api-key": import.meta.env.VITE_SYSCOM_API_KEY
          }),
          "Accept": "application/json"
        }
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      setRawData(data.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to fetch background data: ${err.message}`
          : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const createSinglePlot = (data: { time: Date[]; values: number[] }, axis: string, color: string) => {
    // Filter out any pairs where time or value is missing or invalid
    const filtered = data.time
      .map((t, i) => ({ t, v: data.values[i] }))
      .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));

    if (filtered.length === 0) return null;

    // Create shapes and annotations for reference lines
    const shapes: any[] = [];
    const annotations: any[] = [];

    if (instrumentSettings) {
      // Alert level (orange)
      if (instrumentSettings.alert_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.alert_value,
            x1: 1,
            y1: instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.alert_value,
            x1: 1,
            y1: -instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Warning level (red)
      if (instrumentSettings.warning_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.warning_value,
            x1: 1,
            y1: instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.warning_value,
            x1: 1,
            y1: -instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Shutdown level (dark red)
      if (instrumentSettings.shutdown_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.shutdown_value,
            x1: 1,
            y1: instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.shutdown_value,
            x1: 1,
            y1: -instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          }
        );
      }
    }

    return (
      <Plot
        key={`${axis}-plot`}
        data={[
          {
            x: filtered.map(pair => pair.t),
            y: filtered.map(pair => pair.v),
            type: 'scatter',
            mode: 'lines+markers',
            name: `${axis} [in/s]`,
            line: {
              color: color,
              shape: 'spline',
              width: 1.5
            },
            marker: {
              size: 6,
              color: color
            },
            hovertemplate: `
              <b>${axis}</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          }
        ]}
        layout={{
          title: {
            text: `${axis} Axis Vibration Data`,
            font: { size: 20, weight: 700, color: '#1f2937' },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: {
            title: {
              text: 'Time',
              font: { size: 16, weight: 700, color: '#374151' },
              standoff: 20
            },
            type: 'date',
            tickformat: '%m/%d %H:%M',
            gridcolor: '#f0f0f0',
            showgrid: true,
            tickfont: { size: 14, color: '#374151' },
            tickangle: 0
          },
          yaxis: {
            title: {
              text: 'Vibration (in/s)',
              font: { size: 16, weight: 700, color: '#374151' },
              standoff: 25
            },
            fixedrange: false,
            gridcolor: '#f0f0f0',
            zeroline: true,
            zerolinecolor: '#f0f0f0',
            tickfont: { size: 14, color: '#374151' }
          },
          showlegend: true,
          legend: {
            x: 1.05,
            xanchor: 'left',
            y: 0.5,
            yanchor: 'middle',
            font: { size: 14, weight: 700 },
            bgcolor: 'rgba(255,255,255,0.9)',
            bordercolor: '#CCC',
            borderwidth: 2
          },
          height: 500,
          margin: { t: 60, b: 80, l: 80, r: 200 },
          hovermode: 'closest',
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
          shapes: shapes,
          annotations: annotations
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          displaylogo: false
        }}
        style={{ width: '100%', height: 550 }}
        useResizeHandler={true}
      />
    );
  };

  const createCombinedPlot = (combined: { time: Date[]; x: number[]; y: number[]; z: number[] }) => {
    if (!combined.time.length) return null;

    // Create shapes and annotations for reference lines
    const shapes: any[] = [];
    const annotations: any[] = [];

    if (instrumentSettings) {
      // Alert level (orange)
      if (instrumentSettings.alert_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.alert_value,
            x1: 1,
            y1: instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.alert_value,
            x1: 1,
            y1: -instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Warning level (red)
      if (instrumentSettings.warning_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.warning_value,
            x1: 1,
            y1: instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.warning_value,
            x1: 1,
            y1: -instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Shutdown level (dark red)
      if (instrumentSettings.shutdown_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.shutdown_value,
            x1: 1,
            y1: instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.shutdown_value,
            x1: 1,
            y1: -instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          }
        );
      }
    }

    return (
      <Plot
        key="combined-plot"
        data={[
          {
            x: combined.time,
            y: combined.x,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'X [in/s]',
            line: {
              color: '#FF6384',
              shape: 'spline',
              width: 1.2
            },
            marker: {
              size: 5,
              color: '#FF6384'
            },
            hovertemplate: `
              <b>X</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.y,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Y [in/s]',
            line: {
              color: '#36A2EB',
              shape: 'spline',
              width: 1.2
            },
            marker: {
              size: 5,
              color: '#36A2EB'
            },
            hovertemplate: `
              <b>Y</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.z,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Z [in/s]',
            line: {
              color: '#FFCE56',
              shape: 'spline',
              width: 1.2
            },
            marker: {
              size: 5,
              color: '#FFCE56'
            },
            hovertemplate: `
              <b>Z</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          },
          // Add reference line traces for legend
          ...(instrumentSettings?.alert_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Alert (${instrumentSettings.alert_value} in/s)`,
            line: { color: 'orange', width: 2, dash: 'dash' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : []),
          ...(instrumentSettings?.warning_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Warning (${instrumentSettings.warning_value} in/s)`,
            line: { color: 'red', width: 2, dash: 'dash' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : []),
          ...(instrumentSettings?.shutdown_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Shutdown (${instrumentSettings.shutdown_value} in/s)`,
            line: { color: 'darkred', width: 3, dash: 'solid' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : [])
        ]}
        layout={{
          title: {
            text: 'Combined Vibration Data',
            font: { size: 20, weight: 700, color: '#1f2937' },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: {
            title: {
              text: 'Time',
              font: { size: 16, weight: 700, color: '#374151' },
              standoff: 20
            },
            type: 'date',
            tickformat: '%m/%d %H:%M',
            gridcolor: '#f0f0f0',
            showgrid: true,
            tickfont: { size: 14, color: '#374151' },
            tickangle: 0
          },
          yaxis: {
            title: {
              text: 'Vibration (in/s)',
              font: { size: 16, weight: 700, color: '#374151' },
              standoff: 25
            },
            fixedrange: false,
            gridcolor: '#f0f0f0',
            zeroline: true,
            zerolinecolor: '#f0f0f0',
            tickfont: { size: 14, color: '#374151' }
          },
          showlegend: true,
          legend: {
            x: 1.05,
            xanchor: 'left',
            y: 0.5,
            yanchor: 'middle',
            font: { size: 14, weight: 700 },
            bgcolor: 'rgba(255,255,255,0.9)',
            bordercolor: '#CCC',
            borderwidth: 2
          },
          height: 500,
          margin: { t: 60, b: 80, l: 80, r: 200 },
          hovermode: 'closest',
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
          shapes: shapes,
          annotations: annotations
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          displaylogo: false
        }}
        style={{ width: '100%', height: 550 }}
        useResizeHandler={true}
      />
    );
  };

  return (
    <>

      <HeaNavLogo />
            
      <MainContentWrapper>
        <Box p={3}>
          <Typography variant="h4" align="center" sx={{ mb: 3, mt: 2 }}>
            {project ? `${project.name} - Seismograph Data Graphs (SMG1)` : 'Seismograph Data Graphs (SMG1)'}
          </Typography>
          
          {project && (
            <Box mb={3} display="flex" justifyContent="center">
              <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
                <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
                <Select
                  labelId="instrument-select-label"
                  value="SMG1"
                  label="Select Instrument"
                  onChange={(e) => handleInstrumentChange(e.target.value as string)}
                >
                  {availableInstruments.map((instrument) => (
                    <MenuItem key={instrument.instrument_id} value={instrument.instrument_id}>
                      {instrument.instrument_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction="row" spacing={2} sx={{ mb: 4 }} alignItems="center">
              <DateTimePicker
                label="From Date"
                value={fromDate}
                onChange={setFromDate}
                maxDateTime={toDate || undefined}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DateTimePicker
                label="To Date"
                value={toDate}
                onChange={setToDate}
                minDateTime={fromDate || undefined}
                maxDateTime={new Date()}
                slotProps={{ textField: { size: 'small' } }}
              />
              <Button 
                variant="contained" 
                onClick={fetchData}
                disabled={loading || !fromDate || !toDate}
                sx={{ height: 40 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Load Data'}
              </Button>
              {rawData.length > 0 && (
                <Button 
                  variant="outlined" 
                  onClick={() => {
                    // Convert processed data back to rawData format for the table
                    const tableData = processedData.combined.time.map((time, index) => [
                      time.toISOString(),
                      processedData.combined.x[index],
                      processedData.combined.y[index],
                      processedData.combined.z[index]
                    ]);
                    navigate('/vibration-data-table', { 
                      state: { rawData: tableData, fromDate, toDate } 
                    });
                  }}
                  sx={{ height: 40 }}
                >
                  View Data Table
                </Button>
              )}
            </Stack>
          </LocalizationProvider>

          {error && (
            <Box mb={4}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {rawData.length > 0 && (
            <>
              {processedData.x.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.x, 'X', '#FF6384')}
                </Box>
              )}
              {processedData.y.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.y, 'Y', '#36A2EB')}
                </Box>
              )}
              {processedData.z.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.z, 'Z', '#FFCE56')}
                </Box>
              )}
              <Box mb={4} width="100%">
                {createCombinedPlot(processedData.combined)}
              </Box>
            </>
          )}

          {!loading && rawData.length === 0 && !error && (
            <Typography variant="body1" color="textSecondary">
              Select a date range and click "Load Data" to view vibration data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>{project ? `${project.name} - Seismograph Reference Levels (SMG1)` : 'Seismograph Reference Levels (SMG1)'}</Typography>
              <Stack direction="row" spacing={3}>
                {instrumentSettings.alert_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'orange', fontWeight: 'bold' }}>Alert:</span> ±{instrumentSettings.alert_value} in/s
                  </Typography>
                )}
                {instrumentSettings.warning_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'red', fontWeight: 'bold' }}>Warning:</span> ±{instrumentSettings.warning_value} in/s
                  </Typography>
                )}
                {instrumentSettings.shutdown_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'darkred', fontWeight: 'bold' }}>Shutdown:</span> ±{instrumentSettings.shutdown_value} in/s
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default Background;