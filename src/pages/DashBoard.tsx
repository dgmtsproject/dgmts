import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
//import { useNavigate } from 'react-router-dom';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { useAdminContext } from '../context/AdminContext';
import InteractiveProjectMaps from '../components/InteractiveProjectMaps';

const Dashboard: React.FC = () => {
  const theme = useTheme();
  //const navigate = useNavigate();
  const { userEmail } = useAdminContext();

  // COMMENTED OUT: Original feature cards - preserved for future use
  // const featureCards = [
  //   ...(permissions.access_to_site ? [{
  //     title: 'Projects',
  //     description: 'Manage and view all your monitoring projects',
  //     icon: '📊',
  //     path: '/projects-list'
  //   }] : []),
  //   {
  //     title: 'Data Visualization',
  //     description: 'View graphs and analyze your data',
  //     icon: '📈',
  //     path: '/project-graphs'
  //   },
  //   {
  //     title: 'Alarms',
  //     description: 'Monitor and manage system alerts',
  //     icon: '🚨',
  //     path: '/alarms'
  //   },
  //   ...(isAdmin ? [{
  //     title: 'Admin Panel',
  //     description: 'Manage users, Projects,Permissions and Instruments',
  //     icon: '⚙️',
  //     path: '/admin-setup'
  //   }] : [])
  // ];

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>        
        <Box sx={{ 
          textAlign: 'center', 
          mb: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: theme.palette.primary.contrastText,
          p: 4,
          borderRadius: 2,
          boxShadow: 3
        }}>
          <Typography variant="h3" gutterBottom>
            Welcome to DGMTS Monitoring System
          </Typography>
          <Box sx={{ 
            my: 2.5,
            position: 'relative',
            width: '100%'
          }}>
            <Box
              component="span"
              sx={{
                display: 'block',
                width: { xs: '80px', sm: '120px' },
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${theme.palette.primary.contrastText}, transparent)`,
                mx: 'auto',
                mb: 2
              }}
            />
            <Typography 
              variant="h4" 
              sx={{ 
                mb: 0,
                opacity: 0.92,
                px: { xs: 2, sm: 4 }
              }}
            >
              Integrated Monitoring from Ground to Cloud
            </Typography>
            <Box
              component="span"
              sx={{
                display: 'block',
                width: { xs: '80px', sm: '120px' },
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${theme.palette.primary.contrastText}, transparent)`,
                mx: 'auto',
                mt: 2
              }}
            />
          </Box>
          <Typography variant="h6">
            {userEmail ? `Logged in as ${userEmail}` : 'Welcome!'}
          </Typography>
        </Box>

        {/* COMMENTED OUT: Original feature cards - preserved for future use
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
          gap: 3,
          mt: 4
        }}>
          {featureCards.map((card, index) => (
            <Paper 
              key={index}
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 2,
                transition: 'transform 0.3s, box-shadow 0.3s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                  cursor: 'pointer'
                }
              }}
              onClick={() => navigate(card.path)}
            >
              <Typography variant="h2" sx={{ mb: 2 }}>
                {card.icon}
              </Typography>
              <Typography variant="h5" gutterBottom>
                {card.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {card.description}
              </Typography>
            </Paper>
          ))}
        </Box>
        */}

        {/* NEW: Interactive Project Maps */}
        <InteractiveProjectMaps />

        {/* COMMENTED OUT: Quick Actions section - preserved for future use
        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
            {permissions.view_data && (
              <>
                <Button 
                  variant="contained" 
                  size="large"
                  onClick={() => navigate('/file-manager')}
                >
                  File Manager
                </Button>
                <Button 
                  variant="outlined" 
                  size="large"
                  onClick={() => navigate('/data-summary')}
                >
                  Data Summary
                </Button>
              </>
            )}
          </Box>
        </Box>
        */}
      </MainContentWrapper>
    </>
  );
};

export default Dashboard;