// Edit form for tiltmeters only (TILT-142939, TILT-143969)
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab
} from '@mui/material';
import logo from '../assets/logo.jpg';
import HeaNavLogo from '../components/HeaNavLogo';
import { supabase } from '../supabase';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useAdminContext } from '../context/AdminContext';

const EditTiltmeterInstrument: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { instrument } = location.state || {};
  const { isAdmin } = useAdminContext();

  const [instrumentIdSecond, setInstrumentIdSecond] = useState(
    instrument?.instrument_id_second || instrument?.instrument_id || ''
  );
  const [instrumentName, setInstrumentName] = useState(instrument?.instrument_name || '');
  const [instrumentLocation, setInstrumentLocation] = useState(instrument?.instrument_location || '');
  const [instrumentSno, setInstrumentSno] = useState(instrument?.sno || '');
  const [project, _setProject] = useState({ id: instrument?.project_id, name: instrument?.project_name || '' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [alertTab, setAlertTab] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState<number | string>(instrument?.duration_seconds || '');
  const [xyzDurationAlertValues, setXyzDurationAlertValues] = useState({
    x: instrument?.x_y_z_duration_alert_values?.x || '',
    y: instrument?.x_y_z_duration_alert_values?.y || '',
    z: instrument?.x_y_z_duration_alert_values?.z || ''
  });
  const [xyzDurationWarningValues, setXyzDurationWarningValues] = useState({
    x: instrument?.x_y_z_duration_warning_values?.x || '',
    y: instrument?.x_y_z_duration_warning_values?.y || '',
    z: instrument?.x_y_z_duration_warning_values?.z || ''
  });
  const [xyzDurationShutdownValues, setXyzDurationShutdownValues] = useState({
    x: instrument?.x_y_z_duration_shutdown_values?.x || '',
    y: instrument?.x_y_z_duration_shutdown_values?.y || '',
    z: instrument?.x_y_z_duration_shutdown_values?.z || ''
  });

  // XYZ threshold values
  const [xyzAlertValues, setXyzAlertValues] = useState({
    x: instrument?.x_y_z_alert_values?.x || '',
    y: instrument?.x_y_z_alert_values?.y || '',
    z: instrument?.x_y_z_alert_values?.z || ''
  });
  const [xyzWarningValues, setXyzWarningValues] = useState({
    x: instrument?.x_y_z_warning_values?.x || '',
    y: instrument?.x_y_z_warning_values?.y || '',
    z: instrument?.x_y_z_warning_values?.z || ''
  });
  const [xyzShutdownValues, setXyzShutdownValues] = useState({
    x: instrument?.x_y_z_shutdown_values?.x || '',
    y: instrument?.x_y_z_shutdown_values?.y || '',
    z: instrument?.x_y_z_shutdown_values?.z || ''
  });

  // Email fields
  const parseEmails = (emails: any) => {
    if (Array.isArray(emails)) return emails;
    if (typeof emails === 'string') {
      return emails.split(',').map((e: string) => e.trim()).filter((e: string) => e);
    }
    return [''];
  };
  const [EmailsForAlert, setEmailsForAlert] = useState<string[]>(parseEmails(instrument?.alert_emails));
  const [EmailsForWarning, setEmailsForWarning] = useState<string[]>(parseEmails(instrument?.warning_emails));
  const [ShutEmailsForAlert, setShutEmailsForAlert] = useState<string[]>(parseEmails(instrument?.shutdown_emails));
  const [DurationEmailsForAlert, setDurationEmailsForAlert] = useState<string[]>(parseEmails(instrument?.duration_alert_emails));
  const [DurationEmailsForWarning, setDurationEmailsForWarning] = useState<string[]>(parseEmails(instrument?.duration_warning_emails));
  const [DurationShutEmailsForAlert, setDurationShutEmailsForAlert] = useState<string[]>(parseEmails(instrument?.duration_shutdown_emails));

  useEffect(() => {
    if (!isAdmin) {
      toast.error('You do not have permission to edit instruments.');
      navigate('/projects-list');
    }
  }, [isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Show confirmation dialog
    setConfirmDialogOpen(true);
  };

  const confirmUpdate = async () => {
    setConfirmDialogOpen(false);
    
    // Filter out empty emails
    const filteredAlertEmails = EmailsForAlert.filter(email => email.trim() !== '');
    const filteredWarningEmails = EmailsForWarning.filter(email => email.trim() !== '');
    const filteredShutdownEmails = ShutEmailsForAlert.filter(email => email.trim() !== '');
    const filteredDurationAlertEmails = DurationEmailsForAlert.filter(email => email.trim() !== '');
    const filteredDurationWarningEmails = DurationEmailsForWarning.filter(email => email.trim() !== '');
    const filteredDurationShutdownEmails = DurationShutEmailsForAlert.filter(email => email.trim() !== '');
    const updateData: any = {
      instrument_id_second: instrumentIdSecond,
      instrument_name: instrumentName,
      instrument_location: instrumentLocation || null,
      project_id: project.id,
      sno: instrumentSno || null,
      x_y_z_alert_values: {
        x: xyzAlertValues.x ? Number(xyzAlertValues.x) : null,
        y: xyzAlertValues.y ? Number(xyzAlertValues.y) : null,
        z: xyzAlertValues.z ? Number(xyzAlertValues.z) : null
      },
      x_y_z_warning_values: {
        x: xyzWarningValues.x ? Number(xyzWarningValues.x) : null,
        y: xyzWarningValues.y ? Number(xyzWarningValues.y) : null,
        z: xyzWarningValues.z ? Number(xyzWarningValues.z) : null
      },
      x_y_z_shutdown_values: {
        x: xyzShutdownValues.x ? Number(xyzShutdownValues.x) : null,
        y: xyzShutdownValues.y ? Number(xyzShutdownValues.y) : null,
        z: xyzShutdownValues.z ? Number(xyzShutdownValues.z) : null
      },
      alert_emails: filteredAlertEmails.length > 0 ? filteredAlertEmails : null,
      warning_emails: filteredWarningEmails.length > 0 ? filteredWarningEmails : null,
      shutdown_emails: filteredShutdownEmails.length > 0 ? filteredShutdownEmails : null,
      duration_seconds: durationSeconds ? Number(durationSeconds) : null,
      x_y_z_duration_alert_values: {
        x: xyzDurationAlertValues.x ? Number(xyzDurationAlertValues.x) : null,
        y: xyzDurationAlertValues.y ? Number(xyzDurationAlertValues.y) : null,
        z: xyzDurationAlertValues.z ? Number(xyzDurationAlertValues.z) : null
      },
      x_y_z_duration_warning_values: {
        x: xyzDurationWarningValues.x ? Number(xyzDurationWarningValues.x) : null,
        y: xyzDurationWarningValues.y ? Number(xyzDurationWarningValues.y) : null,
        z: xyzDurationWarningValues.z ? Number(xyzDurationWarningValues.z) : null
      },
      x_y_z_duration_shutdown_values: {
        x: xyzDurationShutdownValues.x ? Number(xyzDurationShutdownValues.x) : null,
        y: xyzDurationShutdownValues.y ? Number(xyzDurationShutdownValues.y) : null,
        z: xyzDurationShutdownValues.z ? Number(xyzDurationShutdownValues.z) : null
      },
      duration_alert_emails: filteredDurationAlertEmails.length > 0 ? filteredDurationAlertEmails : null,
      duration_warning_emails: filteredDurationWarningEmails.length > 0 ? filteredDurationWarningEmails : null,
      duration_shutdown_emails: filteredDurationShutdownEmails.length > 0 ? filteredDurationShutdownEmails : null,
      alert_value: null,
      warning_value: null,
      shutdown_value: null
    };
    const { error } = await supabase
      .from('instruments')
      .update(updateData)
      .eq('instrument_id', instrument.instrument_id);
    if (error) {
      if (error.code === '23505' && error.message.includes('instrument_id_second')) {
        toast.error('Instrument ID already exists. Please choose a different Instrument ID.');
      } else {
        toast.error('Error updating tiltmeter instrument!');
      }
    } else {
      toast.success('Tiltmeter instrument updated successfully!');
      setTimeout(() => {
        navigate(-1);
      }, 2000);
    }
  };

  // Email field handlers
  const addEmailField = () => {
    setEmailsForAlert([...EmailsForAlert, '']);
  };
  const removeEmailField = (index: number): void => {
    const updatedEmails = [...EmailsForAlert];
    updatedEmails.splice(index, 1);
    setEmailsForAlert(updatedEmails);
  };
  const addWarnEmailField = () => {
    setEmailsForWarning([...EmailsForWarning, '']);
  };
  const removeWarnEmailField = (index: number): void => {
    const updatedEmails = [...EmailsForWarning];
    updatedEmails.splice(index, 1);
    setEmailsForWarning(updatedEmails);
  };
  const addShutEmailField = () => {
    setShutEmailsForAlert([...ShutEmailsForAlert, '']);
  };
  const removeShutEmailField = (index: number): void => {
    const updatedEmails = [...ShutEmailsForAlert];
    updatedEmails.splice(index, 1);
    setShutEmailsForAlert(updatedEmails);
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton  />
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
              Edit Tiltmeter Instrument for: {project?.name || 'No Project Selected'}
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
              <Box display="grid" gridTemplateColumns="1fr 1fr 1fr 1fr" gap={2} width="100%" mb={2}>
                <TextField
                  label="Instrument ID"
                  required
                  value={instrumentIdSecond}
                  onChange={(e) => setInstrumentIdSecond(e.target.value)}
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
                  label="Instrument Location"
                  value={instrumentLocation}
                  onChange={(e) => setInstrumentLocation(e.target.value)}
                  fullWidth
                />
                <TextField
                  label="Serial Number"
                  required
                  value={instrumentSno}
                  onChange={(e) => setInstrumentSno(e.target.value)}
                  fullWidth
                />
              </Box>
              <Tabs value={alertTab} onChange={(_, v) => setAlertTab(v)} sx={{ width: '100%', mb: 2 }}>
                <Tab label="Instant Threshold Alerts" />
                <Tab label="Duration Achieved Alerts" />
              </Tabs>
              {alertTab === 0 && (
              <>
              {/* Alert Thresholds (Tiltmeter) */}
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                <Box display="flex" flexDirection="column" gap={1} width="100%">
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    Alert Thresholds (Tiltmeter)
                  </Typography>
                  <TextField
                    label="Alert X"
                    type="number"
                    value={xyzAlertValues.x}
                    onChange={(e) => setXyzAlertValues({...xyzAlertValues, x: e.target.value})}
                    fullWidth
                  />
                  <TextField
                    label="Alert Y"
                    type="number"
                    value={xyzAlertValues.y}
                    onChange={(e) => setXyzAlertValues({...xyzAlertValues, y: e.target.value})}
                    fullWidth
                  />
                  <TextField
                    label="Alert Z"
                    type="number"
                    value={xyzAlertValues.z}
                    onChange={(e) => setXyzAlertValues({...xyzAlertValues, z: e.target.value})}
                    fullWidth
                  />
                </Box>
                <Box display="flex" flexDirection="column" gap={1} width="100%">
                  {EmailsForAlert.map((email, i) => (
                    <Box key={i} display="flex" alignItems="center" gap={1} width="100%">
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
              {/* Warning Thresholds (Tiltmeter) */}
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                <Box display="flex" flexDirection="column" gap={1} width="100%">
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    Warning Thresholds (Tiltmeter)
                  </Typography>
                  <TextField
                    label="Warning X"
                    type="number"
                    value={xyzWarningValues.x}
                    onChange={(e) => setXyzWarningValues({...xyzWarningValues, x: e.target.value})}
                    fullWidth
                  />
                  <TextField
                    label="Warning Y"
                    type="number"
                    value={xyzWarningValues.y}
                    onChange={(e) => setXyzWarningValues({...xyzWarningValues, y: e.target.value})}
                    fullWidth
                  />
                  <TextField
                    label="Warning Z"
                    type="number"
                    value={xyzWarningValues.z}
                    onChange={(e) => setXyzWarningValues({...xyzWarningValues, z: e.target.value})}
                    fullWidth
                  />
                </Box>
                <Box display="flex" flexDirection="column" gap={1} width="100%">
                  {EmailsForWarning.map((email, i) => (
                    <Box key={i} display="flex" alignItems="center" gap={1} width="100%">
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
              {/* Shutdown Thresholds (Tiltmeter) */}
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                <Box display="flex" flexDirection="column" gap={1} width="100%">
                  <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                    Shutdown Thresholds (Tiltmeter)
                  </Typography>
                  <TextField
                    label="Shutdown X"
                    type="number"
                    value={xyzShutdownValues.x}
                    onChange={(e) => setXyzShutdownValues({...xyzShutdownValues, x: e.target.value})}
                    fullWidth
                  />
                  <TextField
                    label="Shutdown Y"
                    type="number"
                    value={xyzShutdownValues.y}
                    onChange={(e) => setXyzShutdownValues({...xyzShutdownValues, y: e.target.value})}
                    fullWidth
                  />
                  <TextField
                    label="Shutdown Z"
                    type="number"
                    value={xyzShutdownValues.z}
                    onChange={(e) => setXyzShutdownValues({...xyzShutdownValues, z: e.target.value})}
                    fullWidth
                  />
                </Box>
                <Box display="flex" flexDirection="column" gap={1} width="100%">
                  {ShutEmailsForAlert.map((email, i) => (
                    <Box key={i} display="flex" alignItems="center" gap={1} width="100%">
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
              </>
              )}

              {alertTab === 1 && (
              <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, width: '100%' }}>
                Alert when any axis stays above the duration threshold for the configured seconds.
              </Typography>
              <Box width="100%" mb={2}>
                <TextField
                  label="Duration (seconds)"
                  type="number"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(e.target.value)}
                  fullWidth
                />
              </Box>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography variant="h6">Duration Alert (X/Y/Z)</Typography>
                  <TextField label="Alert X" type="number" value={xyzDurationAlertValues.x} onChange={(e) => setXyzDurationAlertValues({...xyzDurationAlertValues, x: e.target.value})} fullWidth />
                  <TextField label="Alert Y" type="number" value={xyzDurationAlertValues.y} onChange={(e) => setXyzDurationAlertValues({...xyzDurationAlertValues, y: e.target.value})} fullWidth />
                  <TextField label="Alert Z" type="number" value={xyzDurationAlertValues.z} onChange={(e) => setXyzDurationAlertValues({...xyzDurationAlertValues, z: e.target.value})} fullWidth />
                </Box>
                <Box display="flex" flexDirection="column" gap={1}>
                  {DurationEmailsForAlert.map((email, i) => (
                    <Box key={i} display="flex" gap={1}>
                      <TextField label={`Dur. Alert Email ${i + 1}`} type="email" value={email} onChange={(e) => { const u = [...DurationEmailsForAlert]; u[i] = e.target.value; setDurationEmailsForAlert(u); }} fullWidth />
                      <Button size="small" color="error" onClick={() => setDurationEmailsForAlert(DurationEmailsForAlert.filter((_, idx) => idx !== i))}>❌</Button>
                    </Box>
                  ))}
                  <Button variant="outlined" onClick={() => setDurationEmailsForAlert([...DurationEmailsForAlert, ''])}>Add Email</Button>
                </Box>
              </Box>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography variant="h6">Duration Warning (X/Y/Z)</Typography>
                  <TextField label="Warning X" type="number" value={xyzDurationWarningValues.x} onChange={(e) => setXyzDurationWarningValues({...xyzDurationWarningValues, x: e.target.value})} fullWidth />
                  <TextField label="Warning Y" type="number" value={xyzDurationWarningValues.y} onChange={(e) => setXyzDurationWarningValues({...xyzDurationWarningValues, y: e.target.value})} fullWidth />
                  <TextField label="Warning Z" type="number" value={xyzDurationWarningValues.z} onChange={(e) => setXyzDurationWarningValues({...xyzDurationWarningValues, z: e.target.value})} fullWidth />
                </Box>
                <Box display="flex" flexDirection="column" gap={1}>
                  {DurationEmailsForWarning.map((email, i) => (
                    <Box key={i} display="flex" gap={1}>
                      <TextField label={`Dur. Warning Email ${i + 1}`} type="email" value={email} onChange={(e) => { const u = [...DurationEmailsForWarning]; u[i] = e.target.value; setDurationEmailsForWarning(u); }} fullWidth />
                      <Button size="small" color="error" onClick={() => setDurationEmailsForWarning(DurationEmailsForWarning.filter((_, idx) => idx !== i))}>❌</Button>
                    </Box>
                  ))}
                  <Button variant="outlined" onClick={() => setDurationEmailsForWarning([...DurationEmailsForWarning, ''])}>Add Email</Button>
                </Box>
              </Box>
              <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography variant="h6">Duration Shutdown (X/Y/Z)</Typography>
                  <TextField label="Shutdown X" type="number" value={xyzDurationShutdownValues.x} onChange={(e) => setXyzDurationShutdownValues({...xyzDurationShutdownValues, x: e.target.value})} fullWidth />
                  <TextField label="Shutdown Y" type="number" value={xyzDurationShutdownValues.y} onChange={(e) => setXyzDurationShutdownValues({...xyzDurationShutdownValues, y: e.target.value})} fullWidth />
                  <TextField label="Shutdown Z" type="number" value={xyzDurationShutdownValues.z} onChange={(e) => setXyzDurationShutdownValues({...xyzDurationShutdownValues, z: e.target.value})} fullWidth />
                </Box>
                <Box display="flex" flexDirection="column" gap={1}>
                  {DurationShutEmailsForAlert.map((email, i) => (
                    <Box key={i} display="flex" gap={1}>
                      <TextField label={`Dur. Shutdown Email ${i + 1}`} type="email" value={email} onChange={(e) => { const u = [...DurationShutEmailsForAlert]; u[i] = e.target.value; setDurationShutEmailsForAlert(u); }} fullWidth />
                      <Button size="small" color="error" onClick={() => setDurationShutEmailsForAlert(DurationShutEmailsForAlert.filter((_, idx) => idx !== i))}>❌</Button>
                    </Box>
                  ))}
                  <Button variant="outlined" onClick={() => setDurationShutEmailsForAlert([...DurationShutEmailsForAlert, ''])}>Add Email</Button>
                </Box>
              </Box>
              </>
              )}

              {/* Submit Button */}
              <Box mt={4} textAlign="center">
                <Button type="submit" variant="contained" color="primary">
                  Update Tiltmeter Instrument
                </Button>
              </Box>
            </Box>
          </Box>
          <Box mt={6} textAlign="center" fontSize="0.9rem">
            © 2025 DGMTS. All rights reserved.
          </Box>
        </Container>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm Tiltmeter Instrument Update</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to update the tiltmeter instrument <strong>{instrumentName}</strong>? 
              This will modify the instrument information and thresholds.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmUpdate} variant="contained" color="primary" autoFocus>
              Update Instrument
            </Button>
          </DialogActions>
        </Dialog>
      </MainContentWrapper>
    </>
  );
};

export default EditTiltmeterInstrument; 