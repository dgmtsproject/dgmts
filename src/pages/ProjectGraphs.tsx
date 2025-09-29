import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import HeaNavLogo from "../components/HeaNavLogo";
import BackButton from "../components/Back";
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
  instrument_id?: string;
}

const ProjectGraphs: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, userEmail, permissions } = useAdminContext();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [accessibleProjects, setAccessibleProjects] = useState<Project[]>([]);
  const [graphOptions, setGraphOptions] = useState<GraphOption[]>([]);
  const [projectGraphs, setProjectGraphs] = useState<Record<number, GraphOption[]>>({});

  // Static graph mappings for non-instrument graphs
  const staticGraphs: Record<number, GraphOption[]> = {
    24637: [ // Long Bridge North
      { name: 'Single Prism', path: '/single-prism-with-time', description: 'View data for a single prism' },
      { name: 'Multiple Prisms', path: '/multi-prisms-with-time', description: 'Compare multiple prisms' },
      { name: 'AMTS Track', path: '/amts-track-graphs', description: 'AMTS track monitoring graphs' },
      { name: 'AMTS Ref', path: '/amts-ref-graphs', description: 'AMTS reference graphs' }
    ]
  };

  const fetchInstrumentsAndBuildGraphs = async () => {
    try {
      // Fetch all instruments with their project information
      const { data: instruments, error: instrumentsError } = await supabase
        .from('instruments')
        .select('instrument_id, instrument_name, project_id, syscom_device_id');

      if (instrumentsError) throw instrumentsError;

      // Build dynamic graph options based on instruments
      const dynamicGraphs: Record<number, GraphOption[]> = {};
      
      instruments?.forEach(instrument => {
        const projectId = instrument.project_id;
        if (!dynamicGraphs[projectId]) {
          dynamicGraphs[projectId] = [];
        }

        // Create graph option based on instrument type
        let graphOption: GraphOption;
        
        if (instrument.syscom_device_id) {
          // Seismograph instrument with syscom_device_id - use dynamic page
          graphOption = {
            name: instrument.instrument_name,
            path: `/dynamic-seismograph?instrument=${instrument.instrument_id}`,
            description: `${instrument.instrument_name} seismograph graphs`,
            instrument_id: instrument.instrument_id
          };
        } else if (instrument.instrument_id.includes('TILT')) {
          // Tiltmeter instrument
          graphOption = {
            name: instrument.instrument_name,
            path: `/tiltmeter-${instrument.instrument_id.split('-')[1]}`,
            description: `${instrument.instrument_name} tiltmeter graphs`,
            instrument_id: instrument.instrument_id
          };
        } else {
          // Default case
          graphOption = {
            name: instrument.instrument_name,
            path: `/${instrument.instrument_id.toLowerCase()}`,
            description: `${instrument.instrument_name} graphs`,
            instrument_id: instrument.instrument_id
          };
        }

        dynamicGraphs[projectId].push(graphOption);
      });

      // Merge static and dynamic graphs
      const mergedGraphs = { ...staticGraphs };
      Object.keys(dynamicGraphs).forEach(projectId => {
        const pid = parseInt(projectId);
        mergedGraphs[pid] = [
          ...(mergedGraphs[pid] || []),
          ...dynamicGraphs[pid]
        ];
      });

      setProjectGraphs(mergedGraphs);
    } catch (error) {
      console.error("Error fetching instruments:", error);
    }
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
    fetchInstrumentsAndBuildGraphs();
  }, [isAdmin, userEmail]);

  const handleProjectSelect = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    setSelectedProject(project);
    setGraphOptions(projectGraphs[project.id] || []);
  };

  const handleGraphSelect = (path: string) => {
    if (!permissions.view_graph) {
      return;
    }
    navigate(path);
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton  />
        <Box sx={{ maxWidth: 1200, mx: 'auto', mt: 4, p: 3 }}>
          <Typography variant="h5" align="center" gutterBottom>
            Project Graphs
          </Typography>

          {!permissions.view_graph ? (
            <Typography align="center" color="error" sx={{ mt: 4 }}>
              You don't have permission to view graphs. Please contact your administrator.
            </Typography>
          ) : loadingProjects ? (
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