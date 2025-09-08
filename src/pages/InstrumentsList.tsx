import React, { useEffect, useState } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button,
  FormControl, InputLabel, Select, MenuItem,
  Typography, Box
} from '@mui/material';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { Delete as DeleteIcon } from '@mui/icons-material';
import MainContentWrapper from '../components/MainContentWrapper';
import { useAdminContext } from '../context/AdminContext';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import BackButton from '../components/Back';


type Instrument = {
  id: number;
  instrument_id: string;
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
  alert_emails?: string[];
  warning_emails?: string[];
  shutdown_emails?: string[];
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

 const [openDialogId, setOpenDialogId] = useState<string | null>(null); 



  useEffect(() => {
    if (selectedProject) {
      fetchInstruments(selectedProject.id);
    } else {
      fetchProjects();
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
          instrument_name,
          alert_value,
          warning_value,
          shutdown_value,
          x_y_z_alert_values,
          x_y_z_warning_values,
          x_y_z_shutdown_values,
          project_id,
          sno,
          alert_emails,
          warning_emails,
          shutdown_emails
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

  const handleEditInstrument = (instrument: Instrument) => {
    if (instrument.instrument_id === 'TILT-142939' || instrument.instrument_id === 'TILT-143969') {
      navigate('/edit-tiltmeter-instrument', { state: { instrument } });
    } else {
      navigate('/edit-instrument', { state: { instrument } });
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

const handleDeleteInstrument = async (instrumentId: string) => {  
  console.log('Deleting instrument with ID:', instrumentId);

  const { error } = await supabase
    .from('instruments')
    .delete()
    .eq('instrument_id', instrumentId);  

  if (error) {
    console.error('Error deleting instrument:', error);
  } else {
    setInstrumentsData(instrumentsData.filter(instrument => instrument.instrument_id !== instrumentId));
    toast.success('Instrument deleted successfully');
  }
  setOpenDialogId(null);
}

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
          {!location.state?.project && (
            <Button variant="outlined" onClick={() => setSelectedProject(null)}>
              Change Project
            </Button>
          )}
        </Box>

        <Box sx={{ fontFamily: 'Arial, sans-serif', p: 0 }}>
          <Typography variant="h5" align="center" sx={{ mt: 3, color: '#333' }}>
            Instruments for: {selectedProject.name}
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
                    <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">Loading instruments...</TableCell>
                    </TableRow>
                  ) : instrumentsData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">No instruments found for this project</TableCell>
                    </TableRow>
                  ) : (
                    instrumentsData.map((instrument) => (
                      <TableRow key={instrument.id} sx={{ backgroundColor: '#fff' }}>
                        <TableCell sx={{ border: '1px solid black' }}>{instrument.sno}</TableCell>
                        <TableCell sx={{ border: '1px solid black' }}>{instrument.instrument_id}</TableCell>
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
                        <TableCell sx={{ border: '1px solid black' }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <Button
                                variant="contained"
                                color="info"
                                sx={{ py: 1, fontSize: 14 }}
                                disabled={
                                  !permissions.view_graph ||
                                  !(
                                    instrument.instrument_id === 'SMG1' ||
                                    instrument.instrument_id === 'SMG-2' ||
                                    instrument.instrument_id === 'SMG-3' ||
                                    instrument.instrument_id === 'AMTS-1' ||
                                    instrument.instrument_id === 'AMTS-2' ||
                                    instrument.instrument_id === 'TILT-142939' ||
                                    instrument.instrument_id === 'TILT-143969' ||
                                    instrument.instrument_name === 'Tiltmeter'
                                  )
                                }
                                onClick={() => {
                                  if (instrument.instrument_id === 'SMG1') {
                                    navigate('/background', { state: { project: selectedProject } });
                                  } else if (instrument.instrument_id === 'SMG-2') {
                                    navigate('/anc-seismograph', { state: { project: selectedProject } });
                                  } else if (instrument.instrument_id === 'SMG-3') {
                                    navigate('/smg3-seismograph', { state: { project: selectedProject } });
                                  } else if (
                                    instrument.instrument_id === 'AMTS-1' ||
                                    instrument.instrument_id === 'AMTS-2'
                                  ) {
                                    navigate('/single-prism-with-time', { state: { project: selectedProject } });
                                  } else if (instrument.instrument_id === 'TILT-142939') {
                                    navigate('/tiltmeter-142939', { state: { project: selectedProject } });
                                  } else if (instrument.instrument_id === 'TILT-143969') {
                                    navigate('/tiltmeter-143969', { state: { project: selectedProject } });
                                  } else if (instrument.instrument_name === 'Tiltmeter') {
                                    navigate('/tiltmeter', { state: { project: selectedProject } });
                                  }
                                }}
                              >
                                View
                              </Button>
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
                            </Box>
                            {isAdmin && (
                              <Button
                                variant="contained"
                                color="error"
                                onClick={() => setOpenDialogId(instrument.instrument_id)}
                                sx={{ py: 1, fontSize: 14 }}
                              >
                                <DeleteIcon />
                              </Button>
                            )}
                          </Box>

                          {isAdmin && (
                            <Dialog
                               open={openDialogId === instrument.instrument_id}
                              onClose={() => setOpenDialogId(null)}
                              aria-labelledby="alert-dialog-title"
                              aria-describedby="alert-dialog-description"
                            >
                              <DialogTitle id="alert-dialog-title">
                                Confirm Deletion
                              </DialogTitle>
                              <DialogContent>
                                <DialogContentText id="alert-dialog-description">
                                  Are you sure you want to delete this instrument? This action cannot be undone.
                                </DialogContentText>
                              </DialogContent>
                              <DialogActions>
                                <Button onClick={() => setOpenDialogId(null)} color="primary">
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => handleDeleteInstrument(instrument.instrument_id)}
                                  color="error"
                                  autoFocus
                                >
                                  Delete
                                </Button>
                              </DialogActions>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default InstrumentsList;