import React, { useEffect, useState } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button
} from '@mui/material';
import { useProjectContext } from '../context/ProjectContext';
import MainContentWrapper from '../components/MainContentWrapper';
import { useAdminContext } from '../context/AdminContext';

type Project = {
  id: number;
  name: string;
  status: string;
  startDate: string;
  client: string;
  location: string;
  instrumentIds: number[];
  user_email: string | null;
};

const Projectslist: React.FC = () => {
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const navigate = useNavigate();
  const { setSelectedProject } = useProjectContext();
  const { isAdmin, userEmail } = useAdminContext();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        console.log('Fetching projects for:', userEmail, 'isAdmin:', isAdmin);

        let projects = [];
        if (isAdmin) {
          // Admins get everything
          const { data, error } = await supabase.from('Projects').select('*');
          if (error) throw error;
          projects = data || [];
        } else if (userEmail) {
          // For regular users, get projects via ProjectUsers
          const { data: projectUsers, error: puError } = await supabase
            .from('ProjectUsers')
            .select('project_id, Projects(*)')
            .eq('user_email', userEmail);
          if (puError) throw puError;
          // Extract unique projects
          projects = (projectUsers || [])
            .map(pu => pu.Projects)
            .filter(Boolean);
        }
        // Debug logging
        console.log('Raw projects data:', projects);
        setProjectsData(projects);
      } catch (err) {
        console.error('Error fetching projects:', err);
      }
    };
    fetchProjects();
  }, [isAdmin, userEmail]);

  const handleViewInstruments = (project: Project) => {
    setSelectedProject(project.name);
    navigate('/instruments-list', { state: { project } });
  };

  const handleAddInstrument = (project: Project) => {
    setSelectedProject(project.name);
    navigate('/instruments', { state: { project } });
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      
      
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '0px' }}>
          <h2 style={{ textAlign: 'center', marginTop: '20px', color: '#333' }}>
            {isAdmin ? 'All Projects' : 'My Projects'}
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <TableContainer component={Paper} style={{ 
              maxWidth: '96%', 
              marginTop: '20px', 
              border: '1px solid #000', 
              marginBottom: "12px" 
            }}>
              <Table>
                <TableHead style={{ backgroundColor: '#f1f1f1' }}>
                  <TableRow>
                    <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Project #</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Project Name</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Client</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Location</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Status</TableCell>
                    <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectsData.map((project) => (
                    <TableRow key={project.id} style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
                      <TableCell style={{ border: '1px solid black' }}>{project.id}</TableCell>
                      <TableCell style={{ border: '1px solid black' }}>{project.name}</TableCell>
                      <TableCell style={{ border: '1px solid black' }}>{project.client || "Unknown Client"}</TableCell>
                      <TableCell style={{ border: '1px solid black' }}>
                        {project.location || "Unknown Location"}
                      </TableCell>
                      <TableCell style={{ border: '1px solid black' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '50%',
                            backgroundColor: project.status === 'Completed' ? 'green' : 
                                          project.status === 'In Progress' ? 'yellow' : 
                                          project.status === 'Not Started' ? 'red' : '#ccc',
                            marginRight: '5px'
                          }}></div>
                          {project.status}
                        </div>
                      </TableCell>
                      <TableCell style={{ border: '1px solid black' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() => handleViewInstruments(project)}
                            style={{ 
                              padding: '6px 12px', 
                              fontSize: '14px', 
                              backgroundColor: '#1e88e5', 
                              color: 'white',
                              minWidth: '120px',
                              textTransform: 'none',
                              fontWeight: '500',
                              boxShadow: 'none',
                              borderRadius: '4px',
                              transition: 'background-color 0.3s ease'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1565c0'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#1e88e5'}
                          >
                            View Instruments
                          </Button>
                          {isAdmin && (
                            <Button
                              variant="contained"
                              color="success"
                              onClick={() => handleAddInstrument(project)}
                              style={{ 
                                padding: '6px 12px', 
                                fontSize: '14px', 
                                backgroundColor: '#4caf50', 
                                color: 'white',
                                minWidth: '120px',
                                textTransform: 'none',
                                fontWeight: '500',
                                boxShadow: 'none',
                                borderRadius: '4px',
                                transition: 'background-color 0.3s ease'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#388e3c'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4caf50'}
                            >
                              Add Instrument
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </div>
        </div>
      </MainContentWrapper>
    </>
  );
};

export default Projectslist;