import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { 
  Typography, 
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Paper
} from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabase';

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

const Tiltmeter30846: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<number>(142939);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);

  const fetchSensorData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startTime = new Date();
      
      // Calculate start time based on selected range
      switch (timeRange) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          break;
        case '6h':
          startTime.setHours(now.getHours() - 6);
          break;
        case '24h':
          startTime.setDate(now.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
        default:
          startTime.setDate(now.getDate() - 1);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/sensor-data/${selectedNode}?start_time=${startTime.toISOString()}&limit=1000`
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

  const triggerDataFetch = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fetch-sensor-data`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger data fetch');
      }
      
      toast.success('Data fetch triggered successfully');
      setTimeout(fetchSensorData, 2000); // Refresh data after 2 seconds
    } catch (error) {
      toast.error('Failed to trigger data fetch');
      console.error('Error triggering data fetch:', error);
    }
  };

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value')
        .eq('instrument_name', 'Tiltmeter (30846)')
        .single();
      if (error) throw error;
      setInstrumentSettings(data);
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  useEffect(() => {
    fetchSensorData();
    fetchInstrumentSettings();
  }, [selectedNode, timeRange]);

  // Prepare data for charts
  const timestamps = sensorData.map(d => new Date(d.timestamp));
  const xValues = sensorData.map(d => d.x_value);
  const yValues = sensorData.map(d => d.y_value);
  const zValues = sensorData.map(d => d.z_value);

  // Color palette and hovertemplate for consistency
  const COLORS = {
    x: '#10b981',
    y: '#8b5cf6',
    z: '#f59e0b',
  };
  const AXIS_HOVERTEMPLATE = (axis: string) => `
    <b>${axis}-Axis</b><br>
    Time: %{x|%m/%d/%Y %H:%M}<br>
    Value: %{y:.6f}°<extra></extra>
  `;

  const plotlyLayout = {
    autosize: true,
    height: 600,
    margin: { t: 60, b: 80, l: 80, r: 200 },
    title: {
      font: { size: 20, weight: 700, color: '#1f2937' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { 
        text: 'Time', 
        standoff: 20, 
        font: { size: 16, weight: 700, color: '#374151' } 
      },
      type: 'date' as const,
      tickformat: '%m/%d %H:%M',
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 14, color: '#374151' },
      tickangle: 0
    },
    yaxis: {
      title: { 
        text: 'Tilt (degrees)', 
        standoff: 25,
        font: { size: 16, weight: 700, color: '#374151' }
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
      xanchor: 'left' as const,
      y: 0.5,
      yanchor: 'middle' as const,
      font: { size: 14, weight: 700 },
      bgcolor: 'rgba(255,255,255,0.9)',
      bordercolor: '#CCC',
      borderwidth: 2
    },
    hovermode: 'closest' as const,
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
          Tiltmeter (30846) - Sensor Data
        </Typography>

        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Node</InputLabel>
              <Select
                value={selectedNode}
                label="Node"
                onChange={(e) => setSelectedNode(Number(e.target.value))}
              >
                <MenuItem value={142939}>Node 142939</MenuItem>
                <MenuItem value={143969}>Node 143969</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">Last 1 Hour</MenuItem>
                <MenuItem value="6h">Last 6 Hours</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              onClick={fetchSensorData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
            
            <Button
              variant="contained"
              color="success"
              onClick={triggerDataFetch}
            >
              Fetch New Data
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            <strong>Data Points:</strong> {sensorData.length} | 
            <strong> Last Updated:</strong> {sensorData.length > 0 ? new Date(sensorData[sensorData.length - 1].timestamp).toLocaleString() : 'No data'}
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
                title: { text: `X-Axis Tilt - Node ${selectedNode}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'X-Axis Value', standoff: 15 } },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
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
                title: { text: `Y-Axis Tilt - Node ${selectedNode}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'Y-Axis Value', standoff: 15 } },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
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
                title: { text: `Z-Axis Tilt - Node ${selectedNode}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'Z-Axis Value', standoff: 15 } },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
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
                title: { text: `Combined Tilt Data - Node ${selectedNode}` },
                yaxis: { ...plotlyLayout.yaxis, title: { text: 'Axis Values', standoff: 15 } },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
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

export default Tiltmeter30846; 