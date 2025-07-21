import React, { useState, useEffect } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { Button, TextField, Box, Typography } from '@mui/material';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainContentWrapper from '../components/MainContentWrapper';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';

const EditProject: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const project = location.state?.project;

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [formValues, setFormValues] = useState({
    client: '',
    location: '',
    email: '',
    phone: '',
    pocName: '',
  });
  const [formErrors, setFormErrors] = useState({ endDate: false });

  useEffect(() => {
    if (project) {
      setFormValues({
        client: project.client || '',
        location: project.location || '',
        email: project.Email || '',
        phone: project.Phone || '',
        pocName: project['POC Name'] || '',
      });
      setStartDate(project.Start_Date ? parseISO(project.Start_Date) : null);
      setEndDate(project.End_Date ? parseISO(project.End_Date) : null);
    }
  }, [project]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleUpdateProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (endDate && startDate && endDate <= startDate) {
      setFormErrors({ ...formErrors, endDate: true });
      toast.error('End date must be after start date');
      return;
    }
    const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
    const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;
    const { error } = await supabase
      .from('Projects')
      .update({
        client: formValues.client,
        location: formValues.location,
        Email: formValues.email,
        Phone: formValues.phone,
        'POC Name': formValues.pocName,
        Start_Date: formattedStartDate,
        End_Date: formattedEndDate,
      })
      .eq('id', project.id);
    if (error) {
      toast.error('Error updating project: ' + error.message);
    } else {
      toast.success('Project updated successfully!');
      setTimeout(() => {
        navigate('/projects-list');
      }, 2000);
    }
  };

  if (!project) {
    return <Typography variant="h6">No project data found.</Typography>;
  }

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <ToastContainer position="top-right" autoClose={3000} />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button variant="contained" color="primary" onClick={() => navigate('/projects-list')}>
            Back to Projects
          </Button>
        </Box>
        <Box component="form" onSubmit={handleUpdateProject} sx={{
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
          <Typography variant="h5" sx={{ mb: 3 }}>Edit Project</Typography>
          <TextField
            name="projectId"
            label="Project ID"
            value={project.id}
            disabled
            fullWidth
            margin="normal"
          />
          <TextField
            name="projectName"
            label="Project Name"
            value={project.name}
            disabled
            fullWidth
            margin="normal"
          />
          <TextField
            name="client"
            label="Client"
            value={formValues.client}
            onChange={handleChange}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            name="location"
            label="Location"
            value={formValues.location}
            onChange={handleChange}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            name="email"
            label="Email"
            type="email"
            value={formValues.email}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="phone"
            label="Phone"
            value={formValues.phone}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            name="pocName"
            label="POC Name"
            value={formValues.pocName}
            onChange={handleChange}
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
                    error: formErrors.endDate,
                    helperText: formErrors.endDate ? 'End date must be after start date' : '',
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
            Update Project
          </Button>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default EditProject; 