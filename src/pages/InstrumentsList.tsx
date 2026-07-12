import React, { useEffect, useState } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button,
  FormControl, InputLabel, Select, MenuItem,
  Typography, Box, Chip, Tabs, Tab
} from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import MainContentWrapper from '../components/MainContentWrapper';
import { useAdminContext } from '../context/AdminContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BackButton from '../components/Back';
import { isInstrumentActive } from '../utils/instrumentActive';
import {
  canViewInstrumentGraph,
  getInstrumentGraphRoute,
  buildInstrumentGraphNavState,
} from '../utils/instrumentRoutes';


type Instrument = {
  id: number;
  instrument_id: string;
  instrument_id_second?: string;
  duration_seconds?: number | null;
  duration_alert_value?: number | null;
  duration_warning_value?: number | null;
  duration_shutdown_value?: number | null;
  x_y_z_duration_alert_values?: { x: number; y: number; z: number } | null;
  x_y_z_duration_warning_values?: { x: number; y: number; z: number } | null;
  x_y_z_duration_shutdown_values?: { x: number; y: number; z: number } | null;
  instrument_name: string;
  alert_value: number | null;
  warning_value: number | null;
  shutdown_value: number | null;
  x_y_z_alert_values: { x: number; y: number; z: number } | null;
  x_y_z_warning_values: { x: number; y: number; z: number } | null;
  x_y_z_shutdown_values: { x: number; y: number; z: number } | null;
  project_id: number;
  project_name?: string;
  sno: string;
  syscom_device_id?: number;
  alert_emails?: string[];
  warning_emails?: string[];
  shutdown_emails?: string[];
  is_active?: boolean | null;
};

type Project = {
  id: number;
  name: string;
};

const InstrumentsList: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [instrumentsData, setInstrumentsData] = useState<Instrument[]>([]);
  const { isAdmin, userEmail, permissions } = useAdminContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(location.state?.project || null);
  const [loading, setLoading] = useState(false);

 const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
 const [moveDialogInstrument, setMoveDialogInstrument] = useState<Instrument | null>(null);
 const [targetProjectId, setTargetProjectId] = useState<number | ''>('');
 const [movingInstrumentId, setMovingInstrumentId] = useState<string | null>(null);



  useEffect(() => {
    fetchProjects();
  }, [isAdmin, userEmail]);

  useEffect(() => {
    if (selectedProject) {
      fetchInstruments(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('Projects')
        .select('id, name, user_email')
        .order('name', { ascending: true });
      if (!isAdmin && userEmail) {
        query = query.eq('user_email', userEmail); // Only exact matches
      }
      const { data, error } = await query;

      if (error) throw error;
      const filteredData = isAdmin
        ? data
        : data?.filter(p => p.user_email === userEmail);
      setProjects(filteredData || []);

    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchInstruments = async (projectId: number) => {
    setLoading(true);
    try {
      const { data: projectData } = await supabase
        .from('Projects')
        .select('name, user_email')
        .eq('id', projectId)
        .single();


      if (!isAdmin && projectData?.user_email !== userEmail && projectData?.user_email !== null) {
        console.warn('User does not have access to this project');
        navigate('/projects');
        return;
      }


      const { data: instrumentsData, error } = await supabase
        .from('instruments')
        .select(`
          instrument_id,
          instrument_id_second,
          instrument_name,
          instrument_location,
          alert_value,
          warning_value,
          shutdown_value,
          x_y_z_alert_values,
          x_y_z_warning_values,
          x_y_z_shutdown_values,
          project_id,
          sno,
          syscom_device_id,
          alert_emails,
          warning_emails,
          shutdown_emails,
          duration_seconds,
          duration_alert_value,
          duration_warning_value,
          duration_shutdown_value,
          x_y_z_duration_alert_values,
          x_y_z_duration_warning_values,
          x_y_z_duration_shutdown_values,
          is_active
        `)
        .eq('project_id', projectId)
        .order('sno', { ascending: true });

      if (error) throw error;

      const formattedData = instrumentsData.map((instrument: any) => ({
        ...instrument,
        project_name: projectData?.name || 'Unknown Project',
        alert_emails: instrument.alert_emails,
        warning_emails: instrument.warning_emails,
        shutdown_emails: instrument.shutdown_emails,
      }));
      setInstrumentsData(formattedData as Instrument[]);
    } catch (error) {
      console.error('Error fetching instruments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (projectId: number) => {
    const project = projects.find(p => p.id === projectId) || null;
    setSelectedProject(project);
  };

  const handleOpenMoveDialog = (instrument: Instrument) => {
    setMoveDialogInstrument(instrument);
    setTargetProjectId('');
  };

  const handleCloseMoveDialog = () => {
    setMoveDialogInstrument(null);
    setTargetProjectId('');
  };

  const handleMoveInstrument = async () => {
    if (!moveDialogInstrument || !targetProjectId || !selectedProject) {
      toast.error('Please select a target project');
      return;
    }

    if (targetProjectId === moveDialogInstrument.project_id) {
      toast.error('Instrument is already in this project');
      return;
    }

    setMovingInstrumentId(moveDialogInstrument.instrument_id);
    try {
      const { error } = await supabase
        .from('instruments')
        .update({ project_id: targetProjectId })
        .eq('instrument_id', moveDialogInstrument.instrument_id);

      if (error) {
        toast.error(`Failed to move instrument: ${error.message}`);
        return;
      }

      const targetProject = projects.find((project) => project.id === targetProjectId);
      toast.success(
        `Moved ${moveDialogInstrument.instrument_id} to ${targetProject?.name || 'selected project'}`
      );
      handleCloseMoveDialog();
      fetchInstruments(selectedProject.id);
    } catch (error) {
      console.error('Error moving instrument:', error);
      toast.error('Failed to move instrument');
    } finally {
      setMovingInstrumentId(null);
    }
  };

  const handleEditInstrument = (instrument: Instrument) => {
    if (instrument.instrument_id === 'TILT-142939' || instrument.instrument_id === 'TILT-143969') {
      navigate('/edit-tiltmeter-instrument', { state: { instrument } });
    } else {
      navigate('/edit-instrument', { state: { instrument } });
    }
  };

  const handleStatusChange = async (instrumentId: string, makeActive: boolean) => {
    setTogglingStatusId(instrumentId);
    try {
      const { error } = await supabase
        .from('instruments')
        .update({ is_active: makeActive })
        .eq('instrument_id', instrumentId);

      if (error) {
        if (error.message.includes('is_active')) {
          toast.error('Status column missing. Run supabase/add_instrument_is_active.sql in Supabase first.');
        } else {
          toast.error(`Failed to update status: ${error.message}`);
        }
        return;
      }

      setInstrumentsData((prev) =>
        prev.map((item) =>
          item.instrument_id === instrumentId ? { ...item, is_active: makeActive } : item
        )
      );
      toast.success(`Instrument marked as ${makeActive ? 'Active' : 'Inactive'}`);
    } catch (err) {
      console.error('Error updating instrument status:', err);
      toast.error('Failed to update instrument status');
    } finally {
      setTogglingStatusId(null);
    }
  };

  // Helper function to format XYZ values for display
  const formatXYZValues = (instrument: Instrument) => {
    const isTiltmeter = instrument.instrument_id === 'TILT-142939' || instrument.instrument_id === 'TILT-143969';
    
    if (!isTiltmeter) {
      return {
        alert: instrument.alert_value || '-',
        warning: instrument.warning_value || '-',
        shutdown: instrument.shutdown_value || '-'
      };
    }

    const formatXYZ = (values: { x: number; y: number; z: number } | null) => {
      if (!values) return '-';
      return `X:${values.x}, Y:${values.y}, Z:${values.z}`;
    };

    return {
      alert: formatXYZ(instrument.x_y_z_alert_values || null),
      warning: formatXYZ(instrument.x_y_z_warning_values || null),
      shutdown: formatXYZ(instrument.x_y_z_shutdown_values || null)
    };
  };

  const formatDurationValues = (instrument: Instrument) => {
    const isTiltmeter = instrument.instrument_id === 'TILT-142939' || instrument.instrument_id === 'TILT-143969';

    if (!isTiltmeter) {
      return {
        alert: instrument.duration_alert_value ?? '-',
        warning: instrument.duration_warning_value ?? '-',
        shutdown: instrument.duration_shutdown_value ?? '-',
      };
    }

    const formatXYZ = (values: { x: number; y: number; z: number } | null) => {
      if (!values) return '-';
      return `X:${values.x}, Y:${values.y}, Z:${values.z}`;
    };

    return {
      alert: formatXYZ(instrument.x_y_z_duration_alert_values || null),
      warning: formatXYZ(instrument.x_y_z_duration_warning_values || null),
      shutdown: formatXYZ(instrument.x_y_z_duration_shutdown_values || null),
    };
  };

  if (!selectedProject) {
    return (
      <>
        <HeaNavLogo />
        <MainContentWrapper>
          <BackButton  />
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <Button variant="contained" onClick={() => navigate('/projects-list')}>
              Back to Projects
            </Button>
          </Box>
          <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
            <Typography variant="h5" align="center" gutterBottom>
              Select Project to View Instruments
            </Typography>
            {loading ? (
              <Typography align="center">Loading projects...</Typography>
            ) : projects.length === 0 ? (
              <Typography align="center">No projects available</Typography>
            ) : (
              <FormControl fullWidth sx={{ mt: 3 }}>
                <InputLabel>Project</InputLabel>
                <Select
                  value=""
                  onChange={(e) => handleProjectChange(Number(e.target.value))}
                  label="Project"
                >
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Box>
        </MainContentWrapper>
      </>
    );
  }

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton  />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, gap: 2 }}>
          <Button variant="contained" onClick={() => navigate('/projects-list')}>
            Back to Projects
          </Button>
        </Box>

        <Box sx={{ fontFamily: 'Arial, sans-serif', p: 0 }}>
          <Typography variant="h5" align="center" sx={{ mt: 3, color: '#333' }}>
            Instruments
          </Typography>

          {projects.length > 0 && (
            <Box sx={{ maxWidth: '96%', mx: 'auto', mt: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tabs
                value={selectedProject.id}
                onChange={(_, projectId) => handleProjectChange(Number(projectId))}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
              >
                {projects.map((project) => (
                  <Tab key={project.id} label={project.name} value={project.id} />
                ))}
              </Tabs>
            </Box>
          )}

          <Typography variant="subtitle1" align="center" sx={{ mt: 2, color: '#555' }}>
            {selectedProject.name}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <TableContainer component={Paper} sx={{ maxWidth: '96%', mt: 3, border: '1px solid #000', mb: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#f1f1f1' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>S.No</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Instrument ID</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Instrument Name</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Alert Value</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Warning Value</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Shutdown Value</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Duration (s)</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Dur. Alert</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Dur. Warning</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Dur. Shutdown</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center">Loading instruments...</TableCell>
                    </TableRow>
                  ) : instrumentsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} align="center">No instruments found for this project</TableCell>
                    </TableRow>
                  ) : (
                    instrumentsData.map((instrument) => {
                      const instrumentActive = isInstrumentActive(instrument.is_active);
                      return (
                      <TableRow
                        key={instrument.instrument_id}
                        sx={{
                          backgroundColor: instrumentActive ? '#fff' : '#f5f5f5',
                          opacity: instrumentActive ? 1 : 0.85,
                        }}
                      >
                        <TableCell sx={{ border: '1px solid black' }}>{instrument.sno}</TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>{instrument.instrument_id_second || instrument.instrument_id}</TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          {instrument.instrument_name}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          {(() => {
                            const values = formatXYZValues(instrument);
                            return values.alert;
                          })()}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          {(() => {
                            const values = formatXYZValues(instrument);
                            return values.warning;
                          })()}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          {(() => {
                            const values = formatXYZValues(instrument);
                            return values.shutdown;
                          })()}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>{instrument.duration_seconds ?? '-'}</TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          {formatDurationValues(instrument).alert}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          {formatDurationValues(instrument).warning}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          {formatDurationValues(instrument).shutdown}
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          <Chip
                            label={instrumentActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={instrumentActive ? 'success' : 'default'}
                            variant={instrumentActive ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                              <Button
                                variant="contained"
                                color="info"
                                sx={{ py: 1, fontSize: 14 }}
                                disabled={
                                  !canViewInstrumentGraph(instrument, {
                                    viewGraphPermission: permissions.view_graph,
                                    isActive: instrumentActive,
                                  })
                                }
                                onClick={() => {
                                  if (!selectedProject) return;
                                  const route = getInstrumentGraphRoute(instrument);
                                  if (!route) return;
                                  navigate(route, {
                                    state: buildInstrumentGraphNavState(
                                      instrument,
                                      selectedProject
                                    ),
                                  });
                                }}
                              >
                                View
                              </Button>
                              {isAdmin && (
                                <Button
                                  variant="outlined"
                                  color="secondary"
                                  onClick={() => handleOpenMoveDialog(instrument)}
                                  sx={{ py: 1, fontSize: 14 }}
                                  disabled={movingInstrumentId === instrument.instrument_id}
                                >
                                  Move
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="contained"
                                  color="primary"
                                  onClick={() => handleEditInstrument(instrument)}
                                  sx={{ py: 1, fontSize: 14 }}
                                >
                                  Edit
                                </Button>
                              )}
                              {isAdmin && (
                                <FormControl size="small" sx={{ minWidth: 110 }}>
                                  <Select
                                    value={instrumentActive ? 'active' : 'inactive'}
                                    onChange={(e) =>
                                      handleStatusChange(instrument.instrument_id, e.target.value === 'active')
                                    }
                                    disabled={togglingStatusId === instrument.instrument_id}
                                    sx={{ fontSize: 14, height: 36 }}
                                  >
                                    <MenuItem value="active">Active</MenuItem>
                                    <MenuItem value="inactive">Inactive</MenuItem>
                                  </Select>
                                </FormControl>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </MainContentWrapper>

      <Dialog
        open={!!moveDialogInstrument}
        onClose={handleCloseMoveDialog}
        aria-labelledby="move-instrument-dialog-title"
      >
        <DialogTitle id="move-instrument-dialog-title">
          Move Instrument to Another Project
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Move{' '}
            <strong>
              {moveDialogInstrument?.instrument_id} ({moveDialogInstrument?.instrument_name})
            </strong>{' '}
            from <strong>{selectedProject?.name}</strong> to another project. The instrument
            record, thresholds, and emails are kept — only the project assignment changes.
          </DialogContentText>
          <FormControl fullWidth>
            <InputLabel id="move-target-project-label">Target Project</InputLabel>
            <Select
              labelId="move-target-project-label"
              value={targetProjectId}
              label="Target Project"
              onChange={(e) => setTargetProjectId(Number(e.target.value))}
            >
              {projects
                .filter((project) => project.id !== moveDialogInstrument?.project_id)
                .map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseMoveDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleMoveInstrument}
            variant="contained"
            color="primary"
            disabled={!targetProjectId || !!movingInstrumentId}
          >
            {movingInstrumentId ? 'Moving...' : 'Move'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default InstrumentsList;