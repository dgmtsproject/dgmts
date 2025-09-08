import React from 'react';
import HeaNavLogo from '../components/HeaNavLogo';
// import { useAdminContext } from '../context/AdminContext';
import { useNavigate } from 'react-router-dom';
import BackButton from '../components/Back';
import { Button } from '@mui/material';
import MainContentWrapper from '../components/MainContentWrapper';


const AdminSetup: React.FC = () => {
    const navigate = useNavigate();
    const handleAddProject = () => {
        navigate('/add-projects');
    };
    const handleAddInstrument = () => {
        navigate('/instruments');
    }
    const handleAddUser = () => {
        navigate('/add-users');
    }
    const handlePermissions = () => {
        navigate('/permissions');
    }
    return (
        <>
            <HeaNavLogo />
            <MainContentWrapper>
            <BackButton />
                <h1>Admin Setup</h1>
                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'flex-start', 
                    marginTop: '10px',
                    gap: '10px',
                    }}>
                    <Button variant="contained" color="primary" onClick={handleAddProject} style={{ marginBottom: '10px' }}>
                        Add Project
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleAddInstrument} style={{ marginBottom: '10px' }}>
                        Add Instrument
                    </Button>
                    <Button variant="contained" color="primary" onClick={handleAddUser} style={{ marginBottom: '10px' }}>
                        Add User
                    </Button>
                    <Button variant="contained" color="primary" onClick={handlePermissions} style={{ marginBottom: '10px' }}>
                        Users and Permissions
                    </Button>
                </div>
            </MainContentWrapper>
        </>
    )
}
export default AdminSetup;
