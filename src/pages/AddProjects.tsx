import React  from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
// import rawProjectsData from '../data/projectsData.json';
import { Button } from '@mui/material';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
// import fs from 'fs';


// const projectsData: Project[] = rawProjectsData.map((project) => ({
//     id: project.id,
//     name: project.name,
//     status: project.status,
//     startDate: project.startDate,
//     client: project.client || "Unknown Client",
//     location: project.location || "Unknown Location",
//     instrumentIds: project.instrumentIds || [],
//   }));
// type Project = {
//     id: number;
//     name: string;
//     status: string;
//     startDate: string;
//     client: string;
//     location: string;
//     instrumentIds: number[];
// };




const AddProjects: React.FC = () => {
    const todaysDate = new Date().toISOString().split('T')[0]; 

    const navigate = useNavigate();
    const handleAddProject = async (event: React.FormEvent) => {
        event.preventDefault(); 
        const formData = new FormData(event.currentTarget as HTMLFormElement);
        const projectName = formData.get('projectName') as string;
        const client = formData.get('client') as string;
        const location = formData.get('location') as string;
        const status = formData.get('status') as string;
        const startDate = todaysDate;
        const projectId = formData.get('projectId') as string;``
      
        const { data, error } = await supabase
        .from('Projects')
        .insert([{
            id: projectId,
            name: projectName,
            client,
            location,
            status,
            startDate,
            instrumentIds: [] 
         }]);
      
        if (error) {
          console.error("Error adding project:", error.message);
        } else {
          console.log("Project added successfully:", data);
          toast.success("Project added successfully!");
          
        }
      };

    return (
        <>
        <HeaNavLogo />
        <ToastContainer position="top-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px', alignItems: 'center' }}>
                <Button variant="contained" color="primary" onClick={() => navigate('/projects')} style={{ marginLeft: '20px' }}>
                  Back to Projects
                </Button>
              </div>
        
        <form
        onSubmit={handleAddProject} 
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '20px' }}>
            <h2 style={{ textAlign: 'center', marginTop: '20px', color: '#333' }}>Add Project</h2>
            <input name="projectId" type="text" placeholder="Project ID" required style={{ marginBottom: '10px', padding: '8px', width: '300px' }} />
            <input name="projectName" type="text" placeholder="Project Name" required style={{ marginBottom: '10px', padding: '8px', width: '300px' }} />
            <input name='client' type="text" placeholder="Client" required style={{ marginBottom: '10px', padding: '8px', width: '300px' }} />
            <input name='location' type="text" placeholder="Location" required style={{ marginBottom: '10px', padding: '8px', width: '300px' }} />
            <select name="status" required style={{ marginBottom: '10px', padding: '8px', width: '320px' }}>
                
                <option disabled selected>Select Status</option>
                <option value="Completed">Completed</option>
                <option value="In Progress">In Progress</option>
                <option value="Planning">Planning</option>
                <option value="Not Started">Not Started</option>
            </select>
            
            <Button variant="contained" color="primary" type="submit" style={{ marginTop: '20px' }}
            
          
            >
                Add
            </Button>
        </form>
        

        </>
    );
}
export default AddProjects;
