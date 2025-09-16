import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { Box, Typography, CircularProgress, Button, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAdminContext } from '../context/AdminContext';

interface MicromateReading {
  Duration: number;
  Longitudinal: number;
  LongitudinalFrequency: number;
  LongitudinalMetric: number;
  Time: string;
  Transverse: number;
  TransverseFrequency: number;
  TransverseMetric: number;
  Vertical: number;
  VerticalFrequency: number;
  VerticalMetric: number;
  source_file: string;
}

interface MicromateData {
  MicromateReadings: MicromateReading[];
  processed_files: Array<{
    file: string;
    readings_count: number;
  }>;
  summary: {
    errors_count: number;
    files_found: number;
    files_processed: number;
    total_readings: number;
  };
}

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

type DataType = 'readings' | 'frequency' | 'metric';

const Instantel1Seismograph: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = useAdminContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<MicromateData | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);
  const [project, setProject] = useState<Project | null>(location.state?.project || null);
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);
  const [dataType, setDataType] = useState<DataType>('readings');

  // Fetch instrument settings and project info on component mount
  useEffect(() => {
    // Check if user has permission to view graphs
    if (!permissions.view_graph) {
      navigate('/dashboard');
      return;
    }
    
    fetchInstrumentSettings();
    if (!location.state?.project) {
      fetchProjectInfo();
    } else {
      // If project is passed from navigation, fetch available instruments for this project
      fetchAvailableInstruments(location.state.project.id);
    }
  }, [location.state?.project, permissions.view_graph, navigate]);

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value')
        .eq('instrument_id', 'Instantel 1')
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
      // First get the project_id for Instantel 1
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id')
        .eq('instrument_id', 'Instantel 1')
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
        .in('instrument_id', ['Instantel 1'])
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
      case 'Instantel 1':
        navigate('/instantel1-seismograph');
        break;
      default:
        break;
    }
  };

  const processedData = useMemo(() => {
    if (!rawData?.MicromateReadings?.length) {
      return {
        combined: { time: [], x: [], y: [], z: [] },
        x: { time: [], values: [] },
        y: { time: [], values: [] },
        z: { time: [], values: [] }
      };
    }

    // Filter data by date range
    const filteredReadings = rawData.MicromateReadings.filter(reading => {
      const readingTime = parseISO(reading.Time);
      return (!fromDate || readingTime >= fromDate) && (!toDate || readingTime <= toDate);
    });

    // Get data based on selected type
    const getDataValue = (reading: MicromateReading, axis: 'Longitudinal' | 'Transverse' | 'Vertical') => {
      switch (dataType) {
        case 'readings':
          return reading[axis];
        case 'frequency':
          return reading[`${axis}Frequency`];
        case 'metric':
          return reading[`${axis}Metric`];
        default:
          return reading[axis];
      }
    };

    const getUnit = () => {
      switch (dataType) {
        case 'readings':
          return 'mm/s';
        case 'frequency':
          return 'Hz';
        case 'metric':
          return 'mm/s²';
        default:
          return 'mm/s';
      }
    };

    // Process data for each axis
    const xData = filteredReadings.map(reading => ({
      time: parseISO(reading.Time),
      value: getDataValue(reading, 'Longitudinal')
    }));

    const yData = filteredReadings.map(reading => ({
      time: parseISO(reading.Time),
      value: getDataValue(reading, 'Transverse')
    }));

    const zData = filteredReadings.map(reading => ({
      time: parseISO(reading.Time),
      value: getDataValue(reading, 'Vertical')
    }));

    // Filter out invalid data points
    const filterValidData = (data: Array<{ time: Date; value: number }>) => {
      return data.filter(point => 
        point.time && 
        typeof point.value === 'number' && 
        !isNaN(point.value)
      );
    };

    const validXData = filterValidData(xData);
    const validYData = filterValidData(yData);
    const validZData = filterValidData(zData);

    // Create combined data (all axes with same timestamps)
    const combinedData = filteredReadings
      .map(reading => ({
        time: parseISO(reading.Time),
        x: getDataValue(reading, 'Longitudinal'),
        y: getDataValue(reading, 'Transverse'),
        z: getDataValue(reading, 'Vertical')
      }))
      .filter(point => 
        point.time && 
        typeof point.x === 'number' && !isNaN(point.x) &&
        typeof point.y === 'number' && !isNaN(point.y) &&
        typeof point.z === 'number' && !isNaN(point.z)
      );

    return {
      combined: {
        time: combinedData.map(point => point.time),
        x: combinedData.map(point => point.x),
        y: combinedData.map(point => point.y),
        z: combinedData.map(point => point.z)
      },
      x: {
        time: validXData.map(point => point.time),
        values: validXData.map(point => point.value)
      },
      y: {
        time: validYData.map(point => point.time),
        values: validYData.map(point => point.value)
      },
      z: {
        time: validZData.map(point => point.time),
        values: validZData.map(point => point.value)
      },
      unit: getUnit()
    };
  }, [rawData, fromDate, toDate, dataType]);

  useEffect(() => {
    if (rawData) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [rawData]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use direct API call in development, serverless function in production
      const apiUrl = import.meta.env.DEV
        ? 'https://imsite.dullesgeotechnical.com/api/micromate/readings'
        : '/api/fetchMicromateReadings';

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setRawData(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to fetch micromate readings: ${err.message}`
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
            name: `${axis} [${processedData.unit}]`,
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
            text: `${axis} Axis Micromate Data (${dataType})`, 
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
              text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`, 
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
        style={{ width: '100%', height: 400 }}
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
            name: `X [${processedData.unit}]`,
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
            name: `Y [${processedData.unit}]`,
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
            name: `Z [${processedData.unit}]`,
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
            name: `Alert (${instrumentSettings.alert_value} ${processedData.unit})`,
            line: { color: 'orange', width: 2, dash: 'dash' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : []),
          ...(instrumentSettings?.warning_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Warning (${instrumentSettings.warning_value} ${processedData.unit})`,
            line: { color: 'red', width: 2, dash: 'dash' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : []),
          ...(instrumentSettings?.shutdown_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Shutdown (${instrumentSettings.shutdown_value} ${processedData.unit})`,
            line: { color: 'darkred', width: 3, dash: 'solid' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : [])
        ]}
        layout={{
          title: { 
            text: `Combined Micromate Data (${dataType})`, 
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
              text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`, 
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
        <BackButton />  
        <Box p={3}>
          <Typography variant="h4" align="center" sx={{ mb: 3, mt: 2 }}>
            {project ? `${project.name} - Micromate Data Graphs (Instantel 1)` : 'Micromate Data Graphs (Instantel 1)'}
          </Typography>
          
          {project && (
            <Box mb={3} display="flex" justifyContent="center">
              <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
                <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
                <Select
                  labelId="instrument-select-label"
                  value="Instantel 1"
                  label="Select Instrument"
                  onChange={(e) => handleInstrumentChange(e.target.value as string)}
                >
                  {availableInstruments.map((instrument) => (
                    <MenuItem key={instrument.instrument_id} value={instrument.instrument_id}>
                      {instrument.instrument_id} - {instrument.instrument_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction="row" spacing={2} sx={{ mb: 4 }} alignItems="center" flexWrap="wrap">
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
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="data-type-label">Data Type</InputLabel>
                <Select
                  labelId="data-type-label"
                  value={dataType}
                  label="Data Type"
                  onChange={(e) => setDataType(e.target.value as DataType)}
                >
                  <MenuItem value="readings">Readings</MenuItem>
                  <MenuItem value="frequency">Frequency</MenuItem>
                  <MenuItem value="metric">Metric</MenuItem>
                </Select>
              </FormControl>
              <Button 
                variant="contained" 
                onClick={fetchData}
                disabled={loading}
                sx={{ height: 40 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Load Data'}
              </Button>
              {rawData && rawData.MicromateReadings.length > 0 && (
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

          {rawData && rawData.MicromateReadings.length > 0 && (
            <>
              {processedData.x.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.x, 'X (Longitudinal)', '#FF6384')}
                </Box>
              )}
              {processedData.y.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.y, 'Y (Transverse)', '#36A2EB')}
                </Box>
              )}
              {processedData.z.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.z, 'Z (Vertical)', '#FFCE56')}
                </Box>
              )}
              <Box mb={4} width="100%">
                {createCombinedPlot(processedData.combined)}
              </Box>
            </>
          )}

          {!loading && (!rawData || rawData.MicromateReadings.length === 0) && !error && (
            <Typography variant="body1" color="textSecondary">
              Click "Load Data" to view micromate data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                {project ? `${project.name} - Micromate Reference Levels (Instantel 1)` : 'Micromate Reference Levels (Instantel 1)'}
              </Typography>
              <Stack direction="row" spacing={3}>
                {instrumentSettings.alert_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'orange', fontWeight: 'bold' }}>Alert:</span> ±{instrumentSettings.alert_value} {processedData.unit}
                  </Typography>
                )}
                {instrumentSettings.warning_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'red', fontWeight: 'bold' }}>Warning:</span> ±{instrumentSettings.warning_value} {processedData.unit}
                  </Typography>
                )}
                {instrumentSettings.shutdown_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'darkred', fontWeight: 'bold' }}>Shutdown:</span> ±{instrumentSettings.shutdown_value} {processedData.unit}
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

export default Instantel1Seismograph;
