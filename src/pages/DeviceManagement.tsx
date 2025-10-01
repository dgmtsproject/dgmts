import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';
import { useAdminContext } from '../context/AdminContext';
import { supabase } from '../supabase';
import deviceReference from '../data/deviceReference.json';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  DeviceHub as DeviceIcon,
  InfoOutlined as InfoIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

interface SyscomDevice {
  id: number;
  name: string;
  serialNumber: number;
  active: boolean;
  lastCommunication: string;
  lastActiveStateChange: string;
  lastRecordPushed: string;
  firmwareVersion: string;
  model: string;
}

interface Instrument {
  instrument_id: string;
  instrument_name: string;
  project_id: number;
  syscom_device_id?: number;
  sno?: string;
  project_name?: string;
}

interface DeviceUsage {
  deviceId: number | string;
  deviceName: string;
  deviceType: 'syscom' | 'tiltmeter' | 'instantel' | 'other';
  instruments: Array<{
    instrumentId: string;
    instrumentName: string;
    projectName: string;
  }>;
  deviceInfo?: SyscomDevice | InstantelDevice;
}

interface InstantelDevice {
  deviceId: string;
  serialNumber: string;
  manufacturer: string;
  modelType: string;
  modelName: string;
  version: string;
  release: string;
  operatorName: string;
  calibrationDate: string;
  calibrationCompany: string;
  setupFileName: string;
  internal_10: number;
  internal_11: string;
  notes: {
    note1: string;
    note2: string;
    note3: string;
    note4: string;
    extendedNote1: string;
    extendedNote1Text: string;
    extendedNote2: string;
  };
  gpsLocation: {
    latitude: {
      degrees: number;
      minutes: number;
      direction: number;
    };
    longitude: {
      degrees: number;
      minutes: number;
      direction: number;
    };
  };
  status: string;
  lastSeen: string | null;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`device-tabpanel-${index}`}
      aria-labelledby={`device-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DeviceManagement: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Device data
  const [syscomDevices, setSyscomDevices] = useState<SyscomDevice[]>([]);
  const [allInstruments, setAllInstruments] = useState<Instrument[]>([]);
  const [deviceUsage, setDeviceUsage] = useState<DeviceUsage[]>([]);
  const [tiltmeterDevices, setTiltmeterDevices] = useState<DeviceUsage[]>([]);
  const [instantelDevices, setInstantelDevices] = useState<DeviceUsage[]>([]);
  const [otherDevices, setOtherDevices] = useState<DeviceUsage[]>([]);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    // Add a small delay to ensure component is fully mounted
    const timer = setTimeout(() => {
      fetchAllDeviceData();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAdmin, navigate]);

  // Debug: Log admin status
  useEffect(() => {
    console.log('DeviceManagement - isAdmin:', isAdmin);
  }, [isAdmin]);

  // Process device data when syscom devices or instruments change
  useEffect(() => {
    if (syscomDevices.length > 0 || allInstruments.length > 0) {
      console.log('Processing device data due to state change...');
      processDeviceData();
    }
  }, [syscomDevices, allInstruments]);

  const fetchAllDeviceData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch Syscom devices from API
      await fetchSyscomDevices();
      
      // Fetch all instruments from database
      await fetchAllInstruments();
      
      // Data processing will be handled by useEffect when state changes

    } catch (err) {
      console.error('Error fetching device data:', err);
      setError('Failed to fetch device information');
    } finally {
      setLoading(false);
    }
  };

  const fetchSyscomDevices = async () => {
    try {
      const apiUrl = import.meta.env.DEV
        ? '/api/public-api/v1/devices'
        : '/api/getDevices';
      
      const response = await fetch(apiUrl, {
        headers: {
          ...(import.meta.env.DEV && {
            "x-scs-api-key": import.meta.env.VITE_SYSCOM_API_KEY
          }),
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch Syscom devices: ${response.status}`);
      }

      const data = await response.json();
      const allDevices = data.devices || data; // Handle both response formats
      
      // Filter only devices with model "rock" (case-insensitive) - same as AddSyscomGraph
      const rockDevices = allDevices.filter((device: SyscomDevice) => 
        device.model && device.model.toLowerCase() === 'rock'
      );
      
      // Debug: Log available models if provided
      if (data.allModels) {
        console.log('Available device models:', data.allModels);
      } else {
        // Log models from client-side filtering
        const allModels = [...new Set(allDevices.map((device: SyscomDevice) => device.model))];
        console.log('Available device models:', allModels);
        console.log(`Found ${rockDevices.length} rock devices out of ${allDevices.length} total devices`);
      }
      
      setSyscomDevices(rockDevices);
      
      if (rockDevices.length === 0) {
        console.warn('No devices with model "rock" found. Available models:', data.allModels || 'Unknown');
      }
      
    } catch (err) {
      console.error('Error fetching Syscom devices:', err);
      // Don't throw error, just log it and continue with other data
    }
  };

  const fetchAllInstruments = async () => {
    try {
      const { data: instruments, error } = await supabase
        .from('instruments')
        .select(`
          instrument_id, 
          instrument_name, 
          project_id, 
          syscom_device_id,
          sno,
          Projects(name)
        `);

      if (error) throw error;

      const instrumentsWithProjectNames = instruments?.map(instrument => {
        let projectName = 'Unknown Project';
        if (instrument.Projects) {
          if (Array.isArray(instrument.Projects) && instrument.Projects.length > 0) {
            projectName = instrument.Projects[0].name || 'Unknown Project';
          } else if (typeof instrument.Projects === 'object' && 'name' in instrument.Projects) {
            projectName = (instrument.Projects as any).name || 'Unknown Project';
          }
        }
        return {
          ...instrument,
          project_name: projectName
        };
      }) || [];

      console.log('Fetched instruments:', instrumentsWithProjectNames);
      setAllInstruments(instrumentsWithProjectNames);
      
    } catch (err) {
      console.error('Error fetching instruments:', err);
      throw err;
    }
  };

  const processDeviceData = () => {
    console.log('Processing device data...');
    console.log('Syscom devices:', syscomDevices);
    console.log('All instruments:', allInstruments);
    
    // Process Syscom devices
    const syscomUsage: DeviceUsage[] = [];
    const tiltmeterUsage: DeviceUsage[] = [];
    const instantelUsage: DeviceUsage[] = [];
    const otherUsage: DeviceUsage[] = [];

    // First, add all Syscom devices (both used and unused)
    syscomDevices.forEach(device => {
      syscomUsage.push({
        deviceId: device.id,
        deviceName: device.name,
        deviceType: 'syscom',
        instruments: [],
        deviceInfo: device
      });
    });

    // Add Instantel devices from reference JSON
    deviceReference.deviceTypes.instantel.devices.forEach(device => {
      instantelUsage.push({
        deviceId: device.deviceId,
        deviceName: `${device.manufacturer} ${device.modelName} (${device.serialNumber})`,
        deviceType: 'instantel',
        instruments: [],
        deviceInfo: device
      });
    });

    // Add Tiltmeter devices from reference JSON
    deviceReference.deviceTypes.tiltmeter.devices.forEach(device => {
      tiltmeterUsage.push({
        deviceId: device.deviceId,
        deviceName: device.deviceName,
        deviceType: 'tiltmeter',
        instruments: []
      });
    });

    // Group instruments by device type
    allInstruments.forEach(instrument => {
      if (instrument.syscom_device_id) {
        // Syscom device - find existing device and add instrument
        const existingDevice = syscomUsage.find(d => d.deviceId === instrument.syscom_device_id);
        if (existingDevice) {
          existingDevice.instruments.push({
            instrumentId: instrument.instrument_id,
            instrumentName: instrument.instrument_name,
            projectName: instrument.project_name || 'Unknown Project'
          });
        }
      } else if (instrument.instrument_id.includes('TILT')) {
        // Tiltmeter device - find existing device and add instrument
        let deviceId: number;
        if (instrument.instrument_id.includes('TILT-')) {
          deviceId = parseInt(instrument.instrument_id.split('-')[1]) || 0;
        } else if (instrument.instrument_id.includes('TILTMETER-')) {
          deviceId = parseInt(instrument.instrument_id.split('-')[1]) || 0;
        } else {
          deviceId = 0;
        }
        
        const existingDevice = tiltmeterUsage.find(d => d.deviceId === deviceId);
        if (existingDevice) {
          existingDevice.instruments.push({
            instrumentId: instrument.instrument_id,
            instrumentName: instrument.instrument_name,
            projectName: instrument.project_name || 'Unknown Project'
          });
        }
      } else if (instrument.instrument_id.includes('INSTANTEL') || instrument.sno === 'UM15783') {
        // Instantel device - find existing device and add instrument
        const existingDevice = instantelUsage.find(d => d.deviceId === 'UM15783');
        if (existingDevice) {
          existingDevice.instruments.push({
            instrumentId: instrument.instrument_id,
            instrumentName: instrument.instrument_name,
            projectName: instrument.project_name || 'Unknown Project'
          });
        }
      } else {
        // Other devices (using serial number or instrument ID)
        const deviceId = instrument.sno ? parseInt(instrument.sno) : instrument.instrument_id.charCodeAt(0);
        const existingDevice = otherUsage.find(d => d.deviceId === deviceId);
        
        if (existingDevice) {
          existingDevice.instruments.push({
            instrumentId: instrument.instrument_id,
            instrumentName: instrument.instrument_name,
            projectName: instrument.project_name || 'Unknown Project'
          });
        } else {
          otherUsage.push({
            deviceId: deviceId,
            deviceName: instrument.instrument_name,
            deviceType: 'other',
            instruments: [{
              instrumentId: instrument.instrument_id,
              instrumentName: instrument.instrument_name,
              projectName: instrument.project_name || 'Unknown Project'
            }]
          });
        }
      }
    });

    console.log('Processed syscom usage:', syscomUsage);
    console.log('Processed tiltmeter usage:', tiltmeterUsage);
    console.log('Processed instantel usage:', instantelUsage);
    console.log('Processed other usage:', otherUsage);

    setDeviceUsage(syscomUsage);
    setTiltmeterDevices(tiltmeterUsage);
    setInstantelDevices(instantelUsage);
    setOtherDevices(otherUsage);
  };

  const getDeviceStatusColor = (device: DeviceUsage) => {
    if (device.deviceType === 'syscom' && device.deviceInfo && 'active' in device.deviceInfo) {
      return device.deviceInfo.active ? 'success' : 'error';
    }
    if (device.deviceType === 'instantel' && device.deviceInfo && 'status' in device.deviceInfo) {
      return device.deviceInfo.status === 'active' ? 'success' : 'error';
    }
    return 'default';
  };

  const getDeviceStatusText = (device: DeviceUsage) => {
    if (device.deviceType === 'syscom' && device.deviceInfo && 'active' in device.deviceInfo) {
      return device.deviceInfo.active ? 'Active' : 'Inactive';
    }
    if (device.deviceType === 'instantel' && device.deviceInfo && 'status' in device.deviceInfo) {
      return device.deviceInfo.status === 'active' ? 'Active' : 'Inactive';
    }
    return 'Unknown';
  };

  const filteredDevices = (devices: DeviceUsage[]) => {
    if (!searchTerm) return devices;
    
    return devices.filter(device => 
      device.deviceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.deviceId.toString().includes(searchTerm) ||
      device.instruments.some(inst => 
        inst.instrumentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.projectName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const renderDeviceTable = (devices: DeviceUsage[]) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Device ID</TableCell>
            <TableCell>Device Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Model/Firmware</TableCell>
            <TableCell>Used By Instruments</TableCell>
            <TableCell>Last Communication</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredDevices(devices).map((device) => (
            <TableRow key={`${device.deviceType}-${device.deviceId}`}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {device.deviceId}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {device.deviceName}
                </Typography>
              </TableCell>
              <TableCell>
                <Chip 
                  label={device.deviceType.toUpperCase()} 
                  size="small"
                  color={device.deviceType === 'syscom' ? 'primary' : 
                         device.deviceType === 'tiltmeter' ? 'secondary' : 'default'}
                />
              </TableCell>
              <TableCell>
                <Chip 
                  label={getDeviceStatusText(device)}
                  size="small"
                  color={getDeviceStatusColor(device) as any}
                />
              </TableCell>
              <TableCell>
                {device.deviceInfo ? (
                  <Box>
                    {device.deviceType === 'syscom' && 'model' in device.deviceInfo ? (
                      <>
                        <Typography variant="caption" display="block">
                          Model: {device.deviceInfo.model}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Firmware: {device.deviceInfo.firmwareVersion}
                        </Typography>
                      </>
                    ) : device.deviceType === 'instantel' && 'modelType' in device.deviceInfo ? (
                      <>
                        <Typography variant="caption" display="block">
                          Model: {device.deviceInfo.modelType}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Version: {device.deviceInfo.version}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Serial: {device.deviceInfo.serialNumber}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="caption" display="block">
                        N/A
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    N/A
                  </Typography>
                )}
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {device.instruments.length > 0 ? (
                    device.instruments.map((instrument, index) => (
                      <Tooltip key={index} title={`Project: ${instrument.projectName}`}>
                        <Chip
                          label={instrument.instrumentName}
                          size="small"
                          variant="outlined"
                          color="primary"
                        />
                      </Tooltip>
                    ))
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      Not linked
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                {device.deviceInfo && 'lastCommunication' in device.deviceInfo && device.deviceInfo.lastCommunication ? (
                  <Typography variant="caption">
                    {new Date(device.deviceInfo.lastCommunication).toLocaleString()}
                  </Typography>
                ) : (
                  <Typography variant="caption" color="textSecondary">
                    N/A
                  </Typography>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton />
        <Box sx={{ maxWidth: 1400, mx: 'auto', mt: 2, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" gutterBottom>
                Device Management
              </Typography>
              <Typography variant="body1" color="textSecondary">
                View and manage all device IDs across different instrument types
              </Typography>
              <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                Debug: isAdmin = {isAdmin ? 'true' : 'false'} | Syscom: {syscomDevices.length} | Tiltmeter: {tiltmeterDevices.length} | Instantel: {instantelDevices.length} | Other: {otherDevices.length}
              </Typography>
            </Box>
            <Tooltip title="Refresh device data">
              <IconButton onClick={fetchAllDeviceData} disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Device Overview</Typography>
                <TextField
                  size="small"
                  placeholder="Search devices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ width: 300 }}
                />
              </Box>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="primary.contrastText">
                    {deviceUsage.length}
                  </Typography>
                  <Typography variant="body2" color="primary.contrastText">
                    Syscom Devices
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="secondary.contrastText">
                    {tiltmeterDevices.length}
                  </Typography>
                  <Typography variant="body2" color="secondary.contrastText">
                    Tiltmeter Devices
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                  <Typography variant="h4" color="success.contrastText">
                    {instantelDevices.length}
                  </Typography>
                  <Typography variant="body2" color="success.contrastText">
                    Instantel Devices
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'grey.300', borderRadius: 1 }}>
                  <Typography variant="h4" color="text.primary">
                    {otherDevices.length}
                  </Typography>
                  <Typography variant="body2" color="text.primary">
                    Other Devices
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={tabValue} onChange={handleTabChange} aria-label="device tabs">
                <Tab 
                  label={`Syscom Devices (${deviceUsage.length})`} 
                  icon={<DeviceIcon />}
                  iconPosition="start"
                />
                <Tab 
                  label={`Tiltmeter Devices (${tiltmeterDevices.length})`} 
                  icon={<DeviceIcon />}
                  iconPosition="start"
                />
                <Tab 
                  label={`Instantel Devices (${instantelDevices.length})`} 
                  icon={<DeviceIcon />}
                  iconPosition="start"
                />
                <Tab 
                  label={`Other Devices (${otherDevices.length})`} 
                  icon={<DeviceIcon />}
                  iconPosition="start"
                />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Syscom Devices (Rock Models)
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Devices connected to the Syscom API for seismograph data collection
                </Typography>
                {loading && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption">Loading devices...</Typography>
                  </Box>
                )}
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderDeviceTable(deviceUsage)
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Tiltmeter Devices
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Tiltmeter instruments with device IDs extracted from instrument names
                </Typography>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderDeviceTable(tiltmeterDevices)
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Instantel Devices
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Instantel Micromate devices with detailed specifications
                </Typography>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderDeviceTable(instantelDevices)
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Other Devices
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Other instruments and devices not categorized as Syscom, Tiltmeter, or Instantel
                </Typography>
              </Box>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                renderDeviceTable(otherDevices)
              )}
            </TabPanel>
          </Card>

          <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              <InfoIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Device Information
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              • <strong>Syscom Devices:</strong> Connected to Syscom API for real-time seismograph data collection
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              • <strong>Tiltmeter Devices:</strong> Tiltmeter instruments with device IDs extracted from instrument names (e.g., TILT-142939)
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              • <strong>Instantel Devices:</strong> Instantel Micromate devices with detailed specifications and calibration data
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              • <strong>Other Devices:</strong> Instruments that don't fall into the above categories
            </Typography>
            <Typography variant="body2" color="textSecondary">
              • <strong>Status:</strong> Active devices are currently communicating with the system
            </Typography>
          </Box>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default DeviceManagement;
