import React, { useState } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { Button, TextField, Box, Typography } from '@mui/material';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MainContentWrapper from '../components/MainContentWrapper';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
const AddProjects: React.FC = () => {
    const navigate = useNavigate();
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);
    const [formErrors, setFormErrors] = useState({
        endDate: false
    });

    const handleAddProject = async (event: React.FormEvent) => {
        event.preventDefault();
        
        if (endDate && startDate && endDate <= startDate) {
            setFormErrors({ ...formErrors, endDate: true });
            toast.error("End date must be after start date");
            return;
        }

        const formData = new FormData(event.currentTarget as HTMLFormElement);
        const projectName = formData.get('projectName') as string;
        const client = formData.get('client') as string;
        const location = formData.get('location') as string;
        const projectId = formData.get('projectId') as string;
        const email = formData.get('email') as string;
        const phone = formData.get('phone') as string;
        const pocName = formData.get('pocName') as string;
        const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
        const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;

        const { data, error } = await supabase
            .from('Projects')
            .insert([{
                id: projectId,
                name: projectName,
                client: client,
                location: location,
                Email: email,
                Phone:phone,
                'POC Name': pocName,
                'Start_Date': formattedStartDate,
                'End_Date': formattedEndDate,
                instrumentIds: []
            }]);

        if (error) {
            console.error("Error adding project:", error.message);
            toast.error("Error adding project: " + error.message);
        } else {
            console.log("Project added successfully:", data);
            toast.success("Project added successfully!");
            // navigate in two seconds
            setTimeout(() => {
                navigate('/projects-list');
            }, 2000);
        }
    };

    return (
        <>
            <HeaNavLogo />
            <MainContentWrapper>
                <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                    <Button variant="contained" color="primary" onClick={() => navigate('/projects-list')}>
                        Back to Projects
                    </Button>
                </Box>

                <Box component="form" onSubmit={handleAddProject} sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    mt: 4,
                    maxWidth: 500,
                    mx: 'auto',
                    p: 3,
                    boxShadow: 1,
                    borderRadius: 1
                }}>
                    <Typography variant="h5" sx={{ mb: 3 }}>Add Project</Typography>

                    <TextField
                        name="projectId"
                        label="Project ID"
                        required
                        fullWidth
                        margin="normal"
                    />

                    <TextField
                        name="projectName"
                        label="Project Name"
                        required
                        fullWidth
                        margin="normal"
                    />

                    <TextField
                        name="client"
                        label="Client"
                        required
                        fullWidth
                        margin="normal"
                    />

                    <TextField
                        name="location"
                        label="Location"
                        required
                        fullWidth
                        margin="normal"
                    />

                    <TextField
                        name="email"
                        label="Email"
                        type="email"
                        required
                        fullWidth
                        margin="normal"
                    />

                    <TextField
                        name="phone"
                        label="Phone"
                        required
                        fullWidth
                        margin="normal"
                    />

                    <TextField
                        name="pocName"
                        label="POC Name"
                        required
                        fullWidth
                        margin="normal"
                    />

                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <Box sx={{ width: '100%', mt: 2 }}>
                            <DatePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        margin: 'normal',
                                        required: true,
                                    },
                                }}
                            />
                        </Box>

                        <Box sx={{ width: '100%', mt: 2 }}>
                            <DatePicker
                                label="End Date"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                                minDate={startDate || undefined}
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        margin: 'normal',
                                        required: true,
                                        error: formErrors.endDate,
                                        helperText: formErrors.endDate ? "End date must be after start date" : "",
                                    },
                                }}
                            />
                        </Box>
                    </LocalizationProvider>

                    <Button 
                        type="submit" 
                        variant="contained" 
                        color="primary" 
                        fullWidth
                        sx={{ mt: 3, py: 1.5 }}
                    >
                        Add Project
                    </Button>
                </Box>
            </MainContentWrapper>
        </>
    );
}

export default AddProjects;