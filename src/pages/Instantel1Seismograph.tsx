import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { Box, Typography, CircularProgress, Button, Stack, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAdminContext } from '../context/AdminContext';
import { createReferenceLinesOnly, getThresholdsFromSettings } from '../utils/graphZones';

// Utility function to format time without timezone conversion
const formatUTCTime = (timeString: string): Date => {
  // Parse the time string as-is without timezone conversion
  // Split the string to extract date and time parts
  const [datePart, timePart] = timeString.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [time, milliseconds] = timePart.split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  
  // Create date in local timezone without conversion
  const date = new Date(year, month - 1, day, hours, minutes, seconds, milliseconds ? parseInt(milliseconds) : 0);
  return date;
};

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
  instrument_location?: string;
}

type DataType = 'ppv' | 'frequency' | 'metric';

const Instantel1Seismograph: React.FC = () => {
  const INSTRUMENT_ID = 'Instantel 1';
  
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
  const [dataType, setDataType] = useState<DataType>('ppv');

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
        .select('instrument_id, instrument_name, project_id, instrument_location')
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
      const readingTime = formatUTCTime(reading.Time);
      return (!fromDate || readingTime >= fromDate) && (!toDate || readingTime <= toDate);
    });

    // Get data based on selected type
    const getDataValue = (reading: MicromateReading, axis: 'Longitudinal' | 'Transverse' | 'Vertical') => {
      switch (dataType) {
        case 'ppv':
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
        case 'ppv':
          return 'in/s';
        case 'frequency':
          return 'Hz';
        case 'metric':
          return 'in/s';
        default:
          return 'in/s';
      }
    };

    // Process data for each axis
    const xData = filteredReadings.map(reading => ({
      time: formatUTCTime(reading.Time),
      value: getDataValue(reading, 'Longitudinal')
    }));

    const yData = filteredReadings.map(reading => ({
      time: formatUTCTime(reading.Time),
      value: getDataValue(reading, 'Transverse')
    }));

    const zData = filteredReadings.map(reading => ({
      time: formatUTCTime(reading.Time),
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
        time: formatUTCTime(reading.Time),
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
        x: combinedData.map(point => parseFloat(point.x.toFixed(3))),
        y: combinedData.map(point => parseFloat(point.y.toFixed(3))),
        z: combinedData.map(point => parseFloat(point.z.toFixed(3)))
      },
      x: {
        time: validXData.map(point => point.time),
        values: validXData.map(point => parseFloat(point.value.toFixed(3)))
      },
      y: {
        time: validYData.map(point => point.time),
        values: validYData.map(point => parseFloat(point.value.toFixed(3)))
      },
      z: {
        time: validZData.map(point => point.time),
        values: validZData.map(point => parseFloat(point.value.toFixed(3)))
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

  // Helper function to calculate y-axis range for auto-zoom
  const getYAxisRange = (values: number[], thresholds: any) => {
    if (values.length === 0) return { min: -0.1, max: 0.1 };
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    
    // Add 20% padding
    const padding = Math.max(range * 0.2, 0.01);
    
    // Consider threshold values for range
    const thresholdMax = Math.max(
      thresholds.warning || 0,
      thresholds.alert || 0,
      thresholds.shutdown || 0
    );
    
    return {
      min: Math.min(minValue - padding, -thresholdMax * 1.2),
      max: Math.max(maxValue + padding, thresholdMax * 1.2)
    };
  };

  const createSinglePlot = (data: { time: Date[]; values: number[] }, axis: string, color: string) => {
    // Filter out any pairs where time or value is missing or invalid
    const filtered = data.time
      .map((t, i) => ({ t, v: data.values[i] }))
      .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));

    if (filtered.length === 0) return null;

    // Create shapes and annotations for reference lines using the new utility
    const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };


    return (
      <Plot
        key={`${axis}-plot-${project?.name || 'default'}`}
        data={[
          {
            x: filtered.map(pair => pair.t),
            y: filtered.map(pair => pair.v),
            type: 'scatter',
            mode: 'lines',
            name: `${axis} [${processedData.unit}]`,
            line: {
              color: color,
              shape: 'linear',
              width: 1.5
            },
            hovertemplate: `
              <b>${axis}</b><br>
              Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>
              Value: %{y:.3~f}<extra></extra>
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
            text: `${project?.name || 'Project'} - ${axis} Axis PPV Data (${dataType}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location : 'Location: None'}`, 
            font: { size: 20, weight: 700, color: '#003087' },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: {
            title: { 
              text: `Time<br><span style="font-size:12px;color:#666;">${INSTRUMENT_ID}</span>`, 
              font: { size: 18, weight: 700, color: '#374151' },
              standoff: 20
            },
            type: 'date',
            tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%I:%M %p</span>',
            gridcolor: '#f0f0f0',
            showgrid: true,
            tickfont: { size: 14, color: '#374151', weight: 700 },
            tickangle: 0,
            nticks: 10,
            tickmode: 'linear',
            dtick: 'D1',
            tick0: 'D1'
          },
          yaxis: {
            title: { 
              text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`, 
              font: { size: 18, weight: 700, color: '#374151' },
              standoff: 25 
            },
            fixedrange: false,
            gridcolor: '#f0f0f0',
            zeroline: true,
            zerolinecolor: '#f0f0f0',
            tickfont: { size: 14, color: '#374151', weight: 700 },
            range: (() => {
              const allValues = (processedData[axis as keyof typeof processedData] as { values: number[] })?.values || [];
              const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
              return [range.min, range.max];
            })()
          },
          showlegend: true,
          legend: {
            x: 0.5,
            xanchor: 'center',
            y: -0.30,
            yanchor: 'top',
            orientation: 'h',
            font: { size: 12, weight: 700 },
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#CCC',
            borderwidth: 1,
            traceorder: 'normal'
          },
          height: 550,
          margin: { t: 60, b: 150, l: 80, r: 80 },
          hovermode: 'closest',
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
          shapes: zones.shapes,
          annotations: zones.annotations
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: `${project?.name || 'Project'}_${axis}_Axis_${dataType}_${new Date().toISOString().split('T')[0]}`,
            height: 600,
            width: 1200,
            scale: 2
          }
        }}
        style={{ width: '100%', height: 550 }}
        useResizeHandler={true}
      />
    );
  };

  const openChartInWindow = (
    chartTitle: string,
    chartData: any[],
    layout: any,
    config: any,
    location: string | undefined
  ) => {
    const windowTitle = `${project?.name || 'Project'} - ${chartTitle}${location ? ` - ${location}` : ''}`;
    const windowFeatures = 'width=1200,height=800,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no';
    
    const newWindow = window.open('', '_blank', windowFeatures);
    if (!newWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }

    newWindow.document.title = windowTitle;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${windowTitle}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              background-color: #f5f5f5;
            }
            .chart-container {
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              padding: 20px;
              height: calc(100vh - 40px);
            }
            .plotly-graph-div {
              width: 100% !important;
              height: 100% !important;
            }
          </style>
        </head>
        <body>
          <div class="chart-container">
            <div id="plotly-chart"></div>
          </div>
          
          <script>
            const chartData = ${JSON.stringify(chartData)};
            const chartLayout = ${JSON.stringify(layout)};
            const chartConfig = ${JSON.stringify(config)};
            
            Plotly.newPlot('plotly-chart', chartData, chartLayout, chartConfig);
            
            window.addEventListener('resize', function() {
              Plotly.Plots.resize('plotly-chart');
            });
          </script>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  const createCombinedPlot = (combined: { time: Date[]; x: number[]; y: number[]; z: number[] }) => {
    if (!combined.time.length) return null;

    // Create shapes and annotations for reference lines using the new utility
    const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };


    return (
      <Plot
        key={`combined-plot-${project?.name || 'default'}`}
        data={[
          {
            x: combined.time,
            y: combined.x,
            type: 'scatter',
            mode: 'lines',
            name: `X [${processedData.unit}]`,
            line: {
              color: '#FF6384',
              shape: 'linear',
              width: 1.2
            },
            hovertemplate: `
              <b>X</b><br>
              Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>
              Value: %{y:.3~f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.y,
            type: 'scatter',
            mode: 'lines',
            name: `Y [${processedData.unit}]`,
            line: {
              color: '#36A2EB',
              shape: 'linear',
              width: 1.2
            },
            hovertemplate: `
              <b>Y</b><br>
              Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>
              Value: %{y:.3~f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.z,
            type: 'scatter',
            mode: 'lines',
            name: `Z [${processedData.unit}]`,
            line: {
              color: '#FFCE56',
              shape: 'linear',
              width: 1.2
            },
            hovertemplate: `
              <b>Z</b><br>
              Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>
              Value: %{y:.3~f}<extra></extra>
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
            text: `${project?.name || 'Project'} - Combined PPV Data (${dataType}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location : 'Location: None'}`, 
            font: { size: 20, weight: 700, color: '#003087' },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: {
            title: { 
              text: `Time<br><span style="font-size:12px;color:#666;">${INSTRUMENT_ID}</span>`, 
              font: { size: 18, weight: 700, color: '#374151' },
              standoff: 20
            },
            type: 'date',
            tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%I:%M %p</span>',
            gridcolor: '#f0f0f0',
            showgrid: true,
            tickfont: { size: 14, color: '#374151', weight: 700 },
            tickangle: 0,
            nticks: 10,
            tickmode: 'linear',
            dtick: 'D1',
            tick0: 'D1'
          },
          yaxis: {
            title: { 
              text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`, 
              font: { size: 18, weight: 700, color: '#374151' },
              standoff: 25 
            },
            fixedrange: false,
            gridcolor: '#f0f0f0',
            zeroline: true,
            zerolinecolor: '#f0f0f0',
            tickfont: { size: 14, color: '#374151', weight: 700 },
            range: (() => {
              const allValues = [...combined.x, ...combined.y, ...combined.z];
              const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
              return [range.min, range.max];
            })()
          },
          showlegend: true,
          legend: {
            x: 0.5,
            xanchor: 'center',
            y: -0.30,
            yanchor: 'top',
            orientation: 'h',
            font: { size: 12, weight: 700 },
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#CCC',
            borderwidth: 1,
            traceorder: 'normal'
          },
          height: 550,
          margin: { t: 60, b: 150, l: 80, r: 80 },
          hovermode: 'closest',
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
          shapes: zones.shapes,
          annotations: zones.annotations
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: `${project?.name || 'Project'}_Combined_${dataType}_${new Date().toISOString().split('T')[0]}`,
            height: 650,
            width: 1200,
            scale: 2
          }
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
            {project ? `${project.name} - PPV Data Graphs (Instantel 1)` : 'PPV Data Graphs (Instantel 1)'}
          </Typography>
          
          {project && (
            <Box mb={3} display="flex" justifyContent="center" alignItems="center" gap={3}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#003087' }}>
                Location: {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location 
                  ? availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location 
                  : 'None'}
              </Typography>
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
                  <MenuItem value="ppv">PPV</MenuItem>
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
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">X Axis (Longitudinal) Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const filtered = processedData.x.time
                            .map((t, i) => ({ t, v: processedData.x.values[i] }))
                            .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));
                          
                          const chartData = [{
                            x: filtered.map(pair => pair.t),
                            y: filtered.map(pair => pair.v),
                            type: 'scatter' as const,
                            mode: 'lines' as const,
                            name: `X [${processedData.unit}]`,
                            line: { color: '#FF6384', shape: 'linear', width: 1.5 },
                            hovertemplate: '<b>X</b><br>Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>Value: %{y:.3~f}<extra></extra>',
                            connectgaps: true
                          }];
                          
                          const allValues = processedData.x.values;
                          const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };
                          const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
                          
                          const chartLayout = {
                            title: { 
                              text: `${project?.name || 'Project'} - X (Longitudinal) Axis PPV Data (${dataType}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location : 'Location: None'}`,
                              font: { size: 20, weight: 700, color: '#003087' },
                              x: 0.5,
                              xanchor: 'center'
                            },
                            xaxis: {
                              title: { 
                                text: `Time<br><span style="font-size:12px;color:#666;">${INSTRUMENT_ID}</span>`,
                                font: { size: 18, weight: 700, color: '#374151' },
                                standoff: 20
                              },
                              type: 'date',
                              tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%I:%M %p</span>',
                              gridcolor: '#f0f0f0',
                              showgrid: true,
                              tickfont: { size: 14, color: '#374151', weight: 700 },
                              tickangle: 0,
                              nticks: 10,
                              tickmode: 'linear',
                              dtick: 'D1',
                              tick0: 'D1'
                            },
                            yaxis: {
                              title: {
                                text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`,
                                font: { size: 18, weight: 700, color: '#374151' },
                                standoff: 25
                              },
                              fixedrange: false,
                              gridcolor: '#f0f0f0',
                              zeroline: true,
                              zerolinecolor: '#f0f0f0',
                              tickfont: { size: 14, color: '#374151', weight: 700 },
                              range: [range.min, range.max]
                            },
                            showlegend: true,
                            legend: {
                              x: 0.5,
                              xanchor: 'center',
                              y: -0.30,
                              yanchor: 'top',
                              orientation: 'h',
                              font: { size: 12, weight: 700 },
                              bgcolor: 'rgba(255,255,255,0.8)',
                              bordercolor: '#CCC',
                              borderwidth: 1,
                              traceorder: 'normal'
                            },
                            height: 550,
                            margin: { t: 60, b: 150, l: 80, r: 80 },
                            hovermode: 'closest',
                            plot_bgcolor: 'white',
                            paper_bgcolor: 'white',
                            shapes: zones.shapes,
                            annotations: zones.annotations
                          };
                          
                          const chartConfig = {
                            responsive: true,
                            displayModeBar: true,
                            scrollZoom: true,
                            displaylogo: false,
                          };
                          
                          openChartInWindow(
                            'X Axis PPV Data',
                            chartData,
                            chartLayout,
                            chartConfig,
                            availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location
                          );
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.x, 'X (Longitudinal)', '#FF6384')}
                </Box>
              )}
              {processedData.y.values.length > 0 && (
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Y Axis (Transverse) Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const filtered = processedData.y.time
                            .map((t, i) => ({ t, v: processedData.y.values[i] }))
                            .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));
                          
                          const chartData = [{
                            x: filtered.map(pair => pair.t),
                            y: filtered.map(pair => pair.v),
                            type: 'scatter' as const,
                            mode: 'lines' as const,
                            name: `Y [${processedData.unit}]`,
                            line: { color: '#36A2EB', shape: 'linear', width: 1.5 },
                            hovertemplate: '<b>Y</b><br>Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>Value: %{y:.3~f}<extra></extra>',
                            connectgaps: true
                          }];
                          
                          const allValues = processedData.y.values;
                          const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };
                          const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
                          
                          const chartLayout = {
                            title: { 
                              text: `${project?.name || 'Project'} - Y (Transverse) Axis PPV Data (${dataType}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location : 'Location: None'}`,
                              font: { size: 20, weight: 700, color: '#003087' },
                              x: 0.5,
                              xanchor: 'center'
                            },
                            xaxis: {
                              title: { 
                                text: `Time<br><span style="font-size:12px;color:#666;">${INSTRUMENT_ID}</span>`,
                                font: { size: 18, weight: 700, color: '#374151' },
                                standoff: 20
                              },
                              type: 'date',
                              tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%I:%M %p</span>',
                              gridcolor: '#f0f0f0',
                              showgrid: true,
                              tickfont: { size: 14, color: '#374151', weight: 700 },
                              tickangle: 0,
                              nticks: 10,
                              tickmode: 'linear',
                              dtick: 'D1',
                              tick0: 'D1'
                            },
                            yaxis: {
                              title: {
                                text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`,
                                font: { size: 18, weight: 700, color: '#374151' },
                                standoff: 25
                              },
                              fixedrange: false,
                              gridcolor: '#f0f0f0',
                              zeroline: true,
                              zerolinecolor: '#f0f0f0',
                              tickfont: { size: 14, color: '#374151', weight: 700 },
                              range: [range.min, range.max]
                            },
                            showlegend: true,
                            legend: {
                              x: 0.5,
                              xanchor: 'center',
                              y: -0.30,
                              yanchor: 'top',
                              orientation: 'h',
                              font: { size: 12, weight: 700 },
                              bgcolor: 'rgba(255,255,255,0.8)',
                              bordercolor: '#CCC',
                              borderwidth: 1,
                              traceorder: 'normal'
                            },
                            height: 550,
                            margin: { t: 60, b: 150, l: 80, r: 80 },
                            hovermode: 'closest',
                            plot_bgcolor: 'white',
                            paper_bgcolor: 'white',
                            shapes: zones.shapes,
                            annotations: zones.annotations
                          };
                          
                          const chartConfig = {
                            responsive: true,
                            displayModeBar: true,
                            scrollZoom: true,
                            displaylogo: false,
                          };
                          
                          openChartInWindow(
                            'Y Axis PPV Data',
                            chartData,
                            chartLayout,
                            chartConfig,
                            availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location
                          );
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.y, 'Y (Transverse)', '#36A2EB')}
                </Box>
              )}
              {processedData.z.values.length > 0 && (
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Z Axis (Vertical) Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const filtered = processedData.z.time
                            .map((t, i) => ({ t, v: processedData.z.values[i] }))
                            .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));
                          
                          const chartData = [{
                            x: filtered.map(pair => pair.t),
                            y: filtered.map(pair => pair.v),
                            type: 'scatter' as const,
                            mode: 'lines' as const,
                            name: `Z [${processedData.unit}]`,
                            line: { color: '#FFCE56', shape: 'linear', width: 1.5 },
                            hovertemplate: '<b>Z</b><br>Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>Value: %{y:.3~f}<extra></extra>',
                            connectgaps: true
                          }];
                          
                          const allValues = processedData.z.values;
                          const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };
                          const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
                          
                          const chartLayout = {
                            title: { 
                              text: `${project?.name || 'Project'} - Z (Vertical) Axis PPV Data (${dataType}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location : 'Location: None'}`,
                              font: { size: 20, weight: 700, color: '#003087' },
                              x: 0.5,
                              xanchor: 'center'
                            },
                            xaxis: {
                              title: { 
                                text: `Time<br><span style="font-size:12px;color:#666;">${INSTRUMENT_ID}</span>`,
                                font: { size: 18, weight: 700, color: '#374151' },
                                standoff: 20
                              },
                              type: 'date',
                              tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%I:%M %p</span>',
                              gridcolor: '#f0f0f0',
                              showgrid: true,
                              tickfont: { size: 14, color: '#374151', weight: 700 },
                              tickangle: 0,
                              nticks: 10,
                              tickmode: 'linear',
                              dtick: 'D1',
                              tick0: 'D1'
                            },
                            yaxis: {
                              title: {
                                text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`,
                                font: { size: 18, weight: 700, color: '#374151' },
                                standoff: 25
                              },
                              fixedrange: false,
                              gridcolor: '#f0f0f0',
                              zeroline: true,
                              zerolinecolor: '#f0f0f0',
                              tickfont: { size: 14, color: '#374151', weight: 700 },
                              range: [range.min, range.max]
                            },
                            showlegend: true,
                            legend: {
                              x: 0.5,
                              xanchor: 'center',
                              y: -0.30,
                              yanchor: 'top',
                              orientation: 'h',
                              font: { size: 12, weight: 700 },
                              bgcolor: 'rgba(255,255,255,0.8)',
                              bordercolor: '#CCC',
                              borderwidth: 1,
                              traceorder: 'normal'
                            },
                            height: 550,
                            margin: { t: 60, b: 150, l: 80, r: 80 },
                            hovermode: 'closest',
                            plot_bgcolor: 'white',
                            paper_bgcolor: 'white',
                            shapes: zones.shapes,
                            annotations: zones.annotations
                          };
                          
                          const chartConfig = {
                            responsive: true,
                            displayModeBar: true,
                            scrollZoom: true,
                            displaylogo: false,
                          };
                          
                          openChartInWindow(
                            'Z Axis PPV Data',
                            chartData,
                            chartLayout,
                            chartConfig,
                            availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location
                          );
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.z, 'Z (Vertical)', '#FFCE56')}
                </Box>
              )}
              <Box mb={4} width="100%">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Combined PPV Data</Typography>
                  <Tooltip title="Open in Popup">
                    <Button
                      startIcon={<OpenInNew />}
                      onClick={() => {
                        const chartData = [
                          { 
                            x: processedData.combined.time, 
                            y: processedData.combined.x, 
                            type: 'scatter' as const, 
                            mode: 'lines' as const, 
                            name: `X [${processedData.unit}]`,
                            line: { color: '#FF6384', shape: 'linear', width: 1.2 },
                            hovertemplate: '<b>X</b><br>Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>Value: %{y:.3~f}<extra></extra>',
                            connectgaps: true
                          },
                          { 
                            x: processedData.combined.time, 
                            y: processedData.combined.y, 
                            type: 'scatter' as const, 
                            mode: 'lines' as const, 
                            name: `Y [${processedData.unit}]`,
                            line: { color: '#36A2EB', shape: 'linear', width: 1.2 },
                            hovertemplate: '<b>Y</b><br>Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>Value: %{y:.3~f}<extra></extra>',
                            connectgaps: true
                          },
                          { 
                            x: processedData.combined.time, 
                            y: processedData.combined.z, 
                            type: 'scatter' as const, 
                            mode: 'lines' as const, 
                            name: `Z [${processedData.unit}]`,
                            line: { color: '#FFCE56', shape: 'linear', width: 1.2 },
                            hovertemplate: '<b>Z</b><br>Time: %{x|%Y-%m-%d %I:%M:%S.%L %p}<br>Value: %{y:.3~f}<extra></extra>',
                            connectgaps: true
                          }
                        ];
                        
                        const allValues = [...processedData.combined.x, ...processedData.combined.y, ...processedData.combined.z];
                        const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };
                        const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
                        
                        const chartLayout = {
                          title: { 
                            text: `${project?.name || 'Project'} - Combined PPV Data (${dataType}) - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location : 'Location: None'}`,
                            font: { size: 20, weight: 700, color: '#003087' },
                            x: 0.5,
                            xanchor: 'center'
                          },
                          xaxis: {
                            title: { 
                              text: `Time<br><span style="font-size:12px;color:#666;">${INSTRUMENT_ID}</span>`,
                              font: { size: 18, weight: 700, color: '#374151' },
                              standoff: 20
                            },
                            type: 'date',
                            tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%I:%M %p</span>',
                            gridcolor: '#f0f0f0',
                            showgrid: true,
                            tickfont: { size: 14, color: '#374151', weight: 700 },
                            tickangle: 0,
                            nticks: 10,
                            tickmode: 'linear',
                            dtick: 'D1',
                            tick0: 'D1'
                          },
                          yaxis: {
                            title: {
                              text: `${dataType.charAt(0).toUpperCase() + dataType.slice(1)} (${processedData.unit})`,
                              font: { size: 18, weight: 700, color: '#374151' },
                              standoff: 25
                            },
                            fixedrange: false,
                            gridcolor: '#f0f0f0',
                            zeroline: true,
                            zerolinecolor: '#f0f0f0',
                            tickfont: { size: 14, color: '#374151', weight: 700 },
                            range: [range.min, range.max]
                          },
                          showlegend: true,
                          legend: {
                            x: 0.5,
                            xanchor: 'center',
                            y: -0.30,
                            yanchor: 'top',
                            orientation: 'h',
                            font: { size: 12, weight: 700 },
                            bgcolor: 'rgba(255,255,255,0.8)',
                            bordercolor: '#CCC',
                            borderwidth: 1,
                            traceorder: 'normal'
                          },
                          height: 550,
                          margin: { t: 60, b: 150, l: 80, r: 80 },
                          hovermode: 'closest',
                          plot_bgcolor: 'white',
                          paper_bgcolor: 'white',
                          shapes: zones.shapes,
                          annotations: zones.annotations
                        };
                        
                        const chartConfig = {
                          responsive: true,
                          displayModeBar: true,
                          scrollZoom: true,
                          displaylogo: false,
                        };
                        
                        openChartInWindow(
                          'Combined PPV Data',
                          chartData,
                          chartLayout,
                          chartConfig,
                          availableInstruments.find(inst => inst.instrument_id === 'Instantel 1')?.instrument_location
                        );
                      }}
                      variant="outlined"
                      size="small"
                    >
                      Open in Popup
                    </Button>
                  </Tooltip>
                </Box>
                {createCombinedPlot(processedData.combined)}
              </Box>
            </>
          )}

          {!loading && (!rawData || rawData.MicromateReadings.length === 0) && !error && (
            <Typography variant="body1" color="textSecondary">
              Click "Load Data" to view PPV data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                {project ? `${project.name} - PPV Reference Levels (Instantel 1)` : 'PPV Reference Levels (Instantel 1)'}
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