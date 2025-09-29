import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';
import { useAdminContext } from '../context/AdminContext';
import { supabase } from '../supabase';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Alert,
  CircularProgress
} from '@mui/material';

interface Project {
  id: number;
  name: string;
}

const AddSyscomGraph: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | ''>('');
  const [instrumentName, setInstrumentName] = useState('');
  const [instrumentId, setInstrumentId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [syscomDeviceId, setSyscomDeviceId] = useState('');
  const [alertValue, setAlertValue] = useState('');
  const [warningValue, setWarningValue] = useState('');
  const [shutdownValue, setShutdownValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    fetchProjects();
  }, [isAdmin, navigate]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to fetch projects');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate required fields
      if (!selectedProject || !instrumentName || !instrumentId || !serialNumber || !syscomDeviceId) {
        throw new Error('Please fill in all required fields');
      }

      // Create instrument record in database
      const { error: instrumentError } = await supabase
        .from('instruments')
        .insert([{
          instrument_id: instrumentId,
          instrument_name: instrumentName,
          project_id: selectedProject,
          alert_value: alertValue ? parseFloat(alertValue) : null,
          warning_value: warningValue ? parseFloat(warningValue) : null,
          shutdown_value: shutdownValue ? parseFloat(shutdownValue) : null,
          sno: serialNumber,
          syscom_device_id: parseInt(syscomDeviceId),
          x_y_z_alert_values: null, // Set to null for seismograph instruments
          x_y_z_warning_values: null,
          x_y_z_shutdown_values: null,
          alert_emails: [],
          warning_emails: [],
          shutdown_emails: []
        }]);

      if (instrumentError) throw instrumentError;

      // Generate the seismograph page
      await generateSeismographPage();

      setSuccess('Seismograph graph page created successfully!');
      
      // Reset form
      setSelectedProject('');
      setInstrumentName('');
      setInstrumentId('');
      setSerialNumber('');
      setSyscomDeviceId('');
      setAlertValue('');
      setWarningValue('');
      setShutdownValue('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const generateSeismographPage = async () => {
    try {
      // Get project name for the generated page
      const project = projects.find(p => p.id === selectedProject);
      if (!project) throw new Error('Project not found');

      // Create a sanitized filename from instrument ID
      const sanitizedInstrumentId = instrumentId.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
      const pageFileName = `${sanitizedInstrumentId}-seismograph`;
      
      // Generate the seismograph page content
      const pageContent = generateSeismographPageContent(
        project.name,
        instrumentName,
        instrumentId,
        syscomDeviceId,
        alertValue,
        warningValue,
        shutdownValue
      );
      
      // Log the generated content for manual file creation
      console.log('Generated Seismograph Page Content:');
      console.log(pageContent);

      // Show success message with instructions
      setSuccess(`Seismograph page generated successfully! 
      
      Next steps:
      1. Create file: src/pages/${pageFileName}.tsx
      2. Add route: /${pageFileName} in Routes.tsx
      3. Update ProjectGraphs.tsx to include this instrument
      
      The page content has been logged to the console.`);
      
    } catch (err) {
      throw new Error(`Failed to generate seismograph page: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const generateSeismographPageContent = (
    projectName: string,
    instrumentName: string,
    instrumentId: string,
    syscomDeviceId: string,
    alertValue: string,
    warningValue: string,
    shutdownValue: string
  ) => {
    const componentName = instrumentId.replace(/[^a-zA-Z0-9]/g, '');
    
    return `import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { Box, Typography, CircularProgress, Button, Stack } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAdminContext } from '../context/AdminContext';

interface InstrumentSettings {
  alert_value: number;
  warning_value: number;
  shutdown_value: number;
}

interface Project {
  id: number;
  name: string;
}

const ${componentName}Seismograph: React.FC = () => {
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

  useEffect(() => {
    if (!permissions.view_graph) {
      navigate('/dashboard');
      return;
    }
    
    fetchInstrumentSettings();
    if (!location.state?.project) {
      fetchProjectInfo();
    }
  }, [location.state?.project, permissions.view_graph, navigate]);

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value')
        .eq('instrument_id', '${instrumentId}')
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
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id')
        .eq('instrument_id', '${instrumentId}')
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
    } catch (err) {
      console.error('Error fetching project info:', err);
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
        x: combined.map(entry => entry[1]),
        y: combined.map(entry => entry[2]),
        z: combined.map(entry => entry[3])
      },
      x: {
        time: combined.map(entry => parseISO(entry[0])),
        values: combined.map(entry => entry[1])
      },
      y: {
        time: combined.map(entry => parseISO(entry[0])),
        values: combined.map(entry => entry[2])
      },
      z: {
        time: combined.map(entry => parseISO(entry[0])),
        values: combined.map(entry => entry[3])
      }
    };
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
        ? \`/api/public-api/v1/records/background/${syscomDeviceId}/data?start=\${startParam}&end=\${endParam}\`
        : \`/api/fetchBackgroundData?start=\${startParam}&end=\${endParam}&instrumentId=${syscomDeviceId}\`;

      const response = await fetch(apiUrl, {
        headers: {
          ...(import.meta.env.DEV && {
            "x-scs-api-key": import.meta.env.VITE_SYSCOM_API_KEY
          }),
          "Accept": "application/json"
        }
      });

      if (!response.ok) throw new Error(\`HTTP error! Status: \${response.status}\`);

      const data = await response.json();
      setRawData(data.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? \`Failed to fetch background data: \${err.message}\`
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
            {project ? \`\${project.name} - Seismograph Data Graphs (${instrumentId})\` : 'Seismograph Data Graphs (${instrumentId})'}
          </Typography>
          
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
            </Stack>
          </LocalizationProvider>

          {error && (
            <Box mb={4}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {!loading && rawData.length === 0 && !error && (
            <Typography variant="body1" color="textSecondary">
              Select a date range and click "Load Data" to view vibration data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                {project ? \`\${project.name} - Seismograph Reference Levels (${instrumentId})\` : 'Seismograph Reference Levels (${instrumentId})'}
              </Typography>
              <Stack direction="row" spacing={3}>
                ${alertValue ? `<Typography variant="body2">
                  <span style={{ color: 'orange', fontWeight: 'bold' }}>Alert:</span> ±${alertValue} in/s
                </Typography>` : ''}
                ${warningValue ? `<Typography variant="body2">
                  <span style={{ color: 'red', fontWeight: 'bold' }}>Warning:</span> ±${warningValue} in/s
                </Typography>` : ''}
                ${shutdownValue ? `<Typography variant="body2">
                  <span style={{ color: 'darkred', fontWeight: 'bold' }}>Shutdown:</span> ±${shutdownValue} in/s
                </Typography>` : ''}
              </Stack>
            </Box>
          )}
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default ${componentName}Seismograph;`;
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton />
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
          <Typography variant="h4" align="center" gutterBottom>
            Add Syscom Graph from API
          </Typography>
          
          <Typography variant="body1" align="center" color="textSecondary" sx={{ mb: 4 }}>
            Create a new seismograph instrument graph page automatically
          </Typography>

          <Card>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <FormControl fullWidth required>
                    <InputLabel>Select Project</InputLabel>
                    <Select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value as number)}
                      label="Select Project"
                    >
                      {projects.map((project) => (
                        <MenuItem key={project.id} value={project.id}>
                          {project.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    required
                    label="Instrument Name"
                    value={instrumentName}
                    onChange={(e) => setInstrumentName(e.target.value)}
                    placeholder="e.g., SMG-4, Rock SMG-3"
                  />

                  <TextField
                    fullWidth
                    required
                    label="Instrument ID"
                    value={instrumentId}
                    onChange={(e) => setInstrumentId(e.target.value)}
                    placeholder="e.g., SMG-4, ROCK-SMG-3"
                  />

                  <TextField
                    fullWidth
                    required
                    label="Serial Number"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="e.g., SN001, 2024-001"
                    helperText="Unique serial number for this instrument"
                  />

                  <TextField
                    fullWidth
                    required
                    label="Syscom Device ID"
                    value={syscomDeviceId}
                    onChange={(e) => setSyscomDeviceId(e.target.value)}
                    placeholder="e.g., 15092, 15093"
                    helperText="Device ID used for background data API calls"
                  />

                  <Typography variant="h6" sx={{ mt: 2 }}>
                    Alert Thresholds (Optional)
                  </Typography>

                  <TextField
                    fullWidth
                    label="Alert Value"
                    type="number"
                    value={alertValue}
                    onChange={(e) => setAlertValue(e.target.value)}
                    placeholder="e.g., 0.1"
                    helperText="Alert threshold in in/s"
                  />

                  <TextField
                    fullWidth
                    label="Warning Value"
                    type="number"
                    value={warningValue}
                    onChange={(e) => setWarningValue(e.target.value)}
                    placeholder="e.g., 0.2"
                    helperText="Warning threshold in in/s"
                  />

                  <TextField
                    fullWidth
                    label="Shutdown Value"
                    type="number"
                    value={shutdownValue}
                    onChange={(e) => setShutdownValue(e.target.value)}
                    placeholder="e.g., 0.5"
                    helperText="Shutdown threshold in in/s"
                  />

                  {error && (
                    <Alert severity="error">{error}</Alert>
                  )}

                  {success && (
                    <Alert severity="success">{success}</Alert>
                  )}

                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ mt: 2 }}
                  >
                    {loading ? <CircularProgress size={24} /> : 'Create Seismograph Page'}
                  </Button>
                </Box>
              </form>
            </CardContent>
          </Card>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default AddSyscomGraph;
