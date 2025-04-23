import React, { useEffect } from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { useNavigate } from 'react-router-dom';
import projectsData from '../data/projectsData.json';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button } from '@mui/material';
import { useProjectContext } from '../context/ProjectContext'; // Import the context

// Define the type for the project with the instrumentIds array
type Project = {
  id: number;
  name: string;
  status: string;
  startDate: string;
  instrumentIds: number[]; // Updated to reflect the array of instrument IDs
};

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { setSelectedProject, selectedProject } = useProjectContext(); // Get the selected project from context

  // Function to handle setting selected project when "Show Instruments" is clicked
  const handleShowData = (project: Project) => {
    setSelectedProject(project.name); // Set the selected project in the context
    console.log("Selected Project Name: ", project.name); // Log the selected project name
    navigate('/instruments', { state: { project } });
  };

  // Function to handle setting selected project when "Show Graph" is clicked
  const handleShowGraph = (project: Project) => {
    setSelectedProject(project.name); // Set the selected project in the context
    console.log("Graph - Selected Project Name: ", selectedProject); // Log the selected project name
    navigate('/project-graphs', {
      state: { projectId: project.id, projectName: project.name },
    });
  };

  // Log the selected project from context (optional)
  useEffect(() => {
    // console.log('Selected Project from Context: ', selectedProject);
  }, [selectedProject]);

  return (
    <>
      <HeaNavLogo />
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '0px' }}>
      <h2 style={{ textAlign: 'center', marginTop: '20px', color: '#333' }}>Project List</h2>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <TableContainer component={Paper} style={{ maxWidth: '96%', marginTop: '20px', border: '1px solid #000',marginBottom:"12px" }}>
          <Table>
            <TableHead style={{ backgroundColor: '#f1f1f1' }}>
              <TableRow>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}><strong>Project Name</strong></TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}><strong>Status</strong></TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}><strong>Start Date</strong></TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}><strong>Show Instruments</strong></TableCell>
                <TableCell style={{ fontWeight: 'bold', color: '#333', border: '1px solid black' }}><strong>Show Graph</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projectsData.map((project: Project) => (
                <TableRow key={project.id} style={{ backgroundColor: '#fff', borderBottom: '1px solid #ddd' }}>
                  <TableCell style={{ border: '1px solid black' }}>{project.name}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>{project.status}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>{project.startDate}</TableCell>
                  <TableCell style={{ border: '1px solid black' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() => handleShowData(project)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '14px',
                        backgroundColor: '#1e88e5',
                        color: 'white',
                      }}
                    >
                      Show Instruments
                    </Button>
                  </TableCell>
                  <TableCell style={{ border: '1px solid black' }}>
                    <Button
                      variant="contained"
                      color="primary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '14px',
                        backgroundColor: '#1e88e5',
                        color: 'white',
                        marginLeft: '10px',
                      }}
                      onClick={() => handleShowGraph(project)}
                    >
                      Show Graph
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

export default Projects;
