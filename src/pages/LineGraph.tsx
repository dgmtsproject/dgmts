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
import projectData from '../data/sensorData.json'; // ✅ Import your static project data

// Define the type for graph data
interface GraphData {
  time: string;
  value: number;
}

const LineGraph = () => {
  const [graphData, setGraphData] = useState<GraphData[]>([]);
  const [projectName, setProjectName] = useState<string>("");

  // Fetch graph data based on selected project from dropdown
  useEffect(() => {
    if (projectData && projectName) {
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
        toast.error("Project not found or has no data!");
      }
    }
  }, [projectName]);

  const handleProjectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setProjectName(event.target.value);
  };

  return (
    <div>
      <ToastContainer />
      <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
        <label 
          htmlFor="project-select" 
          style={{
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            color: '#555', 
            marginRight: '10px'
          }}
        >
          Select Project: 
        </label>
        <select 
          id="project-select" 
          value={projectName} 
          onChange={handleProjectChange} 
          style={{
            padding: '10px 15px',
            fontSize: '1rem',
            borderRadius: '5px',
            border: '1px solid #ccc',
            backgroundColor: '#f9f9f9',
            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
            outline: 'none',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
          }}
        >
          <option value="">-- Select a Project --</option>
          {projectData.map((project) => (
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
        <p style={{ textAlign: 'center', fontSize: '1.1rem', color: '#777' }}>Select a project to view the data.</p>
      )}
    </div>
  );
};

export default LineGraph;
