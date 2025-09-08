import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { 
  TextField, 
  Button, 
  Box, 
  Typography, 
  Autocomplete,
} from '@mui/material';
import { supabase } from '../supabase';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

type Project = {
  id: number; // Changed to number to match bigint
  name: string;
};

const AddUsers: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Project[]>([]);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    company: '',
    position: '',
    phone: ''
  });

  useEffect(() => {
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
    fetchProjects();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Add user to public.users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          Company: formData.company, 
          Position: formData.position,
          'Phone No': formData.phone 
        });

      if (userError) throw userError;

      // 2. Add user to ProjectUsers for each selected project (using user_email)
      if (selectedProjects.length > 0) {
        const inserts = selectedProjects.map(project =>
          supabase.from('ProjectUsers').insert({
            project_id: project.id,
            user_email: formData.email
          })
        );
        const results = await Promise.all(inserts);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) throw errors[0].error;
      }

      toast.success('User created successfully!');
      setTimeout(() => navigate(-1), 2000);
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton />  
        <ToastContainer position="top-right" autoClose={3000} />
        <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
          <Typography variant="h4" gutterBottom>Add New User</Typography>
          
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
              label="Password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleInputChange}
              margin="normal"
              required
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
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={loading}
                sx={{ px: 4, py: 1.5 }}
              >
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </Box>
          </Box>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default AddUsers;