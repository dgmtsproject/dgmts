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
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { toast } from 'react-toastify';
import { getMicromateDeviceFolder } from '../utils/instrumentRoutes';
import {
  getOwnershipLabel,
  normalizeInstrumentOwnership,
  defaultOwnershipForInstrument,
  InstrumentOwnership,
  INSTRUMENT_OWNERSHIP_OPTIONS,
} from '../utils/instrumentOwnership';
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
  instrument_id_second?: string | null;
  instrument_name: string;
  project_id: number;
  syscom_device_id?: number;
  sno?: string;
  ownership?: string | null;
  project_name?: string;
  instrument_location?: string;
  alert_value?: number | null;
  warning_value?: number | null;
  shutdown_value?: number | null;
  alert_emails?: string[] | null;
  warning_emails?: string[] | null;
  shutdown_emails?: string[] | null;
  x_y_z_alert_values?: { x: number | null; y: number | null; z: number | null } | null;
  x_y_z_warning_values?: { x: number | null; y: number | null; z: number | null } | null;
  x_y_z_shutdown_values?: { x: number | null; y: number | null; z: number | null } | null;
  duration_seconds?: number | null;
  duration_alert_value?: number | null;
  duration_warning_value?: number | null;
  duration_shutdown_value?: number | null;
  duration_alert_emails?: string[] | null;
  duration_warning_emails?: string[] | null;
  duration_shutdown_emails?: string[] | null;
  x_y_z_duration_alert_values?: { x: number | null; y: number | null; z: number | null } | null;
  x_y_z_duration_warning_values?: { x: number | null; y: number | null; z: number | null } | null;
  x_y_z_duration_shutdown_values?: { x: number | null; y: number | null; z: number | null } | null;
}

interface DeviceUsage {
  deviceId: number | string;
  /** Preferred display identifier — unique serial number when available. */
  serialNumber: string;
  deviceName: string;
  deviceType: 'syscom' | 'tiltmeter' | 'instantel' | 'other';
  /** Owned / Rental from linked instrument(s). */
  ownership: InstrumentOwnership | null;
  instruments: Array<{
    instrumentId: string;
    instrumentName: string;
    serialNumber: string;
    ownership: InstrumentOwnership;
    projectId: number;
    projectName: string;
    instrumentLocation: string;
  }>;
  deviceInfo?: SyscomDevice | InstantelDevice;
}

type Project = {
  id: number;
  name: string;
};

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [moveInstrumentId, setMoveInstrumentId] = useState<string | null>(null);
  const [moveSourceProjectId, setMoveSourceProjectId] = useState<number | null>(null);
  const [targetProjectId, setTargetProjectId] = useState<number | ''>('');
  const [movingInstrumentId, setMovingInstrumentId] = useState<string | null>(null);
  const [updatingOwnershipId, setUpdatingOwnershipId] = useState<string | null>(null);

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
      await fetchProjects();
      
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

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
    }
  };

  const handleOpenMoveDialog = (instrumentId: string, projectId: number) => {
    setMoveInstrumentId(instrumentId);
    setMoveSourceProjectId(projectId);
    setTargetProjectId('');
  };

  const handleEditInstrument = (instrumentId: string) => {
    const instrument = allInstruments.find((item) => item.instrument_id === instrumentId);
    if (!instrument) {
      toast.error('Instrument not found');
      return;
    }

    if (
      instrument.instrument_id === 'TILT-142939' ||
      instrument.instrument_id === 'TILT-143969' ||
      instrument.instrument_id.includes('TILT')
    ) {
      navigate('/edit-tiltmeter-instrument', { state: { instrument } });
    } else {
      navigate('/edit-instrument', { state: { instrument } });
    }
  };

  const handleOwnershipChange = async (
    instrumentId: string,
    ownership: InstrumentOwnership
  ) => {
    setUpdatingOwnershipId(instrumentId);
    try {
      const { error } = await supabase
        .from('instruments')
        .update({ ownership })
        .eq('instrument_id', instrumentId);

      if (error) {
        if (error.message.includes('ownership')) {
          toast.error(
            'Ownership column missing. Run supabase/add_instrument_ownership.sql in Supabase first.'
          );
        } else {
          toast.error(`Failed to update status: ${error.message}`);
        }
        return;
      }

      setAllInstruments((prev) =>
        prev.map((item) =>
          item.instrument_id === instrumentId ? { ...item, ownership } : item
        )
      );
      toast.success(`Instrument marked as ${getOwnershipLabel(ownership)}`);
    } catch (err) {
      console.error('Error updating instrument ownership:', err);
      toast.error('Failed to update instrument status');
    } finally {
      setUpdatingOwnershipId(null);
    }
  };

  const handleCloseMoveDialog = () => {
    setMoveInstrumentId(null);
    setMoveSourceProjectId(null);
    setTargetProjectId('');
  };

  const handleMoveInstrument = async () => {
    if (!moveInstrumentId || !targetProjectId || !moveSourceProjectId) {
      toast.error('Please select a target project');
      return;
    }

    if (targetProjectId === moveSourceProjectId) {
      toast.error('Instrument is already in this project');
      return;
    }

    setMovingInstrumentId(moveInstrumentId);
    try {
      const { error } = await supabase
        .from('instruments')
        .update({ project_id: targetProjectId })
        .eq('instrument_id', moveInstrumentId);

      if (error) {
        toast.error(`Failed to move instrument: ${error.message}`);
        return;
      }

      const targetProject = projects.find((project) => project.id === targetProjectId);
      toast.success(
        `Moved ${moveInstrumentId} to ${targetProject?.name || 'selected project'}`
      );
      handleCloseMoveDialog();
      await fetchAllInstruments();
    } catch (err) {
      console.error('Error moving instrument:', err);
      toast.error('Failed to move instrument');
    } finally {
      setMovingInstrumentId(null);
    }
  };

  const fetchAllInstruments = async () => {
    try {
      const { data: instruments, error } = await supabase
        .from('instruments')
        .select(`
          instrument_id,
          instrument_id_second,
          instrument_name, 
          project_id, 
          syscom_device_id,
          sno,
          ownership,
          instrument_location,
          alert_value,
          warning_value,
          shutdown_value,
          alert_emails,
          warning_emails,
          shutdown_emails,
          x_y_z_alert_values,
          x_y_z_warning_values,
          x_y_z_shutdown_values,
          duration_seconds,
          duration_alert_value,
          duration_warning_value,
          duration_shutdown_value,
          duration_alert_emails,
          duration_warning_emails,
          duration_shutdown_emails,
          x_y_z_duration_alert_values,
          x_y_z_duration_warning_values,
          x_y_z_duration_shutdown_values,
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
        serialNumber: String(device.serialNumber ?? device.id),
        deviceName: device.name,
        deviceType: 'syscom',
        ownership: null,
        instruments: [],
        deviceInfo: device
      });
    });

    // Add Instantel devices from reference JSON
    deviceReference.deviceTypes.instantel.devices.forEach(device => {
      instantelUsage.push({
        deviceId: device.deviceId,
        serialNumber: device.serialNumber || device.deviceId,
        deviceName: `${device.manufacturer} ${device.modelName}`,
        deviceType: 'instantel',
        ownership: null,
        instruments: [],
        deviceInfo: device
      });
    });

    // Add Tiltmeter devices from reference JSON
    deviceReference.deviceTypes.tiltmeter.devices.forEach(device => {
      tiltmeterUsage.push({
        deviceId: device.deviceId,
        serialNumber: String(device.deviceId),
        deviceName: device.deviceName,
        deviceType: 'tiltmeter',
        ownership: null,
        instruments: []
      });
    });

    // Group instruments by device type
    allInstruments.forEach(instrument => {
      const ownership = normalizeInstrumentOwnership(
        instrument.ownership ??
          defaultOwnershipForInstrument({
            instrument_id: instrument.instrument_id,
            instrument_name: instrument.instrument_name,
          })
      );

      const linkedInstrument = {
        instrumentId: instrument.instrument_id,
        instrumentName: instrument.instrument_name,
        serialNumber: instrument.sno?.trim() || instrument.instrument_id,
        ownership,
        projectId: instrument.project_id,
        projectName: instrument.project_name || 'Unknown Project',
        instrumentLocation: instrument.instrument_location || 'None',
      };

      if (instrument.syscom_device_id) {
        const existingDevice = syscomUsage.find(d => d.deviceId === instrument.syscom_device_id);
        if (existingDevice) {
          existingDevice.instruments.push(linkedInstrument);
          existingDevice.ownership = ownership;
          if (instrument.sno?.trim()) {
            existingDevice.serialNumber = instrument.sno.trim();
          }
        }
      } else if (instrument.instrument_id.includes('TILT')) {
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
          existingDevice.instruments.push(linkedInstrument);
          existingDevice.ownership = ownership;
          if (instrument.sno?.trim()) {
            existingDevice.serialNumber = instrument.sno.trim();
          }
        }
      } else {
        const micromateFolder = getMicromateDeviceFolder({
          instrument_id: instrument.instrument_id,
          instrument_name: instrument.instrument_name,
          sno: instrument.sno,
        });

        if (micromateFolder) {
          const existingDevice = instantelUsage.find(d => d.deviceId === micromateFolder);
          if (existingDevice) {
            existingDevice.instruments.push(linkedInstrument);
            existingDevice.ownership = ownership;
            existingDevice.serialNumber = micromateFolder;
          }
          return;
        }

        const serialKey = instrument.sno?.trim() || instrument.instrument_id;
        const existingDevice = otherUsage.find(d => d.serialNumber === serialKey);

        if (existingDevice) {
          existingDevice.instruments.push(linkedInstrument);
          existingDevice.ownership = ownership;
        } else {
          otherUsage.push({
            deviceId: serialKey,
            serialNumber: serialKey,
            deviceName: instrument.instrument_name,
            deviceType: 'other',
            ownership,
            instruments: [linkedInstrument],
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

  const getDeviceOwnership = (device: DeviceUsage): InstrumentOwnership | null => {
    if (device.ownership) return device.ownership;
    if (device.instruments.length > 0) return device.instruments[0].ownership;
    return null;
  };

  const getDeviceStatusColor = (device: DeviceUsage) => {
    const ownership = getDeviceOwnership(device);
    if (ownership === 'owned') return 'primary';
    if (ownership === 'rental') return 'warning';
    return 'default';
  };

  const getDeviceStatusText = (device: DeviceUsage) => {
    const ownership = getDeviceOwnership(device);
    return ownership ? getOwnershipLabel(ownership) : 'Not linked';
  };

  const filteredDevices = (devices: DeviceUsage[]) => {
    if (!searchTerm) return devices;
    
    const term = searchTerm.toLowerCase();
    return devices.filter(device => 
      device.deviceName.toLowerCase().includes(term) ||
      device.serialNumber.toLowerCase().includes(term) ||
      device.deviceId.toString().includes(searchTerm) ||
      getDeviceStatusText(device).toLowerCase().includes(term) ||
      device.instruments.some(inst => 
        inst.instrumentName.toLowerCase().includes(term) ||
        inst.serialNumber.toLowerCase().includes(term) ||
        inst.projectName.toLowerCase().includes(term) ||
        getOwnershipLabel(inst.ownership).toLowerCase().includes(term)
      )
    );
  };

  const renderDeviceTable = (devices: DeviceUsage[]) => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Serial Number</TableCell>
            <TableCell>Device Name</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Model/Firmware</TableCell>
            <TableCell>Used By Instruments</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Last Communication</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredDevices(devices).map((device) => (
            <TableRow key={`${device.deviceType}-${device.deviceId}`}>
              <TableCell>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {device.serialNumber}
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
                      <Tooltip
                        key={index}
                        title={`ID: ${instrument.instrumentId} | Serial: ${instrument.serialNumber}`}
                      >
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
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {device.instruments.length > 0 ? (
                    device.instruments.map((instrument, index) => (
                      <Chip
                        key={index}
                        label={instrument.projectName}
                        size="small"
                        variant="outlined"
                        color="info"
                      />
                    ))
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      N/A
                    </Typography>
                  )}
                </Box>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {device.instruments.length > 0 ? (
                    device.instruments.map((instrument, index) => (
                      <Tooltip key={index} title={`Project: ${instrument.projectName}`}>
                        <Chip
                          label={instrument.instrumentLocation}
                          size="small"
                          variant="outlined"
                          color="secondary"
                        />
                      </Tooltip>
                    ))
                  ) : (
                    <Typography variant="caption" color="textSecondary">
                      N/A
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
              <TableCell>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {device.instruments.length === 0 ? (
                    <Typography variant="caption" color="textSecondary">
                      N/A
                    </Typography>
                  ) : (
                    device.instruments.map((instrument) => (
                      <Box
                        key={instrument.instrumentId}
                        sx={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 0.5,
                          alignItems: 'center',
                        }}
                      >
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          onClick={() => handleEditInstrument(instrument.instrumentId)}
                        >
                          Edit
                        </Button>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={instrument.ownership}
                            onChange={(e) =>
                              handleOwnershipChange(
                                instrument.instrumentId,
                                e.target.value as InstrumentOwnership
                              )
                            }
                            disabled={updatingOwnershipId === instrument.instrumentId}
                            sx={{ fontSize: 13, height: 32 }}
                          >
                            {INSTRUMENT_OWNERSHIP_OPTIONS.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <Button
                          size="small"
                          variant="outlined"
                          color="secondary"
                          onClick={() =>
                            handleOpenMoveDialog(
                              instrument.instrumentId,
                              instrument.projectId
                            )
                          }
                          disabled={movingInstrumentId === instrument.instrumentId}
                        >
                          Move
                        </Button>
                      </Box>
                    ))
                  )}
                </Box>
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
              • <strong>Status:</strong> Owned or Rental — from the linked instrument ownership setting
            </Typography>
          </Box>
        </Box>
      </MainContentWrapper>

      <Dialog open={!!moveInstrumentId} onClose={handleCloseMoveDialog}>
        <DialogTitle>Move Instrument to Another Project</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Move <strong>{moveInstrumentId}</strong> to a different project. Thresholds and email
            settings stay on the same instrument record.
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel id="device-move-target-project-label">Target Project</InputLabel>
            <Select
              labelId="device-move-target-project-label"
              value={targetProjectId}
              label="Target Project"
              onChange={(e) => setTargetProjectId(Number(e.target.value))}
            >
              {projects
                .filter((project) => project.id !== moveSourceProjectId)
                .map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMoveDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleMoveInstrument}
            disabled={!targetProjectId || !!movingInstrumentId}
          >
            {movingInstrumentId ? 'Moving...' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeviceManagement;
