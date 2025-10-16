import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip as LeafletTooltip } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.awesome-markers/dist/leaflet.awesome-markers.css';
import 'leaflet.awesome-markers/dist/leaflet.awesome-markers.js';
import { Box, Typography, Paper, Card, CardContent, Chip, Button, Grid, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

// Fix for default markers in react-leaflet
delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Red marker creation function using Awesome Markers
const createRedMarker = () => {
  // Use Leaflet Awesome Markers for reliable red markers
  return (window as any).L.AwesomeMarkers.icon({
    icon: 'home',
    markerColor: 'red',
    iconColor: 'white'
  });
};

interface ProjectLocation {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  description: string;
  instruments: Instrument[];
  lines?: {
    name: string;
    coordinates: [number, number][];
    color: string;
    weight: number;
  }[];
  labels?: {
    position: [number, number];
    text: string;
  }[];
}

interface Instrument {
  instrument_id: string;
  instrument_name: string;
  project_id: number;
  instrument_location?: string;
  status?: 'active' | 'inactive' | 'maintenance';
}

// Individual Project Map Component
const ProjectMap: React.FC<{ project: ProjectLocation }> = ({ project }) => {
  return (
    <Box sx={{ height: '400px', width: '100%', borderRadius: 1, overflow: 'hidden' }}>
      <MapContainer
        center={[project.latitude, project.longitude]}
        zoom={17}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        scrollWheelZoom={true}
        boxZoom={false}
        keyboard={false}
        attributionControl={false}
        key={`map-${project.id}`}
      >
        <TileLayer
          url={`https://api.mapbox.com/styles/v1/patrick-geo-instruments/ckngbuxda2rxn18pc2c4io7le/tiles/{z}/{x}/{y}?access_token=${import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}`}
          maxZoom={22}
          attribution='© Mapbox © OpenStreetMap contributors'
        />
        <Marker 
          position={[project.latitude, project.longitude]}
          icon={createRedMarker()}
        >
          <Popup>
            <Box sx={{ minWidth: 150 }}>
              <Typography variant="subtitle2" gutterBottom>
                {project.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {project.description}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {project.instruments.length} instruments
              </Typography>
            </Box>
          </Popup>
        </Marker>
        
        {/* Project Lines */}
        {project.lines?.map((line, index) => (
          <Polyline
            key={`line-${project.id}-${index}`}
            positions={line.coordinates}
            pathOptions={{
              color: line.color,
              weight: line.weight,
              opacity: 0.8
            }}
          />
        ))}
        
        {/* Project Labels */}
        {project.labels?.map((label, index) => (
          <Marker
            key={`label-${project.id}-${index}`}
            position={label.position}
            icon={createRedMarker()}
          >
            <LeafletTooltip permanent direction="top" offset={[0, -10]}>
              <Box sx={{ 
                backgroundColor: 'white', 
                padding: '2px 6px', 
                borderRadius: '4px',
                border: '1px solid #ccc',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                {label.text}
              </Box>
            </LeafletTooltip>
          </Marker>
        ))}
      </MapContainer>
    </Box>
  );
};

const InteractiveProjectMaps: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<ProjectLocation | null>(null);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [hoveredProject, setHoveredProject] = useState<ProjectLocation | null>(null);

  // Project data based on the provided information
  const projectData: ProjectLocation[] = [
    {
      id: 12,
      name: 'Loading...', // Will be fetched from Supabase Projects table
      latitude: 38.827033, // 38°49'37.32"N converted to decimal
      longitude: -77.377278, // 77°22'38.20"W converted to decimal
      description: 'Lincoln Lewis Fairfax, VA - Vibration monitoring system',
      instruments: []
    },
    {
      id: 24429,
      name: 'Loading...', // Will be fetched from Supabase Projects table
      latitude: 38.869297, // 38°52'9.11"N converted to decimal
      longitude: -77.059714, // 77°3'34.97"W converted to decimal
      description: 'ANC DAR BC Arlington, VA - Vibration monitoring system',
      instruments: []
    },
    {
      id: 25304,
      name: 'Loading...', // Will be fetched from Supabase Projects table
      latitude: 38.881472, // 38°52'53.30"N converted to decimal
      longitude: -77.073383, // 77°4'24.18"W converted to decimal
      description: 'Yellow Line ANC Arlington, VA - Instrumentation system',
      instruments: []
    }
  ];

  useEffect(() => {
    fetchProjectInstruments();
  }, []);

  const fetchProjectInstruments = async () => {
    try {
      setLoading(true);
      
      // Fetch project names and instruments for each project
      const projectsWithInstruments = await Promise.all(
        projectData.map(async (project) => {
          // Fetch project name from Projects table
          const { data: projectData, error: projectError } = await supabase
            .from('Projects')
            .select('name')
            .eq('id', project.id)
            .single();

          // Fetch instruments for the project
          const { data: instruments, error: instrumentsError } = await supabase
            .from('instruments')
            .select('instrument_id, instrument_name, project_id, instrument_location')
            .eq('project_id', project.id);

          if (projectError) {
            console.error(`Error fetching project name for project ${project.id}:`, projectError);
          }

          if (instrumentsError) {
            console.error(`Error fetching instruments for project ${project.id}:`, instrumentsError);
          }

          // Fallback names for each project in case Supabase fetch fails
          const fallbackNames: { [key: number]: string } = {
            12: 'Lincoln Lewis Fairfax Project',
            24429: 'Vibration Monitoring–ANC DAR-BC Arlington',
            25304: 'Instrumentation–ANC Yellow Line Arlington'
          };

          return {
            ...project,
            name: projectData?.name || fallbackNames[project.id] || `Project ${project.id}`, // Use fetched name or fallback
            instruments: instruments || []
          };
        })
      );

      setProjects(projectsWithInstruments);
    } catch (error) {
      console.error('Error fetching project instruments:', error);
      setProjects(projectData); // Fallback to basic project data
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project: ProjectLocation) => {
    setSelectedProject(project);
    setProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    setProfileDialogOpen(false);
    setSelectedProject(null);
  };

  const handleInstrumentClick = (instrument: Instrument) => {
    // Navigate to the appropriate instrument page based on instrument_id
    const instrumentRoutes: { [key: string]: string } = {
      'SMG1': '/background',
      'SMG-1': '/dynamic-seismograph?instrument=SMG-1',
      'SMG-2': '/anc-seismograph',
      'SMG-3': '/smg3-seismograph',
      'TILT-142939': '/tiltmeter-142939',
      'TILT-143969': '/tiltmeter-143969',
      'TILTMETER-30846': '/tiltmeter-30846',
      'Instantel 1': '/instantel1-seismograph',
      'ROCKSMG-1': '/rocksmg1-seismograph',
      'ROCKSMG-2': '/rocksmg2-seismograph'
    };

    const route = instrumentRoutes[instrument.instrument_id];
    if (route) {
      navigate(route, { 
        state: { 
          project: { id: instrument.project_id, name: projects.find(p => p.id === instrument.project_id)?.name } 
        } 
      });
    }
  };

  const getInstrumentStatusColor = (_instrument: Instrument): string => {
    // You can implement logic to determine instrument status based on instrument data
    // For now, we'll use a simple heuristic
    return 'active'; // Default to active
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'inactive': return '#f44336';
      case 'maintenance': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Loading project maps...</Typography>
      </Box>
    );
  }

  
  return (
    <Box sx={{ p: 3 }}>
      <style>
        {`
          .leaflet-container {
            height: 100%;
            width: 100%;
            background-color: #f5f5f5;
          }
          .leaflet-tile {
            filter: none !important;
          }
          .custom-red-marker {
            background: transparent !important;
            border: none !important;
          }
          .custom-red-marker div {
            pointer-events: none;
          }
        `}
      </style>

      <Grid container spacing={3}>
        {/* Project Cards */}
        <Box sx={{ flex: '0 0 100%', maxWidth: '100%', px: 1 }}>
          <Typography variant="h6" gutterBottom>
            Project Locations
          </Typography>
          <Grid container spacing={2}>
            {projects.map((project) => (
              <Box key={project.id} sx={{ width: 'calc(33.333% - 16px)', mb: 2, mx: 1 }}>
                <Tooltip 
                  title={`${project.instruments.length} instruments available`}
                  placement="top"
                  arrow
                >
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      height: '500px', // Fixed height for all cards
                      border: selectedProject?.id === project.id ? '3px solid #1976d2' : '2px solid #e0e0e0',
                      borderRadius: 2,
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        boxShadow: 8,
                        transform: 'translateY(-4px) scale(1.02)',
                        borderColor: '#1976d2',
                        backgroundColor: '#f5f5f5'
                      }
                    }}
                    onClick={() => handleProjectClick(project)}
                    onMouseEnter={() => setHoveredProject(project)}
                    onMouseLeave={() => setHoveredProject(null)}
                  >
                    <CardContent sx={{ p: 3, flex: 1, display: 'flex', flexDirection: 'column' }}>
                      {/* Project Map */}
                      <Box sx={{ mb: 3, flex: 1 }}>
                        <ProjectMap project={project} />
                      </Box>
                      
                      {/* Project Info */}
                      <Box sx={{ flex: '0 0 auto' }}>
                        <Typography variant="h6" gutterBottom sx={{ 
                          fontSize: '1.1rem', 
                          fontWeight: 'bold',
                          lineHeight: 1.3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          minHeight: '60px'
                        }}>
                          {project.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ 
                          fontSize: '0.85rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          mb: 2,
                          minHeight: '40px'
                        }}>
                          {project.description}
                        </Typography>
                        
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                          <Chip 
                            label={`${project.instruments.length} Instruments`} 
                            size="small" 
                            color="primary" 
                            variant="filled"
                            sx={{ 
                              fontSize: '0.8rem',
                              height: '28px',
                              backgroundColor: hoveredProject?.id === project.id ? '#1976d2' : '#4caf50',
                              color: 'white'
                            }}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Tooltip>
              </Box>
            ))}
          </Grid>
        </Box>
      </Grid>

      {/* Selected Project Details */}
      {selectedProject && (
        <Paper elevation={3} sx={{ mt: 3, p: 3 }}>
          <Typography variant="h5" gutterBottom>
            {selectedProject.name}
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedProject.description}
          </Typography>
          
          {selectedProject.instruments.length > 0 ? (
            <Box>
              <Typography variant="h6" gutterBottom>
                Instruments ({selectedProject.instruments.length})
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {selectedProject.instruments.map((instrument) => (
                  <Box key={instrument.instrument_id} sx={{ flex: '0 0 calc(33.333% - 8px)', minWidth: '200px' }}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: 4,
                          transform: 'translateY(-2px)'
                        }
                      }}
                      onClick={() => handleInstrumentClick(instrument)}
                    >
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          {instrument.instrument_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          ID: {instrument.instrument_id}
                        </Typography>
                        {instrument.instrument_location && (
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Location: {instrument.instrument_location}
                          </Typography>
                        )}
                        <Chip 
                          label={getInstrumentStatusColor(instrument)} 
                          size="small" 
                          sx={{ 
                            backgroundColor: getStatusColor(getInstrumentStatusColor(instrument)),
                            color: 'white'
                          }} 
                        />
                      </CardContent>
                    </Card>
                  </Box>
                ))}
              </Box>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No instruments found for this project.
            </Typography>
          )}
        </Paper>
      )}

      {/* Profile Brief Dialog */}
      <Dialog 
        open={profileDialogOpen} 
        onClose={handleCloseProfileDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            boxShadow: 8
          }
        }}
      >
        <DialogTitle sx={{ 
          backgroundColor: '#1976d2', 
          color: 'white',
          textAlign: 'center',
          fontSize: '1.5rem',
          fontWeight: 'bold'
        }}>
          {selectedProject?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          {selectedProject && (
            <Box>
              <Typography variant="h6" gutterBottom color="primary">
                Project Overview
              </Typography>
              <Typography variant="body1" sx={{ mb: 3 }}>
                {selectedProject.description}
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom color="primary">
                  Location Details
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Latitude:</strong> {selectedProject.latitude.toFixed(6)}°N
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Longitude:</strong> {selectedProject.longitude.toFixed(6)}°W
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Typography variant="h6" gutterBottom color="primary">
                Instruments ({selectedProject.instruments.length})
              </Typography>
              
              {selectedProject.instruments.length > 0 ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {selectedProject.instruments.map((instrument) => (
                    <Box key={instrument.instrument_id} sx={{ flex: '0 0 calc(33.333% - 8px)', minWidth: '200px' }}>
                      <Card 
                        sx={{ 
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            boxShadow: 4,
                            transform: 'translateY(-2px)',
                            backgroundColor: '#f5f5f5'
                          }
                        }}
                        onClick={() => {
                          handleInstrumentClick(instrument);
                          handleCloseProfileDialog();
                        }}
                      >
                        <CardContent sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem' }}>
                            {instrument.instrument_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            ID: {instrument.instrument_id}
                          </Typography>
                          {instrument.instrument_location && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              Location: {instrument.instrument_location}
                            </Typography>
                          )}
                          <Chip 
                            label={getInstrumentStatusColor(instrument)} 
                            size="small" 
                            sx={{ 
                              backgroundColor: getStatusColor(getInstrumentStatusColor(instrument)),
                              color: 'white',
                              fontSize: '0.7rem'
                            }} 
                          />
                        </CardContent>
                      </Card>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No instruments found for this project.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
          <Button 
            onClick={handleCloseProfileDialog}
            variant="contained"
            color="primary"
            sx={{ minWidth: 120 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InteractiveProjectMaps;
