import React, { useState, useEffect, useMemo } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import ChartWindow from '../components/ChartWindow';
import { Box, Typography, CircularProgress, Button, Stack, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAdminContext } from '../context/AdminContext';
import { createSeismographChartData, createSeismographCombinedChartData } from '../utils/seismographCharts';

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

const RockSmg2Seismograph: React.FC = () => {
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
        .eq('instrument_id', 'ROCKSMG-2')
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
      // First get the project_id for ROCKSMG-2
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id')
        .eq('instrument_id', 'ROCKSMG-2')
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

  const fetchData = async () => {
    if (!fromDate || !toDate) return;

    try {
      setLoading(true);
      setError(null);

      const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
      const startParam = formatDate(fromDate);
      const endParam = formatDate(toDate);

      const apiUrl = import.meta.env.DEV
        ? `/api/public-api/v1/records/background/16521/data?start=${startParam}&end=${endParam}`
        : `/api/fetchBackgroundData?start=${startParam}&end=${endParam}&instrumentId=16521`;

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
            {project ? `${project.name} - Seismograph Data Graphs (ROCKSMG-2)` : 'Seismograph Data Graphs (ROCKSMG-2)'}
          </Typography>
          
          {project && (
            <Box mb={3} display="flex" justifyContent="center" alignItems="center" gap={3}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#003087' }}>
                Location: {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location 
                  ? availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location 
                  : 'None'}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
                <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
                <Select
                  labelId="instrument-select-label"
                  value="ROCKSMG-2"
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
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', mt: 4 }}>
              <Typography variant="h5" gutterBottom>
                Open Charts in Separate Windows
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center' }}>
                {processedData.x.values.length > 0 && (() => {
                  const chartData = createSeismographChartData(processedData.x, 'X', '#FF6384', 'ROCKSMG-2', instrumentSettings, project, availableInstruments);
                  return chartData ? (
                    <ChartWindow
                      data={chartData.data}
                      layout={{
                        ...chartData.layout,
                        title: {
                          text: `${project?.name || 'Project'} - X Axis Vibration Data${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location ? ` - ${availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}` : ''}`,
                          font: { size: 20, weight: 700, color: '#003087' },
                          x: 0.5,
                          xanchor: 'center'
                        }
                      }}
                      config={chartData.config}
                      title="X Axis Vibration Data"
                      projectName={project?.name}
                      location={availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}
                    />
                  ) : null;
                })()}
                
                {processedData.y.values.length > 0 && (() => {
                  const chartData = createSeismographChartData(processedData.y, 'Y', '#36A2EB', 'ROCKSMG-2', instrumentSettings, project, availableInstruments);
                  return chartData ? (
                    <ChartWindow
                      data={chartData.data}
                      layout={{
                        ...chartData.layout,
                        title: {
                          text: `${project?.name || 'Project'} - Y Axis Vibration Data${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location ? ` - ${availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}` : ''}`,
                          font: { size: 20, weight: 700, color: '#003087' },
                          x: 0.5,
                          xanchor: 'center'
                        }
                      }}
                      config={chartData.config}
                      title="Y Axis Vibration Data"
                      projectName={project?.name}
                      location={availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}
                    />
                  ) : null;
                })()}
                
                {processedData.z.values.length > 0 && (() => {
                  const chartData = createSeismographChartData(processedData.z, 'Z', '#FFCE56', 'ROCKSMG-2', instrumentSettings, project, availableInstruments);
                  return chartData ? (
                    <ChartWindow
                      data={chartData.data}
                      layout={{
                        ...chartData.layout,
                        title: {
                          text: `${project?.name || 'Project'} - Z Axis Vibration Data${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location ? ` - ${availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}` : ''}`,
                          font: { size: 20, weight: 700, color: '#003087' },
                          x: 0.5,
                          xanchor: 'center'
                        }
                      }}
                      config={chartData.config}
                      title="Z Axis Vibration Data"
                      projectName={project?.name}
                      location={availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}
                    />
                  ) : null;
                })()}
                
                {(() => {
                  const chartData = createSeismographCombinedChartData(processedData.combined, 'ROCKSMG-2', instrumentSettings, project, availableInstruments);
                  return chartData ? (
                    <ChartWindow
                      data={chartData.data}
                      layout={{
                        ...chartData.layout,
                        title: {
                          text: `${project?.name || 'Project'} - Combined Vibration Data${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location ? ` - ${availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}` : ''}`,
                          font: { size: 20, weight: 700, color: '#003087' },
                          x: 0.5,
                          xanchor: 'center'
                        }
                      }}
                      config={chartData.config}
                      title="Combined Vibration Data"
                      projectName={project?.name}
                      location={availableInstruments.find(inst => inst.instrument_id === 'ROCKSMG-2')?.instrument_location}
                    />
                  ) : null;
                })()}
              </Box>
            </Box>
          )}

          {!loading && rawData.length === 0 && !error && (
            <Typography variant="body1" color="textSecondary">
              Select a date range and click "Load Data" to view vibration data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>{project ? `${project.name} - Seismograph Reference Levels (ROCKSMG-2)` : 'Seismograph Reference Levels (ROCKSMG-2)'}</Typography>
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

export default RockSmg2Seismograph;
