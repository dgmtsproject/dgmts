import React, { useEffect, useState } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import {
  Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, Button
} from '@mui/material';
import { useProjectContext } from '../context/ProjectContext';

type Project = {
  id: number;
  name: string;
  status: string;
  startDate: string;
  client: string;
  location: string;
  instrumentIds: number[];
};

const Projectslist: React.FC = () => {
  const [projectsData, setProjectsData] = useState<Project[]>([]);
  const navigate = useNavigate();
  const { setSelectedProject } = useProjectContext();

  useEffect(() => {
    const fetchProjects = async () => {
      const { data, error } = await supabase
        .from('Projects') 
        .select('*');
      console.log('Fetched Projects:', data);
      if (error) {
        console.error('Error fetching projects from Supabase:', error.message);
      } else {
        setProjectsData(data as Project[]);
      }
    };


    fetchProjects();
  }, []);

  const handleShowData = (project: Project) => {
    setSelectedProject(project.name);
    navigate('/instruments', { state: { project } });
  };

  // const handleShowGraph = (project: Project) => {
  //   setSelectedProject(project.name);
  //   navigate('/project-graphs', {
  //     state: { projectId: project.id, projectName: project.name },
  //   });
  // };

  return (
    <>
      <HeaNavLogo />
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
        <Button variant="contained" color="primary" onClick={() => navigate('/projects')} style={{ marginLeft: '20px' }}>
          Back to Projects
        </Button>
      </div>
    
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '0px' }}>
      <h2 style={{ textAlign: 'center', marginTop: '20px', color: '#333' }}>Project List</h2>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <TableContainer component={Paper} style={{ maxWidth: '96%', marginTop: '20px', border: '1px solid #000', marginBottom: "12px" }}>
          <Table>
            <TableHead style={{ backgroundColor: '#f1f1f1' }}>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Project #</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Project Name</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Client</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Location</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Status</TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}>Instruments</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projectsData.map((project: Project) => (
                <TableRow key={project.id} style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
                  <TableCell style={{ border: '1px solid black' }}>{project.id}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>{project.name}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>{project.client || "Unknown Client"}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>
                    {/* <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleShowData(project)}
                      style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: '#1e88e5', color: 'white' }}
                    >
                      Show Instruments
                    </Button> */}
                    {project.location || "Unknown Location"}
                  </TableCell>
                  <TableCell style={{ border: '1px solid black' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: project.status === 'Completed' ? 'green' : project.status === 'In Progress' ? 'yellow' : project.status === 'Not Started' ? 'red' : '#ccc',
                        marginRight: '5px'
                      }}></div>
                      {project.status}
                    </div>
                  </TableCell>
                  <TableCell style={{ border: '1px solid black' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleShowData(project)}
                      style={{ padding: '6px 12px', fontSize: '14px', backgroundColor: '#1e88e5', color: 'white' }}
                    >
                      Show Instruments
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
    </>
  );
};

export default Projectslist;
