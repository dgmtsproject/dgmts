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
    MenuItem,
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
import {
  InstrumentOwnership,
  INSTRUMENT_OWNERSHIP_OPTIONS,
  normalizeInstrumentOwnership,
  defaultOwnershipForInstrument,
} from '../utils/instrumentOwnership';

const EditInstrument: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { instrument } = location.state || {};
    const { isAdmin } = useAdminContext();

    type Project = {
        id: string;
        name: string;
    };

    const [project, setProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const parseEmails = (emails: any) => {
        if (Array.isArray(emails)) return emails;
        if (typeof emails === 'string') {
            return emails.split(',').map((e: string) => e.trim()).filter((e: string) => e);
        }
        return [''];
    };

    const [EmailsForAlert, setEmailsForAlert] = useState<string[]>(
        parseEmails(instrument?.alert_emails)
    );
    const [EmailsForWarning, setEmailsForWarning] = useState<string[]>(
        parseEmails(instrument?.warning_emails)
    );
    const [ShutEmailsForAlert, setShutEmailsForAlert] = useState<string[]>(
        parseEmails(instrument?.shutdown_emails)
    );
    const [instrumentIdSecond, setInstrumentIdSecond] = useState(
        instrument?.instrument_id_second || instrument?.instrument_id || ''
    );
    const [instrumentName, setInstrumentName] = useState(instrument?.instrument_name || '');
    const [instrumentLocation, setInstrumentLocation] = useState(instrument?.instrument_location || '');
    const [serialNumber, setSerialNumber] = useState(instrument?.sno || '');
    const [ownership, setOwnership] = useState<InstrumentOwnership>(
      normalizeInstrumentOwnership(
        instrument?.ownership ??
          defaultOwnershipForInstrument({
            instrument_id: instrument?.instrument_id,
            instrument_name: instrument?.instrument_name,
          })
      )
    );
    const [alertValue, setAlertValue] = useState<number | string>(instrument?.alert_value || '');
    const [warningValue, setWarningValue] = useState<number | string>(instrument?.warning_value || '');
    const [shutdownValue, setShutdownValue] = useState<number | string>(instrument?.shutdown_value || '');
    const [alertTab, setAlertTab] = useState(0);

    const [durationSeconds, setDurationSeconds] = useState<number | string>(instrument?.duration_seconds || '');
    const [durationAlertValue, setDurationAlertValue] = useState<number | string>(instrument?.duration_alert_value || '');
    const [durationWarningValue, setDurationWarningValue] = useState<number | string>(instrument?.duration_warning_value || '');
    const [durationShutdownValue, setDurationShutdownValue] = useState<number | string>(instrument?.duration_shutdown_value || '');
    const [DurationEmailsForAlert, setDurationEmailsForAlert] = useState<string[]>(parseEmails(instrument?.duration_alert_emails));
    const [DurationEmailsForWarning, setDurationEmailsForWarning] = useState<string[]>(parseEmails(instrument?.duration_warning_emails));
    const [DurationShutEmailsForAlert, setDurationShutEmailsForAlert] = useState<string[]>(parseEmails(instrument?.duration_shutdown_emails));

    // Restrict access to only admins
    useEffect(() => {
        if (!isAdmin) {
            toast.error('You do not have permission to edit instruments.');
            navigate('/projects-list');
        }
    }, [isAdmin, navigate]);

    useEffect(() => {
        if (instrument) {
            setProject({ id: instrument.project_id, name: instrument.project_name || '' });
            setEmailsForAlert(parseEmails(instrument.alert_emails));
            setEmailsForWarning(parseEmails(instrument.warning_emails));
            setShutEmailsForAlert(parseEmails(instrument.shutdown_emails));
            setInstrumentIdSecond(instrument.instrument_id_second || instrument.instrument_id || '');
            setInstrumentName(instrument.instrument_name || '');
            setInstrumentLocation(instrument.instrument_location || '');
            setSerialNumber(instrument.sno || '');
            setOwnership(
              normalizeInstrumentOwnership(
                instrument.ownership ??
                  defaultOwnershipForInstrument({
                    instrument_id: instrument.instrument_id,
                    instrument_name: instrument.instrument_name,
                  })
              )
            );
            setAlertValue(instrument.alert_value || '');
            setWarningValue(instrument.warning_value || '');
            setShutdownValue(instrument.shutdown_value || '');
            setDurationSeconds(instrument.duration_seconds || '');
            setDurationAlertValue(instrument.duration_alert_value || '');
            setDurationWarningValue(instrument.duration_warning_value || '');
            setDurationShutdownValue(instrument.duration_shutdown_value || '');
            setDurationEmailsForAlert(parseEmails(instrument.duration_alert_emails));
            setDurationEmailsForWarning(parseEmails(instrument.duration_warning_emails));
            setDurationShutEmailsForAlert(parseEmails(instrument.duration_shutdown_emails));
        } else {
            fetchProjects();
        }
    }, [instrument]);

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

        const emailData = {
            alert_emails: filteredAlertEmails.length > 0 ? filteredAlertEmails : null,
            warning_emails: filteredWarningEmails.length > 0 ? filteredWarningEmails : null,
            shutdown_emails: filteredShutdownEmails.length > 0 ? filteredShutdownEmails : null,
        };

        const durationData = {
            duration_seconds: durationSeconds ? Number(durationSeconds) : null,
            duration_alert_value: durationAlertValue ? Number(durationAlertValue) : null,
            duration_warning_value: durationWarningValue ? Number(durationWarningValue) : null,
            duration_shutdown_value: durationShutdownValue ? Number(durationShutdownValue) : null,
            duration_alert_emails: filteredDurationAlertEmails.length > 0 ? filteredDurationAlertEmails : null,
            duration_warning_emails: filteredDurationWarningEmails.length > 0 ? filteredDurationWarningEmails : null,
            duration_shutdown_emails: filteredDurationShutdownEmails.length > 0 ? filteredDurationShutdownEmails : null,
        };

        if (instrument) {
            if (!project) {
                toast.error('No project selected!');
                return;
            }
            
            const { error } = await supabase
                .from('instruments')
                .update({
                    instrument_id_second: instrumentIdSecond,
                    instrument_name: instrumentName,
                    instrument_location: instrumentLocation || null,
                    sno: serialNumber,
                    ownership,
                    project_id: project.id,
                    alert_emails: emailData.alert_emails,
                    warning_emails: emailData.warning_emails,
                    shutdown_emails: emailData.shutdown_emails,
                    alert_value: alertValue ? Number(alertValue) : null,
                    warning_value: warningValue ? Number(warningValue) : null,
                    shutdown_value: shutdownValue ? Number(shutdownValue) : null,
                    ...durationData,
                })
                .eq('instrument_id', instrument.instrument_id);

            if (error) {
                console.error('Error updating instrument:', error.message);
                if (error.code === '23505' && error.message.includes('instrument_id_second')) {
                    toast.error('Instrument ID already exists. Please choose a different Instrument ID.');
                } else if (error.code === '23505' || error.message.includes('duplicate key value violates unique constraint')) {
                    toast.error('Instrument ID already exists! Please use a different ID.');
                } else {
                    toast.error('Error updating instrument!');
                }
            } else {
                toast.success('Instrument updated successfully!');
                setTimeout(() => {
                    navigate(-1);
                }, 2000);

            }
        } else {
            if (!project) {
                toast.error('No project selected!');
                return;
            }
            
            const { error } = await supabase.from('instruments').insert([
                {
                    instrument_id: instrumentIdSecond,
                    instrument_id_second: instrumentIdSecond,
                    instrument_name: instrumentName,
                    sno: serialNumber,
                    ownership,
                    alert_value: alertValue ? Number(alertValue) : null,
                    warning_value: warningValue ? Number(warningValue) : null,
                    shutdown_value: shutdownValue ? Number(shutdownValue) : null,
                    project_id: project.id,
                    alert_emails: emailData.alert_emails,
                    warning_emails: emailData.warning_emails,
                    shutdown_emails: emailData.shutdown_emails,
                    ...durationData,
                },
            ]);

            if (error) {
                console.error('Error adding instrument:', error.message);
                if (error.code === '23505' || error.message.includes('duplicate key value violates unique constraint')) {
                    toast.error('Instrument ID already exists! Please use a different ID.');
                } else {
                    toast.error('Error adding instrument!');
                }
            } else {
                toast.success('Instrument added successfully!');
                navigate('/instruments', { state: { project } });
            }
        }
    };

    // Email field handlers (same as in add form)
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

    const renderEmailFields = (
        emails: string[],
        setEmails: React.Dispatch<React.SetStateAction<string[]>>,
        labelPrefix: string,
        onRemove: (index: number) => void,
        onAdd: () => void
    ) => (
        <Box display="flex" flexDirection="column" gap={1} width="100%">
            {emails.map((email, i) => (
                <Box key={i} display="flex" alignItems="center" gap={1} width="100%">
                    <TextField
                        label={`${labelPrefix} Email ${i + 1} (optional)`}
                        type="email"
                        value={email}
                        onChange={(e) => {
                            const updatedEmails = [...emails];
                            updatedEmails[i] = e.target.value;
                            setEmails(updatedEmails);
                        }}
                        fullWidth
                    />
                    <Button size="small" color="error" onClick={() => onRemove(i)}>❌</Button>
                </Box>
            ))}
            <Button variant="outlined" onClick={onAdd}>Add {labelPrefix} Email</Button>
        </Box>
    );

    if (!project && !instrument) {
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
                            {instrument ? 'Edit Instrument' : 'Add Instrument'} for: {project?.name || 'No Project Selected'}
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
                            <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={2} width="100%" mb={2}>
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
                                    value={serialNumber}
                                    onChange={(e) => setSerialNumber(e.target.value)}
                                    fullWidth
                                />
                                <FormControl fullWidth>
                                    <InputLabel id="ownership-status-label">Status</InputLabel>
                                    <Select
                                        labelId="ownership-status-label"
                                        label="Status"
                                        value={ownership}
                                        onChange={(e) =>
                                          setOwnership(e.target.value as InstrumentOwnership)
                                        }
                                    >
                                        {INSTRUMENT_OWNERSHIP_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Box>

                            <Tabs value={alertTab} onChange={(_, v) => setAlertTab(v)} sx={{ width: '100%', mb: 2 }}>
                                <Tab label="Instant Threshold Alerts" />
                                <Tab label="Duration Achieved Alerts" />
                            </Tabs>

                            {alertTab === 0 && (
                            <>
                            {/* Instant Alert Values */}
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Alert Value (optional)"
                                    type="number"
                                    value={alertValue}
                                    onChange={(e) => setAlertValue(e.target.value)}
                                    fullWidth
                                />
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
                            {/* Warning Values - instant */}
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Warning Value (optional)"
                                    type="number"
                                    value={warningValue}
                                    onChange={(e) => setWarningValue(e.target.value)}
                                    fullWidth
                                />
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
                            {/* Shutdown Values */}
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Shutdown Value (optional)"
                                    type="number"
                                    value={shutdownValue}
                                    onChange={(e) => setShutdownValue(e.target.value)}
                                    fullWidth
                                />
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
                                Send a separate email when vibration stays above a threshold for the configured duration (seconds).
                            </Typography>
                            <Box width="100%" mb={2}>
                                <TextField
                                    label="Duration (seconds)"
                                    type="number"
                                    value={durationSeconds}
                                    onChange={(e) => setDurationSeconds(e.target.value)}
                                    fullWidth
                                    helperText="How long the value must remain above threshold before alerting"
                                />
                            </Box>
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Duration Alert Value (optional)"
                                    type="number"
                                    value={durationAlertValue}
                                    onChange={(e) => setDurationAlertValue(e.target.value)}
                                    fullWidth
                                />
                                {renderEmailFields(
                                    DurationEmailsForAlert,
                                    setDurationEmailsForAlert,
                                    'Duration Alert',
                                    (i) => setDurationEmailsForAlert(DurationEmailsForAlert.filter((_, idx) => idx !== i)),
                                    () => setDurationEmailsForAlert([...DurationEmailsForAlert, ''])
                                )}
                            </Box>
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Duration Warning Value (optional)"
                                    type="number"
                                    value={durationWarningValue}
                                    onChange={(e) => setDurationWarningValue(e.target.value)}
                                    fullWidth
                                />
                                {renderEmailFields(
                                    DurationEmailsForWarning,
                                    setDurationEmailsForWarning,
                                    'Duration Warning',
                                    (i) => setDurationEmailsForWarning(DurationEmailsForWarning.filter((_, idx) => idx !== i)),
                                    () => setDurationEmailsForWarning([...DurationEmailsForWarning, ''])
                                )}
                            </Box>
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Duration Shutdown Value (optional)"
                                    type="number"
                                    value={durationShutdownValue}
                                    onChange={(e) => setDurationShutdownValue(e.target.value)}
                                    fullWidth
                                />
                                {renderEmailFields(
                                    DurationShutEmailsForAlert,
                                    setDurationShutEmailsForAlert,
                                    'Duration Shutdown',
                                    (i) => setDurationShutEmailsForAlert(DurationShutEmailsForAlert.filter((_, idx) => idx !== i)),
                                    () => setDurationShutEmailsForAlert([...DurationShutEmailsForAlert, ''])
                                )}
                            </Box>
                            </>
                            )}

                            {/* Submit Button */}
                            <Box mt={4} textAlign="center">
                                <Button type="submit" variant="contained" color="primary">
                                    {instrument ? 'Update Instrument' : 'Add Instrument'}
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
                    <DialogTitle>Confirm Instrument Update</DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to {instrument ? 'update' : 'add'} the instrument <strong>{instrumentName}</strong>? 
                            This will {instrument ? 'modify' : 'create'} the instrument information.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={confirmUpdate} variant="contained" color="primary" autoFocus>
                            {instrument ? 'Update' : 'Add'} Instrument
                        </Button>
                    </DialogActions>
                </Dialog>
            </MainContentWrapper>
        </>
    );
};

export default EditInstrument;