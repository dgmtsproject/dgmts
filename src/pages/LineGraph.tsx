import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import projectData from '../data/sensorData.json';
import MainContentWrapper from '../components/MainContentWrapper';
import { useAdminContext } from '../context/AdminContext';
import { supabase } from '../supabase';

interface GraphData {
  time: string;
  value: number;
}

interface Project {
  id: number;
  name: string;
  user_email: string | null;
}

const LineGraph = () => {
  const [graphData, setGraphData] = useState<GraphData[]>([]);
  const [projectName, setProjectName] = useState<string>("");
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const { isAdmin, userEmail } = useAdminContext();

  // Fetch user's projects from Supabase
  useEffect(() => {
    const fetchUserProjects = async () => {
      try {
        let query = supabase
          .from('Projects')
          .select('id, name, user_email')
          .order('name', { ascending: true });

        if (!isAdmin && userEmail) {
          query = query.eq('user_email', userEmail);
        }

        const { data, error } = await query;

        if (error) throw error;
        
        setUserProjects(data || []);
      } catch (error) {
        console.error('Error fetching projects:', error);
        toast.error('Failed to load projects');
      }
    };

    fetchUserProjects();
  }, [isAdmin, userEmail]);

  // Match Supabase projects with JSON data when project is selected
  useEffect(() => {
    if (projectName && userProjects.length > 0) {
      // Find the project in Supabase data first to verify access
      const authorizedProject = userProjects.find(p => p.name === projectName);
      
      if (!authorizedProject) {
        toast.error('You do not have access to this project');
        setProjectName("");
        setGraphData([]);
        return;
      }

      // Then find matching data in JSON
      const project = projectData.find((p) => p.name === projectName);
      
      if (project && project.values) {
        setGraphData(project.values);
        
        // Check for alerts
        project.values.forEach((entry) => {
          if (entry.value > 100) {
            toast.error(`Alert: Value ${entry.value} at ${entry.time} exceeds 100!`);
          }
        });
      } else {
        setGraphData([]);
        toast.error("Project data not found!");
      }
    }
  }, [projectName, userProjects]);

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setProjectName(event.target.value);
  };

  // Get available projects by matching Supabase projects with JSON data
  const availableProjects = projectData.filter(project => 
    userProjects.some(userProject => userProject.name === project.name)
  );

  return (
    <>
      <MainContentWrapper>
        <div>
          <ToastContainer />
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <label htmlFor="project-select" style={labelStyle}>
              Select Project: 
            </label>
            <select 
              id="project-select" 
              value={projectName} 
              onChange={handleProjectChange} 
              style={selectStyle}
            >
              <option value="">-- Select a Project --</option>
              {availableProjects.map((project) => (
                <option key={project.id} value={project.name}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          {graphData.length > 0 ? (
            <LineChart width={600} height={300} data={graphData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          ) : (
            <p style={noDataStyle as React.CSSProperties}>
              {availableProjects.length > 0 
                ? "Select a project to view the data." 
                : "No projects available for your account."}
            </p>
          )}
        </div>
      </MainContentWrapper>
    </>
  );
};

// Styles
const labelStyle = {
  fontSize: '1.2rem', 
  fontWeight: 'bold', 
  color: '#555', 
  marginRight: '10px'
};

const selectStyle = {
  padding: '10px 15px',
  fontSize: '1rem',
  borderRadius: '5px',
  border: '1px solid #ccc',
  backgroundColor: '#f9f9f9',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
  outline: 'none',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
};

const noDataStyle = {
  textAlign: 'center', 
  fontSize: '1.1rem', 
  color: '#777'
};

export default LineGraph;