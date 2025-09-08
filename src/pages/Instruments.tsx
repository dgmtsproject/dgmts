import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import logo from '../assets/logo.jpg';
import HeaNavLogo from '../components/HeaNavLogo';
import { supabase } from '../supabase';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const Instruments: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  type Project = {
    id: string;
    name: string;
  };

  const [project, setProject] = useState<Project | null>(location.state?.project || null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  const [EmailsForAlert, setEmailsForAlert] = React.useState<string[]>(['']);
  const [instrumentSno, setInstrumentSno] = React.useState('');
  const [EmailsForWarning, setEmailsForWarning] = React.useState<string[]>(['']);
  const [ShutEmailsForAlert, setShutEmailsForAlert] = React.useState<string[]>(['']);
  const [instrumentId, setInstrumentId] = React.useState('');
  const [instrumentName, setInstrumentName] = React.useState('');
  const [alertValue, setAlertValue] = React.useState<number | string>('');
  const [warningValue, setWarningValue] = React.useState<number | string>('');
  const [shutdownValue, setShutdownValue] = React.useState<number | string>('');

  // New state for XYZ values (for tiltmeters)
  const [xyzAlertValues, setXyzAlertValues] = React.useState({
    x: '',
    y: '',
    z: ''
  });
  const [xyzWarningValues, setXyzWarningValues] = React.useState({
    x: '',
    y: '',
    z: ''
  });
  const [xyzShutdownValues, setXyzShutdownValues] = React.useState({
    x: '',
    y: '',
    z: ''
  });

  useEffect(() => {
    if (!project) {
      fetchProjects();
    }
  }, []);
  const fetchProjects = async () => {
    setLoadingProjects(true);
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  const handleProjectSelect = (projectId: string) => {
    const selectedProject = projects.find(p => p.id === projectId);
    if (selectedProject) {
      setProject(selectedProject);
    }
  };
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!project) {
    toast.error('Please select a project first');
    return;
  }

  if (!instrumentId || !instrumentName) {
    toast.error('Instrument ID and Name are required');
    return;
  }

  // Filter out empty emails
  const filteredAlertEmails = EmailsForAlert.filter(email => email.trim() !== '');
  const filteredWarningEmails = EmailsForWarning.filter(email => email.trim() !== '');
  const filteredShutdownEmails = ShutEmailsForAlert.filter(email => email.trim() !== '');

  // Determine if this is a tiltmeter
  const isTiltmeter = instrumentId === 'TILT-142939' || instrumentId === 'TILT-143969';
  
  // Prepare instrument data
  const instrumentData: any = {
    instrument_id: instrumentId,
    instrument_name: instrumentName,
    project_id: project.id,
    sno: instrumentSno || null,
    alert_emails: filteredAlertEmails.length > 0 ? filteredAlertEmails : null,
    warning_emails: filteredWarningEmails.length > 0 ? filteredWarningEmails : null,
    shutdown_emails: filteredShutdownEmails.length > 0 ? filteredShutdownEmails : null,
  };

  if (isTiltmeter) {
    // For tiltmeters, use ONLY XYZ JSON values
    instrumentData.x_y_z_alert_values = {
      x: xyzAlertValues.x ? Number(xyzAlertValues.x) : null,
      y: xyzAlertValues.y ? Number(xyzAlertValues.y) : null,
      z: xyzAlertValues.z ? Number(xyzAlertValues.z) : null
    };
    instrumentData.x_y_z_warning_values = {
      x: xyzWarningValues.x ? Number(xyzWarningValues.x) : null,
      y: xyzWarningValues.y ? Number(xyzWarningValues.y) : null,
      z: xyzWarningValues.z ? Number(xyzWarningValues.z) : null
    };
    instrumentData.x_y_z_shutdown_values = {
      x: xyzShutdownValues.x ? Number(xyzShutdownValues.x) : null,
      y: xyzShutdownValues.y ? Number(xyzShutdownValues.y) : null,
      z: xyzShutdownValues.z ? Number(xyzShutdownValues.z) : null
    };
    // Always set single values to null for tiltmeters
    instrumentData.alert_value = null;
    instrumentData.warning_value = null;
    instrumentData.shutdown_value = null;
  } else {
    // For non-tiltmeters, use ONLY single values
    instrumentData.alert_value = alertValue ? Number(alertValue) : null;
    instrumentData.warning_value = warningValue ? Number(warningValue) : null;
    instrumentData.shutdown_value = shutdownValue ? Number(shutdownValue) : null;
    // Always set XYZ values to null for non-tiltmeters
    instrumentData.x_y_z_alert_values = null;
    instrumentData.x_y_z_warning_values = null;
    instrumentData.x_y_z_shutdown_values = null;
  }

  const { data, error } = await supabase.from('instruments').insert([instrumentData]);

  if (error) {
    console.error('Error adding instrument:', error.message);
    toast.error('Error adding instrument!');
  } else {
    console.log('Instrument added successfully:', data);
    toast.success('Instrument added successfully!');
    setTimeout(() => {
      navigate('/projects-list', { state: { project } });
    }, 2000);
  }
};
  const addEmailField = () => {
    setEmailsForAlert([...EmailsForAlert, '']);
  };
  
  const removeEmailField = (index: number): void => {
    const updatedEmails: string[] = [...EmailsForAlert];
    updatedEmails.splice(index, 1);
    setEmailsForAlert(updatedEmails);
  };

  const addWarnEmailField = () => {
    setEmailsForWarning([...EmailsForWarning, '']);
  };
  
  const removeWarnEmailField = (index: number): void => {
    const updatedEmails: string[] = [...EmailsForWarning];
    updatedEmails.splice(index, 1);
    setEmailsForWarning(updatedEmails);
  };
  
  const addShutEmailField = () => {
    setShutEmailsForAlert([...ShutEmailsForAlert, '']);
  };
  
  const removeShutEmailField = (index: number): void => {
    const updatedEmails: string[] = [...ShutEmailsForAlert];
    updatedEmails.splice(index, 1);
    setShutEmailsForAlert(updatedEmails);
  };

  if (!project) {
    return (
      <>
        <HeaNavLogo />
        <MainContentWrapper >
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
        <Container maxWidth="lg">
          <Box mt={4} position="relative">
            <img
              src={logo}
              alt="Logo"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '60%',
                opacity: 0.05,
                zIndex: -1,
                pointerEvents: 'none',
              }}
            />
            <Typography variant="h5" gutterBottom align="center" fontWeight="bold">
              Select Project
            </Typography>
            <Box
              sx={{ mt: 4, width: '100%', maxWidth: 800 }}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              margin="0 auto"
              padding="20px"
            >
              <FormControl fullWidth>
                <InputLabel id="project-select-label">Project</InputLabel>
                <Select
                  labelId="project-select-label"
                  value=""
                  onChange={(e) => handleProjectSelect(e.target.value as string)}
                  label="Project"
                  disabled={loadingProjects}
                >
                  {projects.map((proj) => (
                    <MenuItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              {loadingProjects && <Typography mt={2}>Loading projects...</Typography>}
              {!loadingProjects && projects.length === 0 && (
                <Typography mt={2}>No projects found</Typography>
              )}
            </Box>
          </Box>
        </Container>
        </MainContentWrapper>
      </>
    );
  }
  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper >
      <BackButton />
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
<Container maxWidth="lg">
  <Box mt={4} position="relative">
    <img
      src={logo}
      alt="Logo"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '60%',
        opacity: 0.05,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
    <Typography variant="h5" gutterBottom align="center" fontWeight="bold">
      Add Instrument for: {project?.name || 'No Project Selected'}
    </Typography>

    <Box
      component="form"
      sx={{ mt: 4, width: '100%', maxWidth: 800 }}
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      margin="0 auto"
      padding="20px"
      onSubmit={handleSubmit}
    >
      {/* Instrument Info */}
      <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
        <TextField
          label="Instrument ID"
          required
          value={instrumentId}
          onChange={(e) => setInstrumentId(e.target.value)}
          fullWidth
        />
        <TextField
          label="Instrument Name"
          required
          value={instrumentName}
          onChange={(e) => setInstrumentName(e.target.value)}
          fullWidth
        />
        <TextField
          label="Instrument SNo."
          type="number"
          value={instrumentSno}
          onChange={(e) => setInstrumentSno(e.target.value)}
          style={{width: '100%'}}
        />
      </Box>

      {/* Alert Values - Optional (Only for non-tiltmeters) */}
      {!(instrumentId === 'TILT-142939' || instrumentId === 'TILT-143969') && (
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
          <TextField
            label="Alert Value (optional)"
            type="number"
            value={alertValue}
            onChange={(e) => setAlertValue(e.target.value)}
            fullWidth
          />
          <Box display="flex" flexDirection="column" gap={1}>
            {EmailsForAlert.map((email, i) => (
              <Box key={i} display="flex" alignItems="center" gap={1}>
                <TextField
                  label={`Alert Email ${i + 1} (optional)`}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const updatedEmails = [...EmailsForAlert];
                    updatedEmails[i] = e.target.value;
                    setEmailsForAlert(updatedEmails);
                  }}
                  fullWidth
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeEmailField(i)}
                >
                  ❌
                </Button>
              </Box>
            ))}
            <Button variant="outlined" onClick={addEmailField}>
              Add Alert Email
            </Button>
          </Box>
        </Box>
      )}

      {/* Warning Values - Optional (Only for non-tiltmeters) */}
      {!(instrumentId === 'TILT-142939' || instrumentId === 'TILT-143969') && (
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
          <TextField
            label="Warning Value (optional)"
            type="number"
            value={warningValue}
            onChange={(e) => setWarningValue(e.target.value)}
            fullWidth
          />
          <Box display="flex" flexDirection="column" gap={1}>
            {EmailsForWarning.map((email, i) => (
              <Box key={i} display="flex" alignItems="center" gap={1}>
                <TextField
                  label={`Warning Email ${i + 1} (optional)`}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const updatedEmails = [...EmailsForWarning];
                    updatedEmails[i] = e.target.value;
                    setEmailsForWarning(updatedEmails);
                  }}
                  fullWidth
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeWarnEmailField(i)}
                >
                  ❌
                </Button>
              </Box>
            ))}
            <Button variant="outlined" onClick={addWarnEmailField}>
              Add Warning Email
            </Button>
          </Box>
        </Box>
      )}

      {/* Shutdown Values - Optional (Only for non-tiltmeters) */}
      {!(instrumentId === 'TILT-142939' || instrumentId === 'TILT-143969') && (
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
          <TextField
            label="Shutdown Value (optional)"
            type="number"
            value={shutdownValue}
            onChange={(e) => setShutdownValue(e.target.value)}
            fullWidth
          />
          <Box display="flex" flexDirection="column" gap={1}>
            {ShutEmailsForAlert.map((email, i) => (
              <Box key={i} display="flex" alignItems="center" gap={1}>
                <TextField
                  label={`Shutdown Email ${i + 1} (optional)`}
                  type="email"
                  value={email}
                  onChange={(e) => {
                    const updatedEmails = [...ShutEmailsForAlert];
                    updatedEmails[i] = e.target.value;
                    setShutEmailsForAlert(updatedEmails);
                  }}
                  fullWidth
                />
                <Button
                  size="small"
                  color="error"
                  onClick={() => removeShutEmailField(i)}
                >
                  ❌
                </Button>
              </Box>
            ))}
            <Button variant="outlined" onClick={addShutEmailField}>
              Add Shutdown Email
            </Button>
          </Box>
        </Box>
      )}

      {/* XYZ Values for Tiltmeters */}
      {(instrumentId === 'TILT-142939' || instrumentId === 'TILT-143969') && (
        <>
          {/* XYZ Alert Values */}
          <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2} width="100%" mb={2}>
            <Typography variant="h6" gridColumn="1 / -1" sx={{ mt: 2, mb: 1 }}>
              XYZ Alert Values (Tiltmeter)
            </Typography>
            <TextField
              label="X-Axis Alert Value"
              type="number"
              value={xyzAlertValues.x}
              onChange={(e) => setXyzAlertValues({...xyzAlertValues, x: e.target.value})}
              fullWidth
            />
            <TextField
              label="Y-Axis Alert Value"
              type="number"
              value={xyzAlertValues.y}
              onChange={(e) => setXyzAlertValues({...xyzAlertValues, y: e.target.value})}
              fullWidth
            />
            <TextField
              label="Z-Axis Alert Value"
              type="number"
              value={xyzAlertValues.z}
              onChange={(e) => setXyzAlertValues({...xyzAlertValues, z: e.target.value})}
              fullWidth
            />
          </Box>

          {/* XYZ Warning Values */}
          <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2} width="100%" mb={2}>
            <Typography variant="h6" gridColumn="1 / -1" sx={{ mt: 2, mb: 1 }}>
              XYZ Warning Values (Tiltmeter)
            </Typography>
            <TextField
              label="X-Axis Warning Value"
              type="number"
              value={xyzWarningValues.x}
              onChange={(e) => setXyzWarningValues({...xyzWarningValues, x: e.target.value})}
              fullWidth
            />
            <TextField
              label="Y-Axis Warning Value"
              type="number"
              value={xyzWarningValues.y}
              onChange={(e) => setXyzWarningValues({...xyzWarningValues, y: e.target.value})}
              fullWidth
            />
            <TextField
              label="Z-Axis Warning Value"
              type="number"
              value={xyzWarningValues.z}
              onChange={(e) => setXyzWarningValues({...xyzWarningValues, z: e.target.value})}
              fullWidth
            />
          </Box>

          {/* XYZ Shutdown Values */}
          <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2} width="100%" mb={2}>
            <Typography variant="h6" gridColumn="1 / -1" sx={{ mt: 2, mb: 1 }}>
              XYZ Shutdown Values (Tiltmeter)
            </Typography>
            <TextField
              label="X-Axis Shutdown Value"
              type="number"
              value={xyzShutdownValues.x}
              onChange={(e) => setXyzShutdownValues({...xyzShutdownValues, x: e.target.value})}
              fullWidth
            />
            <TextField
              label="Y-Axis Shutdown Value"
              type="number"
              value={xyzShutdownValues.y}
              onChange={(e) => setXyzShutdownValues({...xyzShutdownValues, y: e.target.value})}
              fullWidth
            />
            <TextField
              label="Z-Axis Shutdown Value"
              type="number"
              value={xyzShutdownValues.z}
              onChange={(e) => setXyzShutdownValues({...xyzShutdownValues, z: e.target.value})}
              fullWidth
            />
          </Box>
        </>
      )}

      {/* Submit Button */}
      <Box mt={4} textAlign="center">
        <Button type="submit" variant="contained" color="primary">
          Submit
        </Button>
      </Box>
    </Box>
  </Box>
  <Box mt={6} textAlign="center" fontSize="0.9rem">
    © 2025 DGMTS. All rights reserved.
  </Box>
</Container>

      </MainContentWrapper>
    </>
  );
};

export default Instruments;