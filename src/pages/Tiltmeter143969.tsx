import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';
import { 
  Typography, 
  CircularProgress,
  Button,
  Box,
  Paper,
  Stack,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  Alert,
  FormControl,
  InputLabel,
  Select
} from '@mui/material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabase';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAdminContext } from '../context/AdminContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createCompleteRiskZones, getThresholdsFromSettings } from '../utils/graphZones';

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
  x_y_z_alert_values?: { x: number; y: number; z: number } | null;
  x_y_z_warning_values?: { x: number; y: number; z: number } | null;
  x_y_z_shutdown_values?: { x: number; y: number; z: number } | null;
}

interface ReferenceValues {
  enabled: boolean;
  reference_x_value: number | null;
  reference_y_value: number | null;
  reference_z_value: number | null;
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

const Tiltmeter143969: React.FC = () => {
  const { isAdmin, permissions } = useAdminContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);
  const [referenceValues, setReferenceValues] = useState<ReferenceValues>({
    enabled: false,
    reference_x_value: null,
    reference_y_value: null,
    reference_z_value: null
  });
  const [tempReferenceValues, setTempReferenceValues] = useState({
    reference_x_value: '',
    reference_y_value: '',
    reference_z_value: ''
  });
  const [savingReference, setSavingReference] = useState(false);
  const [project, setProject] = useState<Project | null>(location.state?.project || null);
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);
  const nodeId = 143969; // Hardcoded node ID
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);

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

  const fetchProjectInfo = async () => {
    try {
      // First get the project_id for this tiltmeter (using node_id to find instrument)
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id')
        .eq('instrument_id', 'TILT-143969')
        .single();

      if (instrumentError) {
        console.error('Error fetching instrument project:', instrumentError);
        return;
      }

      if (!instrumentData || !instrumentData.project_id) {
        console.error('No project_id found for instrument TILT-143969');
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
      // Get all instruments for this project that have graph pages
      const { data, error } = await supabase
        .from('instruments')
        .select('instrument_id, instrument_name, project_id, instrument_location')
        .eq('project_id', projectId)
        .in('instrument_id', ['SMG1', 'SMG-2', 'SMG-3', 'TILT-142939', 'TILT-143969'])
        .order('instrument_id');

      if (error) {
        console.error('Error fetching available instruments:', error);
        return;
      }

      setAvailableInstruments(data || []);
    } catch (err) {
      console.error('Error fetching available instruments:', err);
    }
  };

  const handleInstrumentChange = (instrumentId: string) => {
    if (instrumentId === 'SMG1') {
      navigate('/background', { state: { project } });
    } else if (instrumentId === 'SMG-2') {
      navigate('/anc-seismograph', { state: { project } });
    } else if (instrumentId === 'SMG-3') {
      navigate('/smg3-seismograph', { state: { project } });
    } else if (instrumentId === 'TILT-142939') {
      navigate('/tiltmeter-142939', { state: { project } });
    } else if (instrumentId === 'TILT-143969') {
      navigate('/tiltmeter-143969', { state: { project } });
    }
  };

  const fetchSensorData = async () => {
    if (!fromDate || !toDate) return;
    
    setLoading(true);
    try {
      // Format fromDate as start of day in local timezone
      const formatDate = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      
      // For fromDate, use start of day (00:00:00)
      const startParam = `${formatDate(fromDate)}T00:00:00`;
      
      // For toDate, use end of day (23:59:59) to include all data for that day
      const endParam = `${formatDate(toDate)}T23:59:59`;

      const response = await fetch(
        `${API_BASE_URL}/api/sensor-data/${nodeId}?start_time=${startParam}&end_time=${endParam}&limit=1000`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      setSensorData(data.reverse()); // Reverse to show chronological order
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to fetch sensor data: ${errorMessage}`);
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value, x_y_z_alert_values, x_y_z_warning_values, x_y_z_shutdown_values')
        .eq('instrument_id', 'TILT-143969')
        .single();
      if (error) throw error;
      setInstrumentSettings(data);
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  // Fetch reference values from database
  const fetchReferenceValues = async () => {
    try {
      const { data, error } = await supabase
        .from('reference_values')
        .select('*')
        .eq('instrument_id', 'TILT-143969')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        throw error;
      }

      if (data) {
        setReferenceValues({
          enabled: data.enabled || false,
          reference_x_value: data.reference_x_value,
          reference_y_value: data.reference_y_value,
          reference_z_value: data.reference_z_value
        });
        
        setTempReferenceValues({
          reference_x_value: data.reference_x_value?.toString() || '',
          reference_y_value: data.reference_y_value?.toString() || '',
          reference_z_value: data.reference_z_value?.toString() || ''
        });
      }
    } catch (error) {
      console.error('Error fetching reference values:', error);
      toast.error('Failed to load reference values');
    }
  };

  // Save reference values to database
  const saveReferenceValues = async () => {
    setSavingReference(true);
    try {
      const valuesToSave = {
        instrument_id: 'TILT-143969',
        enabled: referenceValues.enabled,
        reference_x_value: tempReferenceValues.reference_x_value ? parseFloat(tempReferenceValues.reference_x_value) : null,
        reference_y_value: tempReferenceValues.reference_y_value ? parseFloat(tempReferenceValues.reference_y_value) : null,
        reference_z_value: tempReferenceValues.reference_z_value ? parseFloat(tempReferenceValues.reference_z_value) : null
      };

      const { error } = await supabase
        .from('reference_values')
        .update({
          enabled: referenceValues.enabled,
          reference_x_value: tempReferenceValues.reference_x_value ? parseFloat(tempReferenceValues.reference_x_value) : null,
          reference_y_value: tempReferenceValues.reference_y_value ? parseFloat(tempReferenceValues.reference_y_value) : null,
          reference_z_value: tempReferenceValues.reference_z_value ? parseFloat(tempReferenceValues.reference_z_value) : null
        })
        .eq('instrument_id', 'TILT-143969');

      if (error) throw error;

      // Update local state
      setReferenceValues({
        enabled: referenceValues.enabled,
        reference_x_value: valuesToSave.reference_x_value,
        reference_y_value: valuesToSave.reference_y_value,
        reference_z_value: valuesToSave.reference_z_value
      });

      toast.success('Reference values updated successfully');
      
      // Refresh data to show updated values
      if (sensorData.length > 0) {
        await fetchSensorData();
      }
    } catch (error) {
      console.error('Error saving reference values:', error);
      toast.error('Failed to save reference values');
    } finally {
      setSavingReference(false);
    }
  };

  // Save only the enabled/disabled state
  const saveEnabledState = async (enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('reference_values')
        .update({ enabled })
        .eq('instrument_id', 'TILT-143969');

      if (error) throw error;

      // Update local state
      setReferenceValues(prev => ({ ...prev, enabled }));

      toast.success(`Reference values ${enabled ? 'enabled' : 'disabled'} successfully`);
      
      // Refresh data to show updated values
      if (sensorData.length > 0) {
        await fetchSensorData();
      }
    } catch (error) {
      console.error('Error saving enabled state:', error);
      toast.error('Failed to update reference values state');
      // Revert the checkbox state on error
      setReferenceValues(prev => ({ ...prev, enabled: !enabled }));
    }
  };

  useEffect(() => {
    fetchInstrumentSettings();
    fetchReferenceValues();
  }, []);

  // Prepare data for charts
  const timestamps = sensorData.map(d => new Date(d.timestamp));
  
  // The backend API already applies reference values when enabled, so we don't need to subtract again
  // If reference values are enabled, the data from API is already calibrated
  // If reference values are disabled, we use raw data as is
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
    margin: { t: 60, b: 100, l: 110, r: 100 },
    title: {
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
      type: 'date' as const,
      tickformat: '<span style="font-size:18px;font-weight:700;">%m/%d</span><br><span style="font-size:12px;font-weight:700;">%H:%M</span>',
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 18, color: '#374151', weight: 700 },
      tickangle: 0,
      nticks: 6
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
      tickfont: { size: 18, color: '#374151', weight: 700 }
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
      borderwidth: 2,
    } as any,
    hovermode: 'closest' as const,
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
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

  function getReferenceShapesAndAnnotations(axis: 'x' | 'y' | 'z' = 'x') {
    if (!instrumentSettings) return { shapes: [], annotations: [] };
    
    // Get thresholds for the specific axis
    const thresholds = getThresholdsFromSettings(instrumentSettings, axis);
    
    // Create colored zones and threshold lines
    return createCompleteRiskZones(thresholds);
  }

  const xChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines+markers' as const,
      name: 'X-Axis(°)',
      line: { color: COLORS.x, width: 1.5 },
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
      name: 'Y-Axis(°)',
      line: { color: COLORS.y, width: 1.5 },
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
      name: 'Z-Axis(°)',
      line: { color: COLORS.z, width: 1.5 },
      marker: { size: 6, color: COLORS.z },
      hovertemplate: AXIS_HOVERTEMPLATE('Z'),
      connectgaps: true,
    },
  ];

  const handleDownloadExcel = (type: 'raw' | 'calibrated') => {
    let dataToExport: any[] = [];
    if (type === 'raw') {
      dataToExport = sensorData.map(d => ({
        Time: d.timestamp,
        X: d.x_value,
        Y: d.y_value,
        Z: d.z_value,
      }));
    } else if (type === 'calibrated') {
      dataToExport = sensorData.map(d => ({
        Time: d.timestamp,
        X: d.x_value, // Already calibrated by backend API
        Y: d.y_value, // Already calibrated by backend API
        Z: d.z_value, // Already calibrated by backend API
      }));
    }
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'raw' ? 'Raw Data' : 'Calibrated Data');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `tiltmeter-${nodeId}-${type}-data.xlsx`);
  };



  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton  />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
        <Typography variant="h4" gutterBottom>
          {project ? `${project.name} - Tiltmeter Data Graphs (Node-143969)` : 'Tiltmeter-Node-143969 - Data Graphs'}
        </Typography>

        {project && (
          <Box mb={3} display="flex" justifyContent="center" alignItems="center" gap={3}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#003087' }}>
              Location: {availableInstruments.length > 0 && availableInstruments[0].instrument_location 
                ? availableInstruments[0].instrument_location 
                : 'None'}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
              <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
              <Select
                labelId="instrument-select-label"
                value="TILT-143969"
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

          {/* Download Excel Section */}
          {permissions.download_graph && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                id="download-excel-button"
                aria-controls="download-excel-menu"
                aria-haspopup="true"
                onClick={(e) => setDownloadMenuAnchor(e.currentTarget)}
                sx={{ mr: 2 }}
              >
                Download Excel
              </Button>
              <Menu
                id="download-excel-menu"
                anchorEl={downloadMenuAnchor}
                open={Boolean(downloadMenuAnchor)}
                onClose={() => setDownloadMenuAnchor(null)}
              >
                <MenuItem onClick={() => { handleDownloadExcel('raw'); setDownloadMenuAnchor(null); }}>
                  Raw Data
                </MenuItem>
                {permissions.download_graph && (
                  <MenuItem onClick={() => { handleDownloadExcel('calibrated'); setDownloadMenuAnchor(null); }}>
                    Calibrated Data
                    {!referenceValues.enabled && (
                      <Typography variant="caption" color="error" sx={{ ml: 1 }}>
                        (Enable and add reference values to get calibrated data)
                      </Typography>
                    )}
                  </MenuItem>
                )}
              </Menu>
            </Box>
          )}
          
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Data Points:</strong> {sensorData.length} | 
            <strong> Last Updated:</strong> {sensorData.length > 0 ? new Date(sensorData[sensorData.length - 1].timestamp).toLocaleString() : 'No data'}
            {referenceValues.enabled && (
              <span style={{ color: 'green', fontWeight: 'bold' }}>
                {' | Reference values enabled'}
              </span>
            )}
          </Typography>

          {/* Reference Values Section */}
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={referenceValues.enabled}
                  onChange={async (e) => {
                    if (!isAdmin) return;
                    await saveEnabledState(e.target.checked);
                  }}
                  disabled={!isAdmin}
                />
              }
              label="Enable Reference Values"
            />
            
            {referenceValues.enabled && (
              <Box sx={{ mt: 2 }}>
                {!isAdmin && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Reference values are enabled. Contact an administrator to modify these values.
                  </Alert>
                )}
                
                <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="center">
                  <TextField
                    label="Reference X Value"
                    type="number"
                    value={tempReferenceValues.reference_x_value}
                    onChange={(e) => {
                      if (!isAdmin) return;
                      setTempReferenceValues(prev => ({ ...prev, reference_x_value: e.target.value }));
                    }}
                    size="small"
                    sx={{ width: 150 }}
                    disabled={!isAdmin}
                    inputProps={{ step: "any" }}
                  />
                  <TextField
                    label="Reference Y Value"
                    type="number"
                    value={tempReferenceValues.reference_y_value}
                    onChange={(e) => {
                      if (!isAdmin) return;
                      setTempReferenceValues(prev => ({ ...prev, reference_y_value: e.target.value }));
                    }}
                    size="small"
                    sx={{ width: 150 }}
                    disabled={!isAdmin}
                    inputProps={{ step: "any" }}
                  />
                  <TextField
                    label="Reference Z Value"
                    type="number"
                    value={tempReferenceValues.reference_z_value}
                    onChange={(e) => {
                      if (!isAdmin) return;
                      setTempReferenceValues(prev => ({ ...prev, reference_z_value: e.target.value }));
                    }}
                    size="small"
                    sx={{ width: 150 }}
                    disabled={!isAdmin}
                    inputProps={{ step: "any" }}
                  />
                  {isAdmin && (
                    <Button
                      variant="contained"
                      onClick={saveReferenceValues}
                      disabled={savingReference}
                      startIcon={savingReference ? <CircularProgress size={16} /> : null}
                    >
                      {savingReference ? 'Saving...' : 'Update Reference Values'}
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Box>
        </Paper>

        {/* Individual Charts in order: X, Y, Z */}
        {sensorData.length > 0 ? (
          <>
            {/* X-Axis Chart */}
            <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
              <Typography variant="h6" gutterBottom>
                X-Axis Tilt (Channel 0)
              </Typography>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <Plot
                  data={xChartData}
                  layout={{
                    ...plotlyLayout,
                    title: { 
                      text: `X-Axis Tilt - Node ${nodeId}`,
                      font: { size: 20, weight: 700, color: '#1f2937' },
                      x: 0.5,
                      xanchor: 'center'
                    },
                    yaxis: { 
                      ...plotlyLayout.yaxis, 
                      title: { 
                        text: 'X-Axis Value (°)', 
                        standoff: 15,
                        font: { size: 16, weight: 700, color: '#374151' }
                      },
                      range: (() => {
                        const range = getYAxisRange(xValues, getThresholdsFromSettings(instrumentSettings, 'x'));
                        return [range.min, range.max];
                      })()
                    },
                    ...getReferenceShapesAndAnnotations('x'),
                  }}
                  config={{ responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false }}
                  style={{ width: '100%' }}
                  useResizeHandler={true}
                />
              </div>
            </Paper>
            {/* Y-Axis Chart */}
            <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
              <Typography variant="h6" gutterBottom>
                Y-Axis Tilt (Channel 1)
              </Typography>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <Plot
                  data={yChartData}
                  layout={{
                    ...plotlyLayout,
                    title: { 
                      text: `Y-Axis Tilt - Node ${nodeId}`,
                      font: { size: 20, weight: 700, color: '#1f2937' },
                      x: 0.5,
                      xanchor: 'center'
                    },
                    yaxis: { 
                      ...plotlyLayout.yaxis, 
                      title: { 
                        text: 'Y-Axis Value (°)', 
                        standoff: 15,
                        font: { size: 16, weight: 700, color: '#374151' }
                      },
                      range: (() => {
                        const range = getYAxisRange(yValues, getThresholdsFromSettings(instrumentSettings, 'y'));
                        return [range.min, range.max];
                      })()
                    },
                    ...getReferenceShapesAndAnnotations('y'),
                  }}
                  config={{ responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false }}
                  style={{ width: '100%' }}
                  useResizeHandler={true}
                />
              </div>
            </Paper>
            {/* Z-Axis Chart */}
            <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
              <Typography variant="h6" gutterBottom>
                Z-Axis Tilt (Channel 2)
              </Typography>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <Plot
                  data={zChartData}
                  layout={{
                    ...plotlyLayout,
                    title: { 
                      text: `Z-Axis Tilt - Node ${nodeId}`,
                      font: { size: 20, weight: 700, color: '#1f2937' },
                      x: 0.5,
                      xanchor: 'center'
                    },
                    yaxis: { 
                      ...plotlyLayout.yaxis, 
                      title: { 
                        text: 'Z-Axis Value (°)', 
                        standoff: 15,
                        font: { size: 16, weight: 700, color: '#374151' }
                      },
                      range: (() => {
                        const range = getYAxisRange(zValues, getThresholdsFromSettings(instrumentSettings, 'z'));
                        return [range.min, range.max];
                      })()
                    },
                    ...getReferenceShapesAndAnnotations('z'),
                  }}
                  config={{ responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false }}
                  style={{ width: '100%' }}
                  useResizeHandler={true}
                />
              </div>
            </Paper>
          </>
        ) : (
          <Paper elevation={3} sx={{ p: 3, mb: 3, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary" sx={{ py: 4 }}>
              {loading ? 'Loading data...' : 'Click "Load Data" to view tiltmeter graphs'}
            </Typography>
          </Paper>
        )}
      </MainContentWrapper>
    </>
  );
};

export default Tiltmeter143969;