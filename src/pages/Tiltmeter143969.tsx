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
  Select,
  Tooltip
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { supabase } from '../supabase';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAdminContext } from '../context/AdminContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { createReferenceLinesOnly, getThresholdsFromSettings } from '../utils/graphZones';

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

interface TimedReferenceValue {
  id?: number;
  instrument_id: string;
  start_time: string;
  end_time: string | null;
  reference_x_value: number | null;
  reference_y_value: number | null;
  reference_z_value: number | null;
  created_at?: string;
  is_saved?: boolean; // Track if saved to database
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
  
  // Time-based reference values
  const [timedReferenceValues, setTimedReferenceValues] = useState<TimedReferenceValue[]>([]);
  const [newTimedReference, setNewTimedReference] = useState<Partial<TimedReferenceValue>>({
    start_time: '',
    end_time: '',
    reference_x_value: null,
    reference_y_value: null,
    reference_z_value: null
  });
  const [editingTimedReference, setEditingTimedReference] = useState<TimedReferenceValue | null>(null);
  const [showTimedReferenceForm, setShowTimedReferenceForm] = useState(false);
  const [savingTimedReferences, setSavingTimedReferences] = useState(false);
  const [project, setProject] = useState<Project | null>(location.state?.project || null);
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);
  const nodeId = 143969; // Hardcoded node ID
  const INSTRUMENT_ID = 'TILT-143969';
  const [downloadMenuAnchor, setDownloadMenuAnchor] = useState<null | HTMLElement>(null);
  const [downloadingRaw, setDownloadingRaw] = useState(false);

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
        .in('instrument_id', ['SMG1', 'SMG-1', 'SMG-2', 'SMG-3', 'TILT-142939', 'TILT-143969', 'TILTMETER-30846'])
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
    } else if (instrumentId === 'SMG-1') {
      navigate('/dynamic-seismograph?instrument=SMG-1', { state: { project } });
    } else if (instrumentId === 'SMG-2') {
      navigate('/anc-seismograph', { state: { project } });
    } else if (instrumentId === 'SMG-3') {
      navigate('/smg3-seismograph', { state: { project } });
    } else if (instrumentId === 'TILT-142939') {
      navigate('/tiltmeter-142939', { state: { project } });
    } else if (instrumentId === 'TILT-143969') {
      navigate('/tiltmeter-143969', { state: { project } });
    } else if (instrumentId === 'TILTMETER-30846') {
      navigate('/tiltmeter-30846', { state: { project } });
    }
  };

  const fetchSensorData = async () => {
    if (!fromDate || !toDate) return;
    
    setLoading(true);
    try {
      // Fetch raw data from sensor_readings table
      const { data: rawData, error } = await supabase
        .from('sensor_readings')
        .select('*')
        .eq('node_id', nodeId)
        .gte('timestamp', fromDate.toISOString())
        .lte('timestamp', toDate.toISOString())
        .order('timestamp', { ascending: true })
        .limit(1000);

      if (error) throw error;

      // Apply calibration if reference values are enabled
      const calibratedData = applyCalibration(rawData || []);
      setSensorData(calibratedData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to fetch sensor data: ${errorMessage}`);
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Apply calibration to raw sensor data
  const applyCalibration = (rawData: SensorData[]): SensorData[] => {
    if (!referenceValues.enabled) {
      return rawData; // Return raw data if calibration is disabled
    }

    return rawData.map(dataPoint => {
      const timestamp = new Date(dataPoint.timestamp);
      
      // Find applicable time-based reference value
      const applicableTimedRef = timedReferenceValues.find(ref => {
        const startTime = new Date(ref.start_time);
        const endTime = ref.end_time ? new Date(ref.end_time) : null;
        return timestamp >= startTime && (!endTime || timestamp < endTime);
      });

      let calibratedX = dataPoint.x_value;
      let calibratedY = dataPoint.y_value;
      let calibratedZ = dataPoint.z_value;

      if (applicableTimedRef) {
        // Apply time-based reference values
        if (applicableTimedRef.reference_x_value !== null) {
          calibratedX = dataPoint.x_value - applicableTimedRef.reference_x_value;
        }

        if (applicableTimedRef.reference_y_value !== null) {
          calibratedY = dataPoint.y_value - applicableTimedRef.reference_y_value;
        }

        if (applicableTimedRef.reference_z_value !== null) {
          calibratedZ = dataPoint.z_value - applicableTimedRef.reference_z_value;
        }
      }
      // If no time-based reference applies, return raw data (no calibration)

      return {
        ...dataPoint,
        x_value: calibratedX,
        y_value: calibratedY,
        z_value: calibratedZ
      };
    });
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
      }
    } catch (error) {
      console.error('Error fetching reference values:', error);
      toast.error('Failed to load reference values');
    }
  };

  // Fetch time-based reference values from database
  const fetchTimedReferenceValues = async () => {
    try {
      const { data, error } = await supabase
        .from('time_based_reference_values')
        .select('*')
        .eq('instrument_id', 'TILT-143969')
        .order('from_date', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedData: TimedReferenceValue[] = data.map(item => ({
          id: item.id,
          instrument_id: item.instrument_id,
          start_time: item.from_date,
          end_time: item.to_date,
          reference_x_value: item.x_reference_value,
          reference_y_value: item.y_reference_value,
          reference_z_value: item.z_reference_value,
          created_at: item.created_at,
          is_saved: true
        }));
        setTimedReferenceValues(mappedData);
      }
    } catch (error) {
      console.error('Error fetching timed reference values:', error);
      toast.error('Failed to load time-based reference values');
    }
  };

  // Add a new timed reference value (in-memory, not saved until user clicks Save)
  const addTimedReferenceValue = () => {
    if (!newTimedReference.start_time) {
      toast.error('Please specify a start time');
      return;
    }

    // Check if at least one reference value is provided
    if (newTimedReference.reference_x_value === null && 
        newTimedReference.reference_y_value === null && 
        newTimedReference.reference_z_value === null) {
      toast.error('Please specify at least one reference value (X, Y, or Z)');
      return;
    }

    const newRef: TimedReferenceValue = {
      id: Date.now(), // Use timestamp as temporary ID for unsaved items
      instrument_id: 'TILT-143969',
      start_time: newTimedReference.start_time!,
      end_time: newTimedReference.end_time || null,
      reference_x_value: newTimedReference.reference_x_value ?? null,
      reference_y_value: newTimedReference.reference_y_value ?? null,
      reference_z_value: newTimedReference.reference_z_value ?? null,
      is_saved: false
    };

    setTimedReferenceValues(prev => [...prev, newRef].sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ));

    toast.success('Timed reference value added. Click "Save All" to persist.');
    setShowTimedReferenceForm(false);
    setNewTimedReference({
      start_time: '',
      end_time: '',
      reference_x_value: null,
      reference_y_value: null,
      reference_z_value: null
    });

    // Refresh data if loaded
    if (sensorData.length > 0) {
      fetchSensorData();
    }
  };

  // Update an existing timed reference value (in-memory)
  const updateTimedReferenceValue = () => {
    if (!editingTimedReference) return;

    setTimedReferenceValues(prev => 
      prev.map(ref => ref.id === editingTimedReference.id ? { ...editingTimedReference, is_saved: false } : ref)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    );

    toast.success('Timed reference value updated. Click "Save All" to persist.');
    setEditingTimedReference(null);

    // Refresh data if loaded
    if (sensorData.length > 0) {
      fetchSensorData();
    }
  };

  // Delete a timed reference value (in-memory, will be deleted from DB on save)
  const deleteTimedReferenceValue = (id: number) => {
    if (!window.confirm('Are you sure you want to delete this timed reference value?')) return;

    setTimedReferenceValues(prev => prev.filter(ref => ref.id !== id));
    toast.success('Timed reference value removed. Click "Save All" to persist changes.');

    // Refresh data if loaded
    if (sensorData.length > 0) {
      fetchSensorData();
    }
  };

  // Helper function to format date as local datetime string (without timezone conversion)
  const formatLocalDateTime = (dateString: string | null): string | null => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  };

  // Save all timed reference values to database
  const saveTimedReferenceValues = async () => {
    if (!window.confirm('This will save all time-based reference values to the database. Continue?')) return;

    setSavingTimedReferences(true);
    try {
      // First, delete all existing records for this instrument
      const { error: deleteError } = await supabase
        .from('time_based_reference_values')
        .delete()
        .eq('instrument_id', 'TILT-143969');

      if (deleteError) throw deleteError;

      // Then insert all current values (prevents duplicates)
      if (timedReferenceValues.length > 0) {
        const dataToInsert = timedReferenceValues.map(ref => ({
          instrument_id: 'TILT-143969',
          from_date: formatLocalDateTime(ref.start_time),
          to_date: formatLocalDateTime(ref.end_time),
          x_reference_value: ref.reference_x_value,
          y_reference_value: ref.reference_y_value,
          z_reference_value: ref.reference_z_value
        }));

        const { error: insertError } = await supabase
          .from('time_based_reference_values')
          .insert(dataToInsert);

        if (insertError) throw insertError;
      }

      // Refresh from database to get actual IDs
      await fetchTimedReferenceValues();
      
      toast.success('Time-based reference values saved successfully');
      
      // Refresh data if loaded
      if (sensorData.length > 0) {
        await fetchSensorData();
      }
    } catch (error) {
      console.error('Error saving timed reference values:', error);
      toast.error('Failed to save time-based reference values');
    } finally {
      setSavingTimedReferences(false);
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
    fetchTimedReferenceValues();
  }, []);

  // Prepare data for charts
  const timestamps = sensorData.map(d => new Date(d.timestamp));
  
  // Data is already calibrated by the applyCalibration function
  // It applies time-based reference values (if applicable) or falls back to global reference values
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
    height: 550,
    margin: { t: 60, b: 100, l: 80, r: 80 },
    title: {
      font: { size: 20, weight: 700, color: '#1f2937' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { 
        text: `Time<br><span style="font-size:12px;color:#666;">${INSTRUMENT_ID}</span>`, 
        font: { size: 16, weight: 700, color: '#374151' },
        standoff: 20
      },
      type: 'date' as const,
      tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 14, color: '#374151', weight: 700 },
      tickangle: 0,
      nticks: 10,
      tickmode: 'linear' as const,
      dtick: 'D1',
      tick0: 'D1'
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
      tickfont: { size: 14, color: '#374151', weight: 700 }
    },
    showlegend: true,
    legend: {
      x: 0.02,
      xanchor: 'left',
      y: -0.30,
      yanchor: 'top',
      orientation: 'h' as const,
      font: { size: 12, weight: 700 },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#CCC',
      borderwidth: 1,
      traceorder: 'normal' as const
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
    return createReferenceLinesOnly(thresholds);
  }

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
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
            }
            #chart {
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
          </style>
        </head>
        <body>
          <div id="chart"></div>
          <script>
            const data = ${JSON.stringify(chartData)};
            const layout = ${JSON.stringify(layout)};
            const config = ${JSON.stringify(config)};
            Plotly.newPlot('chart', data, layout, config);
          </script>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };
  
  // Axis-specific thresholds for legend display
  const thresholdsX = instrumentSettings ? getThresholdsFromSettings(instrumentSettings, 'x') : {} as any;
  const thresholdsY = instrumentSettings ? getThresholdsFromSettings(instrumentSettings, 'y') : {} as any;
  const thresholdsZ = instrumentSettings ? getThresholdsFromSettings(instrumentSettings, 'z') : {} as any;

  const xChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'X-Axis(°)',
      line: { color: COLORS.x, width: 1.5 },
      hovertemplate: AXIS_HOVERTEMPLATE('X'),
      connectgaps: true,
    },
    ...(thresholdsX?.alert ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Alert (${thresholdsX.alert} °)`,
      line: { color: 'orange', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholdsX?.warning ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Warning (${thresholdsX.warning} °)`,
      line: { color: 'red', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholdsX?.shutdown ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Shutdown (${thresholdsX.shutdown} °)`,
      line: { color: 'darkred', width: 3, dash: 'solid' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : [])
  ];
  const yChartData = [
    {
      x: timestamps,
      y: yValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Y-Axis(°)',
      line: { color: COLORS.y, width: 1.5 },
      hovertemplate: AXIS_HOVERTEMPLATE('Y'),
      connectgaps: true,
    },
    ...(thresholdsY?.alert ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Alert (${thresholdsY.alert} °)`,
      line: { color: 'orange', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholdsY?.warning ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Warning (${thresholdsY.warning} °)`,
      line: { color: 'red', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholdsY?.shutdown ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Shutdown (${thresholdsY.shutdown} °)`,
      line: { color: 'darkred', width: 3, dash: 'solid' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : [])
  ];
  const zChartData = [
    {
      x: timestamps,
      y: zValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Z-Axis(°)',
      line: { color: COLORS.z, width: 1.5 },
      hovertemplate: AXIS_HOVERTEMPLATE('Z'),
      connectgaps: true,
    },
    ...(thresholdsZ?.alert ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Alert (${thresholdsZ.alert} °)`,
      line: { color: 'orange', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholdsZ?.warning ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Warning (${thresholdsZ.warning} °)`,
      line: { color: 'red', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholdsZ?.shutdown ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Shutdown (${thresholdsZ.shutdown} °)`,
      line: { color: 'darkred', width: 3, dash: 'solid' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : [])
  ];

  const handleDownloadExcel = async (type: 'raw' | 'calibrated') => {
    try {
      let dataToExport: any[] = [];
      
      if (type === 'raw') {
        setDownloadingRaw(true);
        // Fetch raw data directly from sensor_readings table
        const startDate = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = toDate || new Date();

        const { data: rawData, error } = await supabase
          .from('sensor_readings')
          .select('*')
          .eq('node_id', nodeId)
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: true })
          .limit(2000);

        if (error) throw error;

        dataToExport = (rawData || []).map((d: SensorData) => ({
          Time: d.timestamp,
          X: d.x_value,
          Y: d.y_value,
          Z: d.z_value,
        }));
      } else if (type === 'calibrated') {
        // For calibrated data, fetch fresh raw data and apply calibration
        const startDate = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const endDate = toDate || new Date();

        const { data: rawData, error } = await supabase
          .from('sensor_readings')
          .select('*')
          .eq('node_id', nodeId)
          .gte('timestamp', startDate.toISOString())
          .lte('timestamp', endDate.toISOString())
          .order('timestamp', { ascending: true })
          .limit(2000);

        if (error) throw error;

        // Apply calibration to the fresh raw data
        const calibratedData = applyCalibration(rawData || []);
        
        dataToExport = calibratedData.map(d => ({
          Time: d.timestamp,
          X: d.x_value,
          Y: d.y_value,
          Z: d.z_value,
        }));
      }
      
      const ws = XLSX.utils.json_to_sheet(dataToExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, type === 'raw' ? 'Raw Data' : 'Calibrated Data');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, `tiltmeter-${nodeId}-${type}-data.xlsx`);
      
      toast.success(`${type === 'raw' ? 'Raw' : 'Calibrated'} data downloaded successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to download ${type} data: ${errorMessage}`);
      console.error(`Error downloading ${type} data:`, error);
    } finally {
      setDownloadingRaw(false);
    }
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
                Location: {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location 
                  ? availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location 
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
                <MenuItem 
                  onClick={() => { handleDownloadExcel('raw'); setDownloadMenuAnchor(null); }}
                  disabled={downloadingRaw}
                >
                  {downloadingRaw ? (
                    <>
                      <CircularProgress size={16} sx={{ mr: 1 }} />
                      Downloading Raw Data...
                    </>
                  ) : (
                    'Raw Data'
                  )}
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
          </Box>

          {/* Time-Based Reference Values Section */}
          {referenceValues.enabled && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Time-Based Reference Values
              </Typography>
              {isAdmin && timedReferenceValues.length > 0 && (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={saveTimedReferenceValues}
                  disabled={savingTimedReferences}
                  startIcon={savingTimedReferences ? <CircularProgress size={16} /> : null}
                >
                  {savingTimedReferences ? 'Saving...' : 'Save All'}
                </Button>
              )}
            </Box>
            
            <Alert severity="info" sx={{ mb: 2 }}>
              <strong>Note:</strong> Time-based reference values are used for calibration. Enable reference values above to activate this feature. 
              Click "Save All" to persist your changes to the database.
            </Alert>
            
            {!isAdmin && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Contact an administrator to manage time-based reference values.
              </Alert>
            )}

            {/* List of existing timed reference values */}
            {timedReferenceValues.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                  Configured Time Periods:
                </Typography>
                {timedReferenceValues.map((timed) => (
                  <Paper key={timed.id} sx={{ p: 2, mb: 2, bgcolor: 'white', border: timed.is_saved ? '1px solid #e0e0e0' : '2px solid #ff9800' }}>
                    {editingTimedReference?.id === timed.id && editingTimedReference ? (
                      // Edit mode
                      <Box>
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <Stack spacing={2}>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <DateTimePicker
                                label="Start Time"
                                value={editingTimedReference.start_time ? new Date(editingTimedReference.start_time) : null}
                                onChange={(date) => {
                                  if (date) {
                                    setEditingTimedReference({
                                      ...editingTimedReference,
                                      start_time: date.toISOString()
                                    });
                                  }
                                }}
                                slotProps={{ textField: { size: 'small' } }}
                              />
                              <DateTimePicker
                                label="End Time (Optional)"
                                value={editingTimedReference.end_time ? new Date(editingTimedReference.end_time) : null}
                                onChange={(date) => {
                                  setEditingTimedReference({
                                    ...editingTimedReference,
                                    end_time: date ? date.toISOString() : null
                                  });
                                }}
                                minDateTime={editingTimedReference.start_time ? new Date(editingTimedReference.start_time) : undefined}
                                slotProps={{ textField: { size: 'small' } }}
                              />
                            </Stack>
                            <Stack direction="row" spacing={2} alignItems="center">
                              <TextField
                                label="Reference X"
                                type="number"
                                value={editingTimedReference.reference_x_value || ''}
                                onChange={(e) => {
                                  if (editingTimedReference) {
                                    setEditingTimedReference({
                                      ...editingTimedReference,
                                      reference_x_value: e.target.value ? parseFloat(e.target.value) : null
                                    });
                                  }
                                }}
                                size="small"
                                inputProps={{ step: "any" }}
                              />
                              <TextField
                                label="Reference Y"
                                type="number"
                                value={editingTimedReference.reference_y_value || ''}
                                onChange={(e) => {
                                  if (editingTimedReference) {
                                    setEditingTimedReference({
                                      ...editingTimedReference,
                                      reference_y_value: e.target.value ? parseFloat(e.target.value) : null
                                    });
                                  }
                                }}
                                size="small"
                                inputProps={{ step: "any" }}
                              />
                              <TextField
                                label="Reference Z"
                                type="number"
                                value={editingTimedReference.reference_z_value || ''}
                                onChange={(e) => {
                                  if (editingTimedReference) {
                                    setEditingTimedReference({
                                      ...editingTimedReference,
                                      reference_z_value: e.target.value ? parseFloat(e.target.value) : null
                                    });
                                  }
                                }}
                                size="small"
                                inputProps={{ step: "any" }}
                              />
                            </Stack>
                            <Stack direction="row" spacing={2}>
                              <Button
                                variant="contained"
                                color="primary"
                                onClick={updateTimedReferenceValue}
                                size="small"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outlined"
                                onClick={() => setEditingTimedReference(null)}
                                size="small"
                              >
                                Cancel
                              </Button>
                            </Stack>
                          </Stack>
                        </LocalizationProvider>
                      </Box>
                    ) : (
                      // View mode
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box sx={{ flex: 1 }}>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="body2">
                              <strong>Period:</strong> {new Date(timed.start_time).toLocaleString()} 
                              {timed.end_time ? ` → ${new Date(timed.end_time).toLocaleString()}` : ' → (till now)'}
                            </Typography>
                            {!timed.is_saved && (
                              <Box 
                                sx={{ 
                                  bgcolor: '#ff9800', 
                                  color: 'white', 
                                  px: 1, 
                                  py: 0.25, 
                                  borderRadius: 1, 
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                UNSAVED
                              </Box>
                            )}
                          </Stack>
                          <Typography variant="body2">
                            <strong>Reference Values:</strong> 
                            {timed.reference_x_value !== null ? ` X=${timed.reference_x_value.toFixed(6)}` : ''}
                            {timed.reference_y_value !== null ? ` Y=${timed.reference_y_value.toFixed(6)}` : ''}
                            {timed.reference_z_value !== null ? ` Z=${timed.reference_z_value.toFixed(6)}` : ''}
                            {timed.reference_x_value === null && timed.reference_y_value === null && timed.reference_z_value === null ? ' None specified' : ''}
                          </Typography>
                        </Box>
                        {isAdmin && (
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => setEditingTimedReference(timed)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => timed.id && deleteTimedReferenceValue(timed.id)}
                            >
                              Delete
                            </Button>
                          </Stack>
                        )}
                      </Stack>
                    )}
                  </Paper>
                ))}
              </Box>
            )}

            {/* Add new timed reference value form */}
            {isAdmin && (
              <>
                {!showTimedReferenceForm ? (
                  <Button
                    variant="outlined"
                    onClick={() => setShowTimedReferenceForm(true)}
                    sx={{ mb: 2 }}
                  >
                    + Add Time-Based Reference Value
                  </Button>
                ) : (
                  <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 1, border: '1px solid #ddd' }}>
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
                      Add New Time-Based Reference Value
                    </Typography>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <Stack spacing={2}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <DateTimePicker
                            label="Start Time *"
                            value={newTimedReference.start_time ? new Date(newTimedReference.start_time) : null}
                            onChange={(date) => {
                              setNewTimedReference({
                                ...newTimedReference,
                                start_time: date ? date.toISOString() : ''
                              });
                            }}
                            slotProps={{ textField: { size: 'small', required: true } }}
                          />
                          <DateTimePicker
                            label="End Time (Optional)"
                            value={newTimedReference.end_time ? new Date(newTimedReference.end_time) : null}
                            onChange={(date) => {
                              setNewTimedReference({
                                ...newTimedReference,
                                end_time: date ? date.toISOString() : ''
                              });
                            }}
                            minDateTime={newTimedReference.start_time ? new Date(newTimedReference.start_time) : undefined}
                            slotProps={{ textField: { size: 'small' } }}
                          />
                        </Stack>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <TextField
                            label="Reference X Value (Optional)"
                            type="number"
                            value={newTimedReference.reference_x_value ?? ''}
                            onChange={(e) => setNewTimedReference({
                              ...newTimedReference,
                              reference_x_value: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            size="small"
                            inputProps={{ step: "any" }}
                            helperText="Leave blank to skip X-axis calibration"
                          />
                          <TextField
                            label="Reference Y Value (Optional)"
                            type="number"
                            value={newTimedReference.reference_y_value ?? ''}
                            onChange={(e) => setNewTimedReference({
                              ...newTimedReference,
                              reference_y_value: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            size="small"
                            inputProps={{ step: "any" }}
                            helperText="Leave blank to skip Y-axis calibration"
                          />
                          <TextField
                            label="Reference Z Value (Optional)"
                            type="number"
                            value={newTimedReference.reference_z_value ?? ''}
                            onChange={(e) => setNewTimedReference({
                              ...newTimedReference,
                              reference_z_value: e.target.value ? parseFloat(e.target.value) : null
                            })}
                            size="small"
                            inputProps={{ step: "any" }}
                            helperText="Leave blank to skip Z-axis calibration"
                          />
                        </Stack>
                        <Alert severity="info">
                          <strong>Note:</strong> Specify at least one reference value. Leave any axis blank to use raw data for that axis. If no end time is specified, this reference value will apply from the start time onwards until another period begins.
                        </Alert>
                        <Stack direction="row" spacing={2}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={addTimedReferenceValue}
                          >
                            Add Reference Value
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              setShowTimedReferenceForm(false);
                              setNewTimedReference({
                                start_time: '',
                                end_time: '',
                                reference_x_value: null,
                                reference_y_value: null,
                                reference_z_value: null
                              });
                            }}
                          >
                            Cancel
                          </Button>
                        </Stack>
                      </Stack>
                    </LocalizationProvider>
                  </Box>
                )}
              </>
            )}
          </Box>
          )}
        </Paper>

        {/* Individual Charts in order: X, Y, Z */}
        {sensorData.length > 0 ? (
          <>
            {/* X-Axis Chart */}
            <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" gutterBottom>
                  X-Axis Tilt (Channel 0)
                </Typography>
                <Tooltip title="Open in Popup">
                  <Button
                    startIcon={<OpenInNew />}
                    onClick={() => {
                      const chartConfig = {
                        responsive: true,
                        displayModeBar: true,
                        scrollZoom: true,
                        displaylogo: false,
                      };
                      const chartLayout = {
                        ...plotlyLayout,
                        title: { 
                          text: `${project ? project.name + ' - ' : ''}X-Axis Tilt - Node ${nodeId} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location : 'Location: None'}`,
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
                      };
                      openChartInWindow(
                        `X-Axis Tilt - Node ${nodeId}`,
                        xChartData,
                        chartLayout,
                        chartConfig,
                        availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location
                      );
                    }}
                    variant="outlined"
                    size="small"
                  >
                    Open in Popup
                  </Button>
                </Tooltip>
              </Box>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <Plot
                  data={xChartData}
                  layout={{
                    ...plotlyLayout,
                    title: { 
                      text: `${project ? project.name + ' - ' : ''}X-Axis Tilt - Node ${nodeId} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location : 'Location: None'}`,
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
                  style={{ width: '100%', height: 550 }}
                  useResizeHandler={true}
                />
              </div>
            </Paper>
            {/* Y-Axis Chart */}
            <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" gutterBottom>
                  Y-Axis Tilt (Channel 1)
                </Typography>
                <Tooltip title="Open in Popup">
                  <Button
                    startIcon={<OpenInNew />}
                    onClick={() => {
                      const chartConfig = {
                        responsive: true,
                        displayModeBar: true,
                        scrollZoom: true,
                        displaylogo: false,
                      };
                      const chartLayout = {
                        ...plotlyLayout,
                        title: { 
                          text: `${project ? project.name + ' - ' : ''}Y-Axis Tilt - Node ${nodeId} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location : 'Location: None'}`,
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
                      };
                      openChartInWindow(
                        `Y-Axis Tilt - Node ${nodeId}`,
                        yChartData,
                        chartLayout,
                        chartConfig,
                        availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location
                      );
                    }}
                    variant="outlined"
                    size="small"
                  >
                    Open in Popup
                  </Button>
                </Tooltip>
              </Box>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <Plot
                  data={yChartData}
                  layout={{
                    ...plotlyLayout,
                    title: { 
                      text: `${project ? project.name + ' - ' : ''}Y-Axis Tilt - Node ${nodeId} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location : 'Location: None'}`,
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
                  style={{ width: '100%', height: 550 }}
                  useResizeHandler={true}
                />
              </div>
            </Paper>
            {/* Z-Axis Chart */}
            <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" gutterBottom>
                  Z-Axis Tilt (Channel 2)
                </Typography>
                <Tooltip title="Open in Popup">
                  <Button
                    startIcon={<OpenInNew />}
                    onClick={() => {
                      const chartConfig = {
                        responsive: true,
                        displayModeBar: true,
                        scrollZoom: true,
                        displaylogo: false,
                      };
                      const chartLayout = {
                        ...plotlyLayout,
                        title: { 
                          text: `${project ? project.name + ' - ' : ''}Z-Axis Tilt - Node ${nodeId} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location : 'Location: None'}`,
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
                      };
                      openChartInWindow(
                        `Z-Axis Tilt - Node ${nodeId}`,
                        zChartData,
                        chartLayout,
                        chartConfig,
                        availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location
                      );
                    }}
                    variant="outlined"
                    size="small"
                  >
                    Open in Popup
                  </Button>
                </Tooltip>
              </Box>
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <Plot
                  data={zChartData}
                  layout={{
                    ...plotlyLayout,
                    title: { 
                      text: `${project ? project.name + ' - ' : ''}Z-Axis Tilt - Node ${nodeId} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILT-143969')?.instrument_location : 'Location: None'}`,
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
                  style={{ width: '100%', height: 550 }}
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