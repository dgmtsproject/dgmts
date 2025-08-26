import React, { useState, useEffect } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { Button, TextField, Box, Typography, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO } from 'date-fns';

const EditProject: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const project = location.state?.project;
  const availableStatuses = ['In Progress', 'Planning','Not Started', 'Completed'];

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [formValues, setFormValues] = useState({
    name: '',
    client: '',
    location: '',
    email: '',
    phone: '',
    pocName: '',
    status: '',
    projectIdSecond: '',
  });
  const [formErrors, setFormErrors] = useState({ endDate: false });

  useEffect(() => {
    if (project) {
      setFormValues({
        name: project.name || '',
        client: project.client || '',
        location: project.location || '',
        email: project.Email || '',
        phone: project.Phone || '',
        pocName: project['POC Name'] || '',
        status: project.Status || '',
        projectIdSecond: project.project_id_second || project.id || '',
      });
      setStartDate(project.Start_Date ? parseISO(project.Start_Date) : null);
      setEndDate(project.End_Date ? parseISO(project.End_Date) : null);
    }
  }, [project]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormValues({ ...formValues, [e.target.name]: e.target.value });
  };

  const handleStatusChange = (e: any) => {
    setFormValues({ ...formValues, status: e.target.value });
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (endDate && startDate && endDate <= startDate) {
      setFormErrors({ ...formErrors, endDate: true });
      toast.error('End date must be after start date');
      return;
    }
    // Show confirmation dialog
    setConfirmDialogOpen(true);
  };

  const confirmUpdateProject = async () => {
    setConfirmDialogOpen(false);
    
    const formattedStartDate = startDate ? format(startDate, 'yyyy-MM-dd') : null;
    const formattedEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : null;
    const { error } = await supabase
      .from('Projects')
      .update({
        name: formValues.name,
        client: formValues.client,
        location: formValues.location,
        Email: formValues.email,
        Phone: formValues.phone,
        'POC Name': formValues.pocName,
        Start_Date: formattedStartDate,
        End_Date: formattedEndDate,
        status: formValues.status,
        project_id_second: formValues.projectIdSecond,
      })
      .eq('id', project.id);
    if (error) {
      console.error('Error updating project:', error);
      // Handle unique constraint violation for project_id_second
      if (error.code === '23505' && error.message.includes('project_id_second')) {
        toast.error('Project ID already exists. Please choose a different Project ID.');
      } else {
        toast.error('Error updating project: ' + error.message);
      }
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
        <BackButton to="/dashboard" />
        <ToastContainer position="top-right" autoClose={3000} />
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button variant="contained" color="primary" onClick={() => navigate('/projects-list')}>
            Back to Projects
          </Button>
        </Box>
        <Box component="form" onSubmit={handleSubmit} sx={{
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
            name="projectIdSecond"
            label="Project ID"
            value={formValues.projectIdSecond}
            onChange={handleChange}
            required
            fullWidth
            margin="normal"
          />
          <TextField
            name="name"
            label="Project Name"
            value={formValues.name}
            onChange={handleChange}
            required
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
          <FormControl fullWidth margin="normal">
            <InputLabel id="status-select-label">Status</InputLabel>
            <Select
              labelId="status-select-label"
              value={formValues.status}
              onChange={handleStatusChange}
              label="Status"
              required
            >
              {availableStatuses.map((status) => (
                <MenuItem key={status} value={status}>
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
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

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm Project Update</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to update the project <strong>{formValues.name}</strong>? 
              This will modify the project information.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmUpdateProject} variant="contained" color="primary" autoFocus>
              Update Project
            </Button>
          </DialogActions>
        </Dialog>
      </MainContentWrapper>
    </>
  );
};

export default EditProject; 