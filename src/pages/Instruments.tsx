import React from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container
} from '@mui/material';
import logo from '../assets/logo.jpg';
import HeaNavLogo from '../components/HeaNavLogo';
import { supabase } from '../supabase';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const Instruments: React.FC = () => {
  const location = useLocation();
  const project = location.state?.project;

  const [EmailsForAlert, setEmailsForAlert] = React.useState<string[]>(['']);
  const [EmailsForWarning, setEmailsForWarning] = React.useState<string[]>(['']);
  const [ShutEmailsForAlert, setShutEmailsForAlert] = React.useState<string[]>(['']);
  const [instrumentId, setInstrumentId] = React.useState('');
  const [instrumentName, setInstrumentName] = React.useState('');
  const [alertValue, setAlertValue] = React.useState<number | string>('');
  const [warningValue, setWarningValue] = React.useState<number | string>('');
  const [shutdownValue, setShutdownValue] = React.useState<number | string>('');

  const addEmailField = () => setEmailsForAlert([...EmailsForAlert, '']);
  const addWarnEmailField = () => setEmailsForWarning([...EmailsForWarning, '']);
  const addShutEmailField = () => setShutEmailsForAlert([...ShutEmailsForAlert, '']);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailData = {
      alert_emails: EmailsForAlert,
      warning_emails: EmailsForWarning,
      shutdown_emails: ShutEmailsForAlert,
    };

  
    const { data, error } = await supabase.from('instruments').insert([
      {
        instrument_id: instrumentId,
        instrument_name: instrumentName,
        alert_value: alertValue,
        warning_value: warningValue,
        shutdown_value: shutdownValue,
        project_id: project?.id, 
        alert_emails: emailData.alert_emails,
        warning_emails: emailData.warning_emails,
        shutdown_emails: emailData.shutdown_emails,
      },
    ]);

    if (error) {
      console.error('Error adding instrument:', error.message);
    } else {
      console.log('Instrument added successfully:', data);
      toast.success('Instrument added successfully!');
    }
  };

  return (
    <>
      <HeaNavLogo />
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
            Instruments for: {project?.name || 'No Project Selected'} 
          </Typography>

          <Box
            component="form"
            sx={{ mt: 4 }}
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            margin="0 auto"
            padding="20px"
            onSubmit={handleSubmit} // Add the form submit handler
          >
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TextField
                label="Instrument ID"
                required
                value={instrumentId}
                onChange={(e) => setInstrumentId(e.target.value)}
              />
              <TextField
                label="Instrument Name"
                required
                value={instrumentName}
                onChange={(e) => setInstrumentName(e.target.value)}
              />
            </Box>

            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TextField
                label="Alert Value"
                type="number"
                required
                value={alertValue}
                onChange={(e) => setAlertValue(e.target.value)}
              />
              {EmailsForAlert.map((_, i) => (
                <TextField
                  key={i}
                  label="Alert Email"
                  type="email"
                  required
                  value={EmailsForAlert[i]}
                  onChange={(e) => {
                    const updatedEmails = [...EmailsForAlert];
                    updatedEmails[i] = e.target.value;
                    setEmailsForAlert(updatedEmails);
                  }}
                />
              ))}
              <Button variant="contained" color="primary" onClick={addEmailField}>
                Add +
              </Button>
            </Box>

            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TextField
                label="Warning Value"
                type="number"
                required
                value={warningValue}
                onChange={(e) => setWarningValue(e.target.value)}
              />
              {EmailsForWarning.map((_, i) => (
                <TextField
                  key={i}
                  label="Warning Email"
                  type="email"
                  required
                  value={EmailsForWarning[i]}
                  onChange={(e) => {
                    const updatedEmails = [...EmailsForWarning];
                    updatedEmails[i] = e.target.value;
                    setEmailsForWarning(updatedEmails);
                  }}
                />
              ))}
              <Button variant="contained" color="primary" onClick={addWarnEmailField}>
                Add +
              </Button>
            </Box>

            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <TextField
                label="Shutdown Value"
                type="number"
                required
                value={shutdownValue}
                onChange={(e) => setShutdownValue(e.target.value)}
              />
              {ShutEmailsForAlert.map((_, i) => (
                <TextField
                  key={i}
                  label="Shutdown Email"
                  type="email"
                  required
                  value={ShutEmailsForAlert[i]}
                  onChange={(e) => {
                    const updatedEmails = [...ShutEmailsForAlert];
                    updatedEmails[i] = e.target.value;
                    setShutEmailsForAlert(updatedEmails);
                  }}
                />
              ))}
              <Button variant="contained" color="primary" onClick={addShutEmailField}>
                Add +
              </Button>
            </Box>

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
    </>
  );
};

export default Instruments;