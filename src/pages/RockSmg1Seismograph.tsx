import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { Box, Typography, CircularProgress, Button, Stack, FormControl, InputLabel, Select, MenuItem, Tooltip } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAdminContext } from '../context/AdminContext';
import { createSeismographChartData, createSeismographCombinedChartData } from '../utils/seismographCharts';
import { createReferenceLinesOnly, getThresholdsFromSettings } from '../utils/graphZones';

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
  instrument_location?: string;
}

const RockSmg1Seismograph: React.FC = () => {
  const INSTRUMENT_ID = 'ROCKSMG-1';
  
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = useAdminContext();
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
        .eq('instrument_id', 'ROCKSMG-1')
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
      // First get the project_id for ROCKSMG-1
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id')
        .eq('instrument_id', 'ROCKSMG-1')
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
        .in('instrument_id', ['ROCKSMG-1', 'ROCKSMG-2'])
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
      case 'ROCKSMG-1':
        navigate('/rocksmg1-seismograph');
        break;
      case 'ROCKSMG-2':
        navigate('/rocksmg2-seismograph');
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

    // Get thresholds for filtering
    const thresholds = instrumentSettings ? {
      alert: instrumentSettings.alert_value || 0,
      warning: instrumentSettings.warning_value || 0,
      shutdown: instrumentSettings.shutdown_value || 0
    } : { alert: 0, warning: 0, shutdown: 0 };

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
    // BUT also include ALL entries that exceed thresholds
    const dateHourCoverageData: any[] = [];
    const thresholdViolations: any[] = [];
    
    dataByDateHour.forEach((dateHourEntries) => {
      // Find the entry with the highest value across all axes
      let maxEntry = dateHourEntries[0];
      let maxValue = Math.max(
        Math.abs(Number(dateHourEntries[0][1])), // X axis
        Math.abs(Number(dateHourEntries[0][2])), // Y axis
        Math.abs(Number(dateHourEntries[0][3]))  // Z axis
      );
      
      // Check all entries for threshold violations
      dateHourEntries.forEach(entry => {
        const x = Math.abs(Number(entry[1]));
        const y = Math.abs(Number(entry[2]));
        const z = Math.abs(Number(entry[3]));
        
        // If any axis exceeds any threshold, add to violations
        if (x >= thresholds.alert || y >= thresholds.alert || z >= thresholds.alert ||
            x >= thresholds.warning || y >= thresholds.warning || z >= thresholds.warning ||
            x >= thresholds.shutdown || y >= thresholds.shutdown || z >= thresholds.shutdown) {
          thresholdViolations.push(entry);
        }
        
        // Find max entry for hourly representation
        const currentMax = Math.max(x, y, z);
        if (currentMax > maxValue) {
          maxValue = currentMax;
          maxEntry = entry;
        }
      });
      
      dateHourCoverageData.push(maxEntry); // Get the entry with highest value
    });

    // Combine hourly data with threshold violations, removing duplicates
    const combinedData = [...dateHourCoverageData];
    thresholdViolations.forEach(violation => {
      // Only add if not already in the data (avoid duplicates)
      const exists = combinedData.some(entry => entry[0] === violation[0]);
      if (!exists) {
        combinedData.push(violation);
      }
    });

    // Sort by timestamp
    combinedData.sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());

    // Ensure minimum 500 points per chart while covering all dates
    const MIN_POINTS = 500;
    
    // Combined: at least one axis is nonzero (from combined data that includes threshold violations)
    const combined = combinedData.filter((entry: any) => {
      const x = Math.abs(Number(entry[1]));
      const y = Math.abs(Number(entry[2]));
      const z = Math.abs(Number(entry[3]));
      return x > 0.0001 || y > 0.0001 || z > 0.0001;
    });
    
    // Ensure combined has at least MIN_POINTS or all available data
    const combinedFiltered = combined.length <= MIN_POINTS ? combined : 
      combined.filter((_, index) => index % Math.max(1, Math.floor(combined.length / MIN_POINTS)) === 0);

    // X: ensure at least MIN_POINTS while covering dates (use combined data for threshold violations)
    const xFiltered = combinedData.filter((entry: any) => Math.abs(Number(entry[1])) > 0.0001);
    const xDown = xFiltered.length <= MIN_POINTS ? xFiltered : 
      xFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(xFiltered.length / MIN_POINTS)) === 0);

    // Y: ensure at least MIN_POINTS while covering dates (use combined data for threshold violations)
    const yFiltered = combinedData.filter((entry: any) => Math.abs(Number(entry[2])) > 0.0001);
    const yDown = yFiltered.length <= MIN_POINTS ? yFiltered : 
      yFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(yFiltered.length / MIN_POINTS)) === 0);

    // Z: ensure at least MIN_POINTS while covering dates (use combined data for threshold violations)
    const zFiltered = combinedData.filter((entry: any) => Math.abs(Number(entry[3])) > 0.0001);
    const zDown = zFiltered.length <= MIN_POINTS ? zFiltered : 
      zFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(zFiltered.length / MIN_POINTS)) === 0);

    const result = {
      combined: {
        time: combinedFiltered.map(entry => parseISO(entry[0])),
        x: combinedFiltered.map(entry => parseFloat(Number(entry[1]).toFixed(3))),
        y: combinedFiltered.map(entry => parseFloat(Number(entry[2]).toFixed(3))),
        z: combinedFiltered.map(entry => parseFloat(Number(entry[3]).toFixed(3)))
      },
      x: {
        time: xDown.map(entry => parseISO(entry[0])),
        values: xDown.map(entry => parseFloat(Number(entry[1]).toFixed(3)))
      },
      y: {
        time: yDown.map(entry => parseISO(entry[0])),
        values: yDown.map(entry => parseFloat(Number(entry[2]).toFixed(3)))
      },
      z: {
        time: zDown.map(entry => parseISO(entry[0])),
        values: zDown.map(entry => parseFloat(Number(entry[3]).toFixed(3)))
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
            text: `${project?.name || 'Project'} - ${axis} Axis Vibration Data${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location ? ` - ${availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location}` : ''}`, 
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
            tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
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
              text: 'Vibration (in/s)', 
              font: { size: 18, weight: 700, color: '#374151' },
              standoff: 25 
            },
            fixedrange: false,
            gridcolor: '#f0f0f0',
            zeroline: true,
            zerolinecolor: '#f0f0f0',
            tickfont: { size: 14, color: '#374151', weight: 700 },
            range: (() => {
              const allValues = filtered.map(pair => pair.v);
              const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
              return [range.min, range.max];
            })()
          },
          showlegend: true,
          legend: {
            x: 0.02,
            xanchor: 'left',
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
          margin: { t: 60, b: 100, l: 80, r: 80 },
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
            filename: `${project?.name || 'Project'}_${axis}_${new Date().toISOString().split('T')[0]}`,
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
              Value: %{y:.3~f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.y,
            type: 'scatter',
            mode: 'lines',
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
              Value: %{y:.3~f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.z,
            type: 'scatter',
            mode: 'lines',
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
            text: `${project?.name || 'Project'} - Combined Vibration Data${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location ? ` - ${availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location}` : ''}`, 
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
            tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
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
              text: 'Vibration (in/s)', 
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
            x: 0.02,
            xanchor: 'left',
            y: -0.30,
            yanchor: 'top',
            orientation: 'h',
            font: { size: 12, weight: 700 },
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#CCC',
            borderwidth: 1,
            traceorder: 'normal'
          },
          height: 600,
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
            filename: `${project?.name || 'Project'}_Combined_${new Date().toISOString().split('T')[0]}`,
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

  const fetchData = async () => {
    if (!fromDate || !toDate) return;

    try {
      setLoading(true);
      setError(null);

      const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
      const startParam = formatDate(fromDate);
      const endParam = formatDate(toDate);

      const apiUrl = import.meta.env.DEV
        ? `/api/public-api/v1/records/background/16506/data?start=${startParam}&end=${endParam}`
        : `/api/fetchBackgroundData?start=${startParam}&end=${endParam}&instrumentId=16506`;

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

  return (
    <>
      <HeaNavLogo />
            
      <MainContentWrapper>
        <BackButton />  
        <Box p={3}>
          <Typography variant="h4" align="center" sx={{ mb: 3, mt: 2 }}>
            {project ? `${project.name} - Seismograph Data Graphs (ROCKSMG-1)` : 'Seismograph Data Graphs (ROCKSMG-1)'}
          </Typography>
          
          {project && (
            <Box mb={3} display="flex" justifyContent="center" alignItems="center" gap={3}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#003087' }}>
                Location: {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location 
                  ? availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location 
                  : 'None'}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
                <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
                <Select
                  labelId="instrument-select-label"
                  value="ROCKSMG-1"
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
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">X Axis Vibration Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const chartData = createSeismographChartData(processedData.x, 'X', '#FF6384', 'ROCKSMG-1', instrumentSettings, project, availableInstruments);
                          if (chartData) {
                            openChartInWindow(
                              'X Axis Vibration Data',
                              chartData.data,
                              chartData.layout,
                              chartData.config,
                              availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location
                            );
                          }
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.x, 'X', '#FF6384')}
                </Box>
              )}
              {processedData.y.values.length > 0 && (
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Y Axis Vibration Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const chartData = createSeismographChartData(processedData.y, 'Y', '#36A2EB', 'ROCKSMG-1', instrumentSettings, project, availableInstruments);
                          if (chartData) {
                            openChartInWindow(
                              'Y Axis Vibration Data',
                              chartData.data,
                              chartData.layout,
                              chartData.config,
                              availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location
                            );
                          }
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.y, 'Y', '#36A2EB')}
                </Box>
              )}
              {processedData.z.values.length > 0 && (
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Z Axis Vibration Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const chartData = createSeismographChartData(processedData.z, 'Z', '#FFCE56', 'ROCKSMG-1', instrumentSettings, project, availableInstruments);
                          if (chartData) {
                            openChartInWindow(
                              'Z Axis Vibration Data',
                              chartData.data,
                              chartData.layout,
                              chartData.config,
                              availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location
                            );
                          }
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.z, 'Z', '#FFCE56')}
                </Box>
              )}
              <Box mb={4} width="100%">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Combined Vibration Data</Typography>
                  <Tooltip title="Open in Popup">
                    <Button
                      startIcon={<OpenInNew />}
                      onClick={() => {
                        const chartData = createSeismographCombinedChartData(processedData.combined, 'ROCKSMG-1', instrumentSettings, project, availableInstruments);
                        if (chartData) {
                          openChartInWindow(
                            'Combined Vibration Data',
                            chartData.data,
                            chartData.layout,
                            chartData.config,
                            availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-1')?.instrument_location
                          );
                        }
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

          {!loading && rawData.length === 0 && !error && (
            <Typography variant="body1" color="textSecondary">
              Select a date range and click "Load Data" to view vibration data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>{project ? `${project.name} - Seismograph Reference Levels (ROCKSMG-1)` : 'Seismograph Reference Levels (ROCKSMG-1)'}</Typography>
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

export default RockSmg1Seismograph;
