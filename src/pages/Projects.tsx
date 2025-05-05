import React from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { useAdminContext } from '../context/AdminContext';
import MainContentWrapper from '../components/MainContentWrapper';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminContext(); //  access admin status from context

  const handleAddProject = () => {
    navigate('/add-projects');
  };

  const handleProjectList = () => {
    navigate('/projects-list');
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px', alignItems: 'center', height: '300px' }}>
        {isAdmin && ( //  only show this button if admin
          <Button variant="contained" color="primary" onClick={handleAddProject} style={{ marginLeft: '20px' }}>
            Add Project
          </Button>
        )}
        <Button variant="contained" color="primary" onClick={handleProjectList} style={{ marginLeft: '20px' }}>
          Project List
        </Button>
      </div>
      </MainContentWrapper>
    </>
  );
};

export default Projects;
