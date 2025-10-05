import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { Box, Typography, CircularProgress, Button, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAdminContext } from '../context/AdminContext';
import { createCompleteRiskZones, getThresholdsFromSettings } from '../utils/graphZones';

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

const DynamicSeismograph: React.FC = () => {
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
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [syscomDeviceId, setSyscomDeviceId] = useState<string>('');

  // Get instrument ID from URL params or state
  const instrumentId = new URLSearchParams(location.search).get('instrument') || location.state?.instrumentId;

  useEffect(() => {
    if (!permissions.view_graph) {
      navigate('/dashboard');
      return;
    }
    
    if (instrumentId) {
      fetchInstrumentSettings();
      fetchProjectInfo();
    }
  }, [instrumentId, permissions.view_graph, navigate]);

  const fetchInstrumentSettings = async () => {
    if (!instrumentId) return;
    
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value, syscom_device_id')
        .eq('instrument_id', instrumentId)
        .single();

      if (error) {
        console.error('Error fetching instrument settings:', error);
        return;
      }
      
      setInstrumentSettings(data);
      
      // Set Syscom Device ID from database
      if (data.syscom_device_id) {
        setSyscomDeviceId(data.syscom_device_id.toString());
      }
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  const fetchProjectInfo = async () => {
    if (!instrumentId) return;
    
    try {
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id, instrument_name')
        .eq('instrument_id', instrumentId)
        .single();

      if (instrumentError) {
        console.error('Error fetching instrument project:', instrumentError);
        return;
      }

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
      setSelectedInstrument({
        instrument_id: instrumentId,
        instrument_name: instrumentData.instrument_name,
        project_id: instrumentData.project_id
      });
      
      fetchAvailableInstruments(projectData.id);
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  };

  const fetchAvailableInstruments = async (projectId: number) => {
    try {
      const { data: instrumentsData, error: instrumentsError } = await supabase
        .from('instruments')
        .select('instrument_id, instrument_name, project_id, instrument_location')
        .eq('project_id', projectId)
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

  const handleInstrumentChange = (newInstrumentId: string) => {
    const instrument = availableInstruments.find(inst => inst.instrument_id === newInstrumentId);
    if (instrument) {
      setSelectedInstrument(instrument);
      // Navigate to the new instrument's page
      navigate(`/dynamic-seismograph?instrument=${newInstrumentId}`, { 
        state: { project, instrumentId: newInstrumentId } 
      });
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

    // Process data similar to existing seismograph pages
    const combined = rawData.filter((entry: any) => {
      const x = Math.abs(Number(entry[1]));
      const y = Math.abs(Number(entry[2]));
      const z = Math.abs(Number(entry[3]));
      return x > 0.0001 || y > 0.0001 || z > 0.0001;
    });

    return {
      combined: {
        time: combined.map(entry => parseISO(entry[0])),
        x: combined.map(entry => parseFloat(Number(entry[1]).toFixed(3))),
        y: combined.map(entry => parseFloat(Number(entry[2]).toFixed(3))),
        z: combined.map(entry => parseFloat(Number(entry[3]).toFixed(3)))
      },
      x: {
        time: combined.map(entry => parseISO(entry[0])),
        values: combined.map(entry => parseFloat(Number(entry[1]).toFixed(3)))
      },
      y: {
        time: combined.map(entry => parseISO(entry[0])),
        values: combined.map(entry => parseFloat(Number(entry[2]).toFixed(3)))
      },
      z: {
        time: combined.map(entry => parseISO(entry[0])),
        values: combined.map(entry => parseFloat(Number(entry[3]).toFixed(3)))
      }
    };
  }, [rawData]);

  const fetchData = async () => {
    if (!fromDate || !toDate || !syscomDeviceId) {
      setError('Please enter a Syscom Device ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
      const startParam = formatDate(fromDate);
      const endParam = formatDate(toDate);

      const apiUrl = import.meta.env.DEV
        ? `/api/public-api/v1/records/background/${syscomDeviceId}/data?start=${startParam}&end=${endParam}`
        : `/api/fetchBackgroundData?start=${startParam}&end=${endParam}&instrumentId=${syscomDeviceId}`;

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
    const filtered = data.time
      .map((t, i) => ({ t, v: data.values[i] }))
      .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));

    if (filtered.length === 0) return null;

    // Create shapes and annotations for reference lines using the new utility
    const zones = instrumentSettings ? createCompleteRiskZones(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };

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
              Value: %{y:.3~f}<extra></extra>
            `,
            connectgaps: true
          }
        ]}
        layout={{
          title: { 
            text: `${project?.name || 'Project'} - Combined Vibration Data`, 
            font: { size: 20, weight: 700, color: '#003087' },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: {
            title: { 
              text: 'Time', 
              font: { size: 18, weight: 700, color: '#374151' },
              standoff: 20
            },
            type: 'date',
            tickformat: '<span style="font-size:18px;font-weight:700;">%m/%d</span><br><span style="font-size:12px;font-weight:700;">%H:%M</span>',
            gridcolor: '#f0f0f0',
            showgrid: true,
            tickfont: { size: 18, color: '#374151', weight: 700 },
            tickangle: 0,
            nticks: 6
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
            tickfont: { size: 16, color: '#374151', weight: 700 },
            tickformat: '.3~f',
            range: (() => {
              const range = getYAxisRange(filtered.map(pair => pair.v), getThresholdsFromSettings(instrumentSettings));
              return [range.min, range.max];
            })()
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
          height: 600,
          margin: { t: 60, b: 100, l: 110, r: 100 },
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
        style={{ width: '100%', height: 500 }}
        useResizeHandler={true}
      />
    );
  };

  const createCombinedPlot = (combined: { time: Date[]; x: number[]; y: number[]; z: number[] }) => {
    if (!combined.time.length) return null;

    // Create shapes and annotations for reference lines using the new utility
    const zones = instrumentSettings ? createCompleteRiskZones(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };

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
              Value: %{y:.3~f}<extra></extra>
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
              Value: %{y:.3~f}<extra></extra>
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
              Value: %{y:.3~f}<extra></extra>
            `,
            connectgaps: true
          }
        ]}
        layout={{
          title: { 
            text: 'Combined Vibration Data', 
            font: { size: 20, weight: 700, color: '#003087' },
            x: 0.5,
            xanchor: 'center'
          },
          xaxis: {
            title: { 
              text: 'Time', 
              font: { size: 18, weight: 700, color: '#374151' },
              standoff: 20
            },
            type: 'date',
            tickformat: '<span style="font-size:18px;font-weight:700;">%m/%d</span><br><span style="font-size:12px;font-weight:700;">%H:%M</span>',
            gridcolor: '#f0f0f0',
            showgrid: true,
            tickfont: { size: 18, color: '#374151', weight: 700 },
            tickangle: 0,
            nticks: 6
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
            tickfont: { size: 16, color: '#374151', weight: 700 },
            tickformat: '.3~f',
            range: (() => {
              const range = getYAxisRange(
                combined.x.concat(combined.y.concat(combined.z)), 
                getThresholdsFromSettings(instrumentSettings)
              );
              return [range.min, range.max];
            })()
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
          height: 600,
          margin: { t: 60, b: 100, l: 110, r: 100 },
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
        style={{ width: '100%', height: 650 }}
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
            {project && selectedInstrument ? `${project.name} - Seismograph Data Graphs (${selectedInstrument.instrument_id})` : 'Seismograph Data Graphs'}
          </Typography>
          
          {project && availableInstruments.length > 0 && (
            <Box mb={3} display="flex" justifyContent="center" alignItems="center" gap={3}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#003087' }}>
                Location: {selectedInstrument?.instrument_location || 'None'}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
                <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
                <Select
                  labelId="instrument-select-label"
                  value={selectedInstrument?.instrument_id || ''}
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
              <Button 
                variant="contained" 
                onClick={fetchData}
                disabled={loading || !fromDate || !toDate || !syscomDeviceId}
                sx={{ height: 40 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Load Data'}
              </Button>
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
                  {createSinglePlot(processedData.x, 'X', '#FF6384')}
                </Box>
              )}
              {processedData.y.values.length > 0 && (
                <Box mb={10} width="100%">
                  {createSinglePlot(processedData.y, 'Y', '#36A2EB')}
                </Box>
              )}
              {processedData.z.values.length > 0 && (
                <Box mb={10} width="100%">
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
              Enter Syscom Device ID, select a date range and click "Load Data" to view vibration data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                {project && selectedInstrument ? `${project.name} - Seismograph Reference Levels (${selectedInstrument.instrument_id})` : 'Seismograph Reference Levels'}
              </Typography>
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

export default DynamicSeismograph;
