import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeaNavLogo from "../components/HeaNavLogo";
import MainContentWrapper from "../components/MainContentWrapper";
import { useAdminContext } from '../context/AdminContext';
import { supabase } from '../supabase';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography
} from '@mui/material';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface Project {
  id: number;
  name: string;
}

const SUPPORTED_PROJECTS = [24637, 20151]; // Long Bridge North, DGMTS Testing

const Maps: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, userEmail } = useAdminContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const { data: allProjects, error: projectsError } = await supabase
          .from('Projects')
          .select('id, name');
        if (projectsError) throw projectsError;
        if (!allProjects) return;
        setProjects(allProjects);
        if (isAdmin) {
          setAccessibleProjects(allProjects);
          setLoadingProjects(false);
          return;
        }
        if (userEmail) {
          const { data: userProjects, error: accessError } = await supabase
            .from('ProjectUsers')
            .select('project_id, Projects(id, name)')
            .eq('user_email', userEmail);
          if (accessError) throw accessError;
          const accessible = allProjects.filter(project => 
            userProjects?.some(up => up.project_id === project.id)
          );
          setAccessibleProjects(accessible);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoadingProjects(false);
      }
    };
    fetchProjects();
  }, [isAdmin, userEmail]);

  const handleProjectSelect = (projectId: number) => {
    const selectedProject = projects.find(p => p.id === projectId);
    if (!selectedProject) return;
    if (SUPPORTED_PROJECTS.includes(selectedProject.id)) {
      switch(selectedProject.id) {
        case 24637: // Long Bridge North
          navigate('/long-bridge-map');
          break;
        case 20151: // DGMTS Testing
          navigate('/seismograph-map');
          break;
        default:
          break;
      }
    } else {
      toast.info('No map available for this project');
    }
  };

  return (
    <>
      <HeaNavLogo/>
      <MainContentWrapper>
        <ToastContainer />
        <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Project Maps
          </Typography>
          {loadingProjects ? (
            <Typography align="center">Loading projects...</Typography>
          ) : accessibleProjects.length === 0 ? (
            <Typography align="center" color="error">
              You don't have access to any projects
            </Typography>
          ) : (
            <FormControl fullWidth sx={{ mt: 3 }}>
              <InputLabel>Project</InputLabel>
              <Select
                value=""
                onChange={(e) => handleProjectSelect(Number(e.target.value))}
                label="Project"
              >
                {accessibleProjects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default Maps;