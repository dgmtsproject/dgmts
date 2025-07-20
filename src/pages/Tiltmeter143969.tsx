import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { 
  Typography, 
  CircularProgress,
  Button,
  Box,
  Paper,
  Stack,
  Checkbox,
  FormControlLabel,
  TextField
} from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabase';
import { format } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

interface SensorData {
  id: number;
  node_id: number;
  timestamp: string;
  x_value: number;
  y_value: number;
  z_value: number;
  created_at: string;
}

interface InstrumentSettings {
  alert_value?: number;
  warning_value?: number;
  shutdown_value?: number;
}

const Tiltmeter143969: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);
  const [showReferenceLines, setShowReferenceLines] = useState(false);
  const [referenceX, setReferenceX] = useState<string>('');
  const [referenceY, setReferenceY] = useState<string>('');
  const [referenceZ, setReferenceZ] = useState<string>('');
  const [referenceEnabled, setReferenceEnabled] = useState(false);
  const nodeId = 143969; // Hardcoded node ID

  const fetchSensorData = async () => {
    if (!fromDate || !toDate) return;
    
    setLoading(true);
    try {
      const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
      const startParam = formatDate(fromDate);
      const endParam = formatDate(toDate);

      const response = await fetch(
        `${API_BASE_URL}/api/sensor-data/${nodeId}?start_time=${startParam}&end_time=${endParam}&limit=1000`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch sensor data');
      }
      
      const data = await response.json();
      setSensorData(data.reverse()); // Reverse to show chronological order
    } catch (error) {
      toast.error('Failed to fetch sensor data');
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value')
        .eq('instrument_id', 'TILT-143969')
        .single();
      if (error) throw error;
      setInstrumentSettings(data);
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  const enableReferenceLines = () => {
    if (referenceX && referenceY && referenceZ) {
      setReferenceEnabled(true);
      toast.success('Reference lines enabled. Values will be subtracted from measurements.');
    } else {
      toast.error('Please enter all three reference values (X, Y, Z)');
    }
  };

  useEffect(() => {
    fetchInstrumentSettings();
  }, []);

  // Prepare data for charts
  const timestamps = sensorData.map(d => new Date(d.timestamp));
  const refX = referenceEnabled && referenceX ? parseFloat(referenceX) : 0;
  const refY = referenceEnabled && referenceY ? parseFloat(referenceY) : 0;
  const refZ = referenceEnabled && referenceZ ? parseFloat(referenceZ) : 0;
  
  const xValues = sensorData.map(d => d.x_value - refX);
  const yValues = sensorData.map(d => d.y_value - refY);
  const zValues = sensorData.map(d => d.z_value - refZ);

  // Color palette and hovertemplate for consistency
  const COLORS = {
    x: '#10b981',
    y: '#8b5cf6',
    z: '#f59e0b',
  };
  const AXIS_HOVERTEMPLATE = (axis: string) => `
    <b>${axis}-Axis</b><br>
    Time: %{x|%m/%d/%Y %H:%M}<br>
    Value: %{y:.6f}<extra></extra>
  `;

  const plotlyLayout = {
    autosize: true,
    height: 500,
    margin: { l: 60, r: 30, b: 120, t: 30, pad: 4 },
    xaxis: {
      title: { text: 'Time', standoff: 25, font: { size: 12, weight: 600 } },
      type: 'date' as const,
      tickmode: 'auto' as const,
      nticks: 5,
      tickformat: '%m/%d %H:%M',
      tickangle: 0,
      gridcolor: '#f0f0f0',
      gridwidth: 1,
      showgrid: true,
      automargin: true,
      autorange: true,
    },
    yaxis: {
      title: { text: 'Tilt (degrees)', standoff: 15 },
      autorange: true,
      tickmode: 'auto' as const,
      gridcolor: '#f0f0f0',
      gridwidth: 1,
      zeroline: true,
      zerolinecolor: '#f0f0f0',
      zerolinewidth: 1,
      showgrid: true,
      fixedrange: false,
    },
    showlegend: true,
    legend: {
      orientation: 'h' as const,
      y: -0.2,
      x: 0.5,
      xanchor: 'center' as const,
      font: { size: 12 },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#CCC',
      borderwidth: 1,
    },
    hovermode: 'closest' as const,
    hoverlabel: { bgcolor: 'white', bordercolor: '#ddd', font: { family: 'Arial', size: 12, color: 'black' } },
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
  };

  function getReferenceShapesAndAnnotations() {
    const shapes: any[] = [];
    const annotations: any[] = [];
    if (!instrumentSettings) return { shapes, annotations };
    // Alert (orange)
    if (instrumentSettings.alert_value) {
      shapes.push(
        {
          type: 'line', xref: 'paper', yref: 'y', x0: 0, y0: instrumentSettings.alert_value, x1: 1, y1: instrumentSettings.alert_value,
          line: { color: 'orange', width: 2, dash: 'dash' }
        },
        {
          type: 'line', xref: 'paper', yref: 'y', x0: 0, y0: -instrumentSettings.alert_value, x1: 1, y1: -instrumentSettings.alert_value,
          line: { color: 'orange', width: 2, dash: 'dash' }
        }
      );
      annotations.push(
        {
          x: 0.01, xref: 'paper', y: instrumentSettings.alert_value, yref: 'y', text: 'Alert', showarrow: false,
          font: { color: 'black', size: 10 }, bgcolor: 'rgba(255,165,0,0.8)', xanchor: 'left'
        },
        {
          x: 0.01, xref: 'paper', y: -instrumentSettings.alert_value, yref: 'y', text: 'Alert', showarrow: false,
          font: { color: 'black', size: 10 }, bgcolor: 'rgba(255,165,0,0.8)', xanchor: 'left'
        }
      );
    }
    // Warning (light yellow)
    if (instrumentSettings.warning_value) {
      shapes.push(
        {
          type: 'line', xref: 'paper', yref: 'y', x0: 0, y0: instrumentSettings.warning_value, x1: 1, y1: instrumentSettings.warning_value,
          line: { color: '#ffe066', width: 2, dash: 'dash' }
        },
        {
          type: 'line', xref: 'paper', yref: 'y', x0: 0, y0: -instrumentSettings.warning_value, x1: 1, y1: -instrumentSettings.warning_value,
          line: { color: '#ffe066', width: 2, dash: 'dash' }
        }
      );
      annotations.push(
        {
          x: 0.01, xref: 'paper', y: instrumentSettings.warning_value, yref: 'y', text: 'Warning', showarrow: false,
          font: { color: 'black', size: 10 }, bgcolor: 'rgba(255,224,102,0.8)', xanchor: 'left'
        },
        {
          x: 0.01, xref: 'paper', y: -instrumentSettings.warning_value, yref: 'y', text: 'Warning', showarrow: false,
          font: { color: 'black', size: 10 }, bgcolor: 'rgba(255,224,102,0.8)', xanchor: 'left'
        }
      );
    }
    // Shutdown (red)
    if (instrumentSettings.shutdown_value) {
      shapes.push(
        {
          type: 'line', xref: 'paper', yref: 'y', x0: 0, y0: instrumentSettings.shutdown_value, x1: 1, y1: instrumentSettings.shutdown_value,
          line: { color: 'red', width: 3, dash: 'solid' }
        },
        {
          type: 'line', xref: 'paper', yref: 'y', x0: 0, y0: -instrumentSettings.shutdown_value, x1: 1, y1: -instrumentSettings.shutdown_value,
          line: { color: 'red', width: 3, dash: 'solid' }
        }
      );
      annotations.push(
        {
          x: 0.01, xref: 'paper', y: instrumentSettings.shutdown_value, yref: 'y', text: 'Shutdown', showarrow: false,
          font: { color: 'white', size: 10 }, bgcolor: 'rgba(255,0,0,0.9)', xanchor: 'left'
        },
        {
          x: 0.01, xref: 'paper', y: -instrumentSettings.shutdown_value, yref: 'y', text: 'Shutdown', showarrow: false,
          font: { color: 'white', size: 10 }, bgcolor: 'rgba(255,0,0,0.9)', xanchor: 'left'
        }
      );
    }
    return { shapes, annotations };
  }

  const xChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'X-Axis',
      line: { color: COLORS.x, shape: 'spline' as const },
      marker: { size: 6, color: COLORS.x },
      hovertemplate: AXIS_HOVERTEMPLATE('X'),
      connectgaps: true,
    },
  ];
  const yChartData = [
    {
      x: timestamps,
      y: yValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Y-Axis',
      line: { color: COLORS.y, shape: 'spline' as const },
      marker: { size: 6, color: COLORS.y },
      hovertemplate: AXIS_HOVERTEMPLATE('Y'),
      connectgaps: true,
    },
  ];
  const zChartData = [
    {
      x: timestamps,
      y: zValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Z-Axis',
      line: { color: COLORS.z, shape: 'spline' as const },
      marker: { size: 6, color: COLORS.z },
      hovertemplate: AXIS_HOVERTEMPLATE('Z'),
      connectgaps: true,
    },
  ];
  const combinedChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'X-Axis',
      line: { color: COLORS.x, shape: 'spline' as const },
      marker: { size: 6, color: COLORS.x },
      hovertemplate: AXIS_HOVERTEMPLATE('X'),
      connectgaps: true,
    },
    {
      x: timestamps,
      y: yValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Y-Axis',
      line: { color: COLORS.y, shape: 'spline' as const },
      marker: { size: 6, color: COLORS.y },
      hovertemplate: AXIS_HOVERTEMPLATE('Y'),
      connectgaps: true,
    },
    {
      x: timestamps,
      y: zValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Z-Axis',
      line: { color: COLORS.z, shape: 'spline' as const },
      marker: { size: 6, color: COLORS.z },
      hovertemplate: AXIS_HOVERTEMPLATE('Z'),
      connectgaps: true,
    },
  ];

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <Typography variant="h4" gutterBottom>
          Tiltmeter-Node-143969 - Data Graphs
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
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
                onClick={fetchSensorData}
                disabled={loading || !fromDate || !toDate}
                sx={{ height: 40 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Load Data'}
              </Button>
            </Stack>
          </LocalizationProvider>

          {/* Reference Lines Section */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={showReferenceLines}
                  onChange={(e) => setShowReferenceLines(e.target.checked)}
                />
              }
              label="Enable Reference Lines"
            />
            
            {showReferenceLines && (
              <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
                <TextField
                  label="Reference X Value"
                  type="number"
                  value={referenceX}
                  onChange={(e) => setReferenceX(e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Reference Y Value"
                  type="number"
                  value={referenceY}
                  onChange={(e) => setReferenceY(e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                />
                <TextField
                  label="Reference Z Value"
                  type="number"
                  value={referenceZ}
                  onChange={(e) => setReferenceZ(e.target.value)}
                  size="small"
                  sx={{ width: 150 }}
                />
                <Button
                  variant="contained"
                  onClick={enableReferenceLines}
                  disabled={!referenceX || !referenceY || !referenceZ}
                >
                  Enable References
                </Button>
              </Stack>
            )}
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Data Points:</strong> {sensorData.length} | 
            <strong> Last Updated:</strong> {sensorData.length > 0 ? new Date(sensorData[sensorData.length - 1].timestamp).toLocaleString() : 'No data'}
            {referenceEnabled && (
              <span style={{ color: 'green', fontWeight: 'bold' }}>
                {' | Reference values enabled'}
              </span>
            )}
          </Typography>
        </Paper>

        {/* Individual Charts in order: X, Y, Z */}
        {/* X-Axis Chart */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            X-Axis Tilt (Channel 0)
          </Typography>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={xChartData}
              layout={{
                ...plotlyLayout,
                title: { text: `X-Axis Tilt - Node ${nodeId}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'X-Axis Value', standoff: 15 } },
                ...getReferenceShapesAndAnnotations(),
              }}
              config={{ responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false }}
              style={{ width: '100%' }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
        {/* Y-Axis Chart */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Y-Axis Tilt (Channel 1)
          </Typography>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={yChartData}
              layout={{
                ...plotlyLayout,
                title: { text: `Y-Axis Tilt - Node ${nodeId}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'Y-Axis Value', standoff: 15 } },
                ...getReferenceShapesAndAnnotations(),
              }}
              config={{ responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false }}
              style={{ width: '100%' }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
        {/* Z-Axis Chart */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Z-Axis Tilt (Channel 2)
          </Typography>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={zChartData}
              layout={{
                ...plotlyLayout,
                title: { text: `Z-Axis Tilt - Node ${nodeId}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'Z-Axis Value', standoff: 15 } },
                ...getReferenceShapesAndAnnotations(),
              }}
              config={{ responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false }}
              style={{ width: '100%' }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
        {/* Combined Chart - last */}
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Combined X, Y, Z Tilt Data
          </Typography>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={combinedChartData}
              layout={{
                ...plotlyLayout,
                title: { text: `Combined Tilt Data - Node ${nodeId}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'Axis Values', standoff: 15 } },
                ...getReferenceShapesAndAnnotations(),
              }}
              config={{ responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false }}
              style={{ width: '100%' }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
      </MainContentWrapper>
      <ToastContainer />
    </>
  );
};

export default Tiltmeter143969; 