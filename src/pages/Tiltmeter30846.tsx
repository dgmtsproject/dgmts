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

interface SensorData {
  id: number;
  node_id: number;
  timestamp: string;
  x_value: number;
  y_value: number;
  z_value: number;
  created_at: string;
}

const Tiltmeter30846: React.FC = () => {
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<number>(142939);
  const [timeRange, setTimeRange] = useState<string>('24h');

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

  useEffect(() => {
    fetchSensorData();
  }, [selectedNode, timeRange]);

  // Prepare data for charts
  const timestamps = sensorData.map(d => new Date(d.timestamp));
  const xValues = sensorData.map(d => d.x_value);
  const yValues = sensorData.map(d => d.y_value);
  const zValues = sensorData.map(d => d.z_value);

  const chartLayout = {
    autosize: true,
    margin: { l: 50, r: 50, t: 50, b: 50 },
    showlegend: true,
    xaxis: { title: { text: 'Time' } },
    yaxis: { title: { text: 'Tilt (degrees)' } },
    height: 400,
  };

  const xChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'X-Axis (Channel 0)',
      line: { color: '#ff6384' },
      marker: { size: 4 }
    }
  ];

  const yChartData = [
    {
      x: timestamps,
      y: yValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Y-Axis (Channel 1)',
      line: { color: '#36a2eb' },
      marker: { size: 4 }
    }
  ];

  const zChartData = [
    {
      x: timestamps,
      y: zValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Z-Axis (Channel 2)',
      line: { color: '#ffce56' },
      marker: { size: 4 }
    }
  ];

  const combinedChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'X-Axis (Channel 0)',
      line: { color: '#ff6384' },
      marker: { size: 4 }
    },
    {
      x: timestamps,
      y: yValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Y-Axis (Channel 1)',
      line: { color: '#36a2eb' },
      marker: { size: 4 }
    },
    {
      x: timestamps,
      y: zValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'Z-Axis (Channel 2)',
      line: { color: '#ffce56' },
      marker: { size: 4 }
    }
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

        {/* Combined Chart */}
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Combined X, Y, Z Tilt Data
          </Typography>
          <Plot
            data={combinedChartData}
            layout={{
              ...chartLayout,
              title: { text: `Combined Tilt Data - Node ${selectedNode}` },
              height: 500
            }}
            style={{ width: '100%' }}
            useResizeHandler={true}
          />
        </Paper>

        {/* Individual Charts */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: 3 }}>
          {/* X-Axis Chart */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              X-Axis Tilt (Channel 0)
            </Typography>
            <Plot
              data={xChartData}
              layout={{
                ...chartLayout,
                title: { text: `X-Axis Tilt - Node ${selectedNode}` },
                yaxis: { title: { text: 'Tilt (degrees)' } }
              }}
              style={{ width: '100%' }}
              useResizeHandler={true}
            />
          </Paper>

          {/* Y-Axis Chart */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Y-Axis Tilt (Channel 1)
            </Typography>
            <Plot
              data={yChartData}
              layout={{
                ...chartLayout,
                title: { text: `Y-Axis Tilt - Node ${selectedNode}` },
                yaxis: { title: { text: 'Tilt (degrees)' } }
              }}
              style={{ width: '100%' }}
              useResizeHandler={true}
            />
          </Paper>

          {/* Z-Axis Chart */}
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Z-Axis Tilt (Channel 2)
            </Typography>
            <Plot
              data={zChartData}
              layout={{
                ...chartLayout,
                title: { text: `Z-Axis Tilt - Node ${selectedNode}` },
                yaxis: { title: { text: 'Tilt (degrees)' } }
              }}
              style={{ width: '100%' }}
              useResizeHandler={true}
            />
          </Paper>
        </Box>
      </MainContentWrapper>
      <ToastContainer />
    </>
  );
};

export default Tiltmeter30846; 