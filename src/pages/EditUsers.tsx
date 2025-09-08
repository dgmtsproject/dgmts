import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Autocomplete,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { supabase } from '../supabase';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Project = {
  id: number;
  name: string;
};

const EditUsers: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = location.state || {};
  
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    company: '',
    position: '',
    phone: ''
  });

  useEffect(() => {
    if (!user) {
      toast.error('No user data provided');
      navigate('/permissions');
      return;
    }

    // Initialize form data with user data
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '', // Don't populate password for security
      company: user.Company || '',
      position: user.Position || '',
      phone: user['Phone No'] || ''
    });

    // Fetch all projects
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
      } else {
        setProjects(data || []);
      }
    };

    // Fetch current user's projects
    const fetchUserProjects = async () => {
      const { data, error } = await supabase
        .from('ProjectUsers')
        .select('project_id, Projects(id, name)')
        .eq('user_email', user.email);

      if (error) {
        console.error('Error fetching user projects:', error);
      } else {
        const userProjs = (data || []).map((item: any) => item.Projects).filter(Boolean);
        setSelectedProjects(userProjs);
      }
    };

    fetchProjects();
    fetchUserProjects();
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Show confirmation dialog
    setConfirmDialogOpen(true);
  };

  const confirmUpdate = async () => {
    setLoading(true);
    setConfirmDialogOpen(false);

    try {
      // Prepare update data (exclude password if empty)
      const updateData: any = {
        username: formData.username,
        email: formData.email,
        Company: formData.company,
        Position: formData.position,
        'Phone No': formData.phone
      };

      // Only include password if it's not empty
      if (formData.password.trim()) {
        updateData.password = formData.password;
      }

      // 1. Update user in users table
      const { error: userError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (userError) throw userError;

      // 2. Handle project assignments
      // Remove all current project assignments
      const { error: deleteError } = await supabase
        .from('ProjectUsers')
        .delete()
        .eq('user_email', user.email);

      if (deleteError) throw deleteError;

      // Add new project assignments
      if (selectedProjects.length > 0) {
        const inserts = selectedProjects.map(project =>
          supabase.from('ProjectUsers').insert({
            project_id: project.id,
            user_email: formData.email // Use new email if changed
          })
        );
        const results = await Promise.all(inserts);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) throw errors[0].error;
      }

      toast.success('User updated successfully!');
      setTimeout(() => navigate('/permissions'), 2000);
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton />
        <ToastContainer position="top-right" autoClose={3000} />
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Typography variant="h4" gutterBottom>Edit User</Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            
            <TextField
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              margin="normal"
              required
            />

            <TextField
              fullWidth
              label="Password (leave blank to keep current)"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              helperText="Only fill this if you want to change the password"
            />
            
            <TextField
              fullWidth
              label="Company"
              name="company"
              value={formData.company}
              onChange={handleInputChange}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Position"
              name="position"
              value={formData.position}
              onChange={handleInputChange}
              margin="normal"
            />
            
            <TextField
              fullWidth
              label="Phone Number"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              margin="normal"
            />

            <Autocomplete
              multiple
              options={projects}
              getOptionLabel={(option) => option.name}
              value={selectedProjects}
              onChange={(_event, newValue) => setSelectedProjects(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Assign to Projects"
                  margin="normal"
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {option.name}
                </li>
              )}
            />

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
              <Button variant="outlined" onClick={() => navigate('/permissions')}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading}
                sx={{ px: 4, py: 1.5 }}
              >
                {loading ? 'Updating...' : 'Update User'}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
          <DialogTitle>Confirm User Update</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to update the user <strong>{formData.username}</strong> ({formData.email})? 
              This will modify their personal information and project assignments.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialogOpen(false)} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmUpdate} variant="contained" color="primary" autoFocus>
              Update User
            </Button>
          </DialogActions>
        </Dialog>
      </MainContentWrapper>
    </>
  );
};

export default EditUsers; 