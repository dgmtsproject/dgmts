import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import MainContentWrapper from '../components/MainContentWrapper';
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

const EditInstrument: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { instrument } = location.state || {};

    type Project = {
        id: string;
        name: string;
    };

    const [project, setProject] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [EmailsForAlert, setEmailsForAlert] = useState<string[]>(
        instrument?.alert_emails || ['']
    );
    const [instrumentSno, setInstrumentSno] = useState(instrument?.sno || '');
    const [EmailsForWarning, setEmailsForWarning] = useState<string[]>(
        instrument?.warning_emails || ['']
    );
    const [ShutEmailsForAlert, setShutEmailsForAlert] = useState<string[]>(
        instrument?.shutdown_emails || ['']
    );
    const [instrumentId, setInstrumentId] = useState(instrument?.instrument_id || '');
    const [instrumentName, setInstrumentName] = useState(instrument?.instrument_name || '');
    const [alertValue, setAlertValue] = useState<number | string>(instrument?.alert_value || '');
    const [warningValue, setWarningValue] = useState<number | string>(instrument?.warning_value || '');
    const [shutdownValue, setShutdownValue] = useState<number | string>(instrument?.shutdown_value || '');

    useEffect(() => {
        if (instrument) {
            setProject({ id: instrument.project_id, name: instrument.project_name || '' });
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

        const emailData = {
            alert_emails: EmailsForAlert,
            warning_emails: EmailsForWarning,
            shutdown_emails: ShutEmailsForAlert,
        };

        if (instrument) {
            const { error } = await supabase
                .from('instruments')
                .update({
                    instrument_id: instrumentId,
                    instrument_name: instrumentName,
                    alert_value: alertValue,
                    warning_value: warningValue,
                    shutdown_value: shutdownValue,
                    project_id: project.id,
                    alert_emails: emailData.alert_emails,
                    warning_emails: emailData.warning_emails,
                    shutdown_emails: emailData.shutdown_emails,
                    sno: instrumentSno,
                })
                .eq('instrument_id', instrument.instrument_id);

            if (error) {
                console.error('Error updating instrument:', error.message);
                toast.error('Error updating instrument!');
            } else {
                toast.success('Instrument updated successfully!');
                setTimeout(() => {
                    navigate(-1);
                }, 2000);

            }
        } else {
            const { error } = await supabase.from('instruments').insert([
                {
                    instrument_id: instrumentId,
                    instrument_name: instrumentName,
                    alert_value: alertValue,
                    warning_value: warningValue,
                    shutdown_value: shutdownValue,
                    project_id: project.id,
                    alert_emails: emailData.alert_emails,
                    warning_emails: emailData.warning_emails,
                    shutdown_emails: emailData.shutdown_emails,
                    sno: instrumentSno,
                },
            ]);

            if (error) {
                console.error('Error adding instrument:', error.message);
                toast.error('Error adding instrument!');
            } else {
                toast.success('Instrument added successfully!');
                navigate('/instruments', { state: { project } });
            }
        }
    };

    // Email field handlers (same as in add form)
    const addEmailField = () => {
        if (EmailsForAlert.length < 3) {
            setEmailsForAlert([...EmailsForAlert, '']);
        }
    };

    const removeEmailField = (index: number): void => {
        const updatedEmails = [...EmailsForAlert];
        updatedEmails.splice(index, 1);
        setEmailsForAlert(updatedEmails);
    };

    const addWarnEmailField = () => {
        if (EmailsForWarning.length < 3) {
            setEmailsForWarning([...EmailsForWarning, '']);
        }
    };

    const removeWarnEmailField = (index: number): void => {
        const updatedEmails = [...EmailsForWarning];
        updatedEmails.splice(index, 1);
        setEmailsForWarning(updatedEmails);
    };

    const addShutEmailField = () => {
        if (ShutEmailsForAlert.length < 3) {
            setShutEmailsForAlert([...ShutEmailsForAlert, '']);
        }
    };

    const removeShutEmailField = (index: number): void => {
        const updatedEmails = [...ShutEmailsForAlert];
        updatedEmails.splice(index, 1);
        setShutEmailsForAlert(updatedEmails);
    };

    if (!project && !instrument) {
        return (
            <>
                <HeaNavLogo />
                <MainContentWrapper>
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
                                    style={{ width: '100%' }}
                                />
                            </Box>

                            {/* Alert Values */}
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Alert Value"
                                    type="number"
                                    required
                                    value={alertValue}
                                    onChange={(e) => setAlertValue(e.target.value)}
                                    fullWidth
                                />

                                <Box display="flex" flexDirection="column" gap={1}>
                                    {EmailsForAlert.map((email, i) => (
                                        <Box key={i} display="flex" alignItems="center" gap={1}>
                                            <TextField
                                                label={`Alert Email ${i + 1}`}
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

                                    {EmailsForAlert.length < 3 && (
                                        <Button variant="outlined" onClick={addEmailField}>
                                            Add Alert Email
                                        </Button>
                                    )}
                                </Box>
                            </Box>

                            {/* Warning Values */}
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Warning Value"
                                    type="number"
                                    required
                                    value={warningValue}
                                    onChange={(e) => setWarningValue(e.target.value)}
                                    fullWidth
                                />
                                <Box display="flex" flexDirection="column" gap={1}>
                                    {EmailsForWarning.map((email, i) => (
                                        <Box key={i} display="flex" alignItems="center" gap={1}>
                                            <TextField
                                                label={`Warning Email ${i + 1}`}
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
                                    {EmailsForWarning.length < 3 && (
                                        <Button variant="outlined" onClick={addWarnEmailField}>
                                            Add Warning Email
                                        </Button>
                                    )}
                                </Box>
                            </Box>

                            {/* Shutdown Values */}
                            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={2} width="100%" mb={2}>
                                <TextField
                                    label="Shutdown Value"
                                    type="number"
                                    required
                                    value={shutdownValue}
                                    onChange={(e) => setShutdownValue(e.target.value)}
                                    fullWidth
                                />
                                <Box display="flex" flexDirection="column" gap={1}>
                                    {ShutEmailsForAlert.map((email, i) => (
                                        <Box key={i} display="flex" alignItems="center" gap={1}>
                                            <TextField
                                                label={`Shutdown Email ${i + 1}`}
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
                                    {ShutEmailsForAlert.length < 3 && (
                                        <Button variant="outlined" onClick={addShutEmailField}>
                                            Add Shutdown Email
                                        </Button>
                                    )}
                                </Box>
                            </Box>

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
            </MainContentWrapper>
        </>
    );
};

export default EditInstrument;