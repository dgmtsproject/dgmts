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
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Button
} from '@mui/material';

interface Project {
  id: number;
  name: string;
}

interface GraphOption {
  name: string;
  path: string;
  description?: string;
}

const ProjectGraphs: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, userEmail } = useAdminContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);
  const [graphOptions, setGraphOptions] = useState<GraphOption[]>([]);

  const projectGraphs: Record<number, GraphOption[]> = {
    24637: [ // Long Bridge North
      { name: 'Single Prism', path: '/single-prism-with-time', description: 'View data for a single prism' },
      { name: 'Multiple Prisms', path: '/multi-prisms-with-time', description: 'Compare multiple prisms' },
      { name: 'AMTS Track', path: '/amts-track-graphs', description: 'AMTS track monitoring graphs' },
      { name: 'AMTS Ref', path: '/amts-ref-graphs', description: 'AMTS reference graphs' }
    ],
    20151: [ // DGMTS Testing
      { name: 'Seismograph', path: '/background', description: 'Seismograph event graphs' },
    ],
    24429: [ // ANC DAR-BC
      { name: 'Seismograph', path: '/anc-seismograph', description: 'ANC DAR-BC Seismograph graphs' },
      { name: 'Tiltmeter-142939', path: '/tiltmeter-142939', description: 'Tiltmeter Node 142939' },
      { name: 'Tiltmeter-143969', path: '/tiltmeter-143969', description: 'Tiltmeter Node 143969' },
    ]
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const { data: allProjects, error: projectsError } = await supabase
          .from('Projects')
          .select('id, name')
          .in('id', [24637, 20151, 24429]);

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
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    setSelectedProject(project);
    setGraphOptions(projectGraphs[project.id] || []);
  };

  const handleGraphSelect = (path: string) => {
    navigate(path);
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 3 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Project Graphs
          </Typography>

          {loadingProjects ? (
            <Typography align="center">Loading projects...</Typography>
          ) : accessibleProjects.length === 0 ? (
            <Typography align="center" color="error">
              You don't have access to any projects
            </Typography>
          ) : !selectedProject ? (
            <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, p: 3 }}>
              <FormControl fullWidth sx={{ mt: 3 }}>
                <InputLabel>Select Project</InputLabel>
                <Select
                  value=""
                  onChange={(e) => handleProjectSelect(Number(e.target.value))}
                  label="Select Project"
                >
                  {accessibleProjects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          ) : (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">
                  Available Graphs for: {selectedProject.name}
                </Typography>
                <Button
                  variant="text"
                  color="primary"
                  onClick={() => setSelectedProject(null)}
                >
                  Change Project
                </Button>
              </Box>

              {/* Flexbox layout instead of Grid */}
              <Box sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 3,
                '& > *': {
                  flex: '1 1 300px',
                  maxWidth: '100%',
                }
              }}>
                {graphOptions.map((graph, index) => (
                  <Card key={index} sx={{ height: '100%' }}>
                    <CardActionArea
                      onClick={() => handleGraphSelect(graph.path)}
                      sx={{ height: '100%' }}
                    >
                      <CardContent>
                        <Typography gutterBottom variant="h6">
                          {graph.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {graph.description || 'View graph'}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            </>
          )}
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default ProjectGraphs;