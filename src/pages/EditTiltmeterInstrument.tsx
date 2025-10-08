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
  DialogActions
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

  const [instrumentId, setInstrumentId] = useState(instrument?.instrument_id || '');
  const [instrumentName, setInstrumentName] = useState(instrument?.instrument_name || '');
  const [instrumentLocation, setInstrumentLocation] = useState(instrument?.instrument_location || '');
  const [instrumentSno, setInstrumentSno] = useState(instrument?.sno || '');
  const [project, _setProject] = useState({ id: instrument?.project_id, name: instrument?.project_name || '' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

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
    const updateData: any = {
      instrument_id: instrumentId,
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
      alert_value: null,
      warning_value: null,
      shutdown_value: null
    };
    const { error } = await supabase
      .from('instruments')
      .update(updateData)
      .eq('instrument_id', instrument.instrument_id);
    if (error) {
      toast.error('Error updating tiltmeter instrument!');
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