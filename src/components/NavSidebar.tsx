import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItemIcon,
  ListItemText,
  Collapse,
  Divider,
  Box,
  Typography,
  useTheme,
  ListItemButton,
  Avatar
} from '@mui/material';
import {
  Folder as ProjectsIcon,
  SettingsInputComponent as InstrumentsIcon,
  Notifications as AlarmsIcon,
  ShowChart as GraphsIcon,
  InsertDriveFile as FileManagerIcon,
  AdminPanelSettings as AdminIcon,
  CloudDownload as ExportIcon,
  ExpandLess,
  ExpandMore,
  ExitToApp as LogoutIcon,
  Person as UserIcon,
  VerifiedUser as AdminProfileIcon
} from '@mui/icons-material';
import { useAdminContext } from '../context/AdminContext';

const NavSidebar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [openGraphs, setOpenGraphs] = useState(false);
  const { isAdmin, setIsAdmin } = useAdminContext(); // Added setIsAdmin

  const handleGraphsClick = () => {
    setOpenGraphs(!openGraphs);
  };

  const handleLogout = () => {
    // Clear admin context
    setIsAdmin(false);
    // Navigate to signin page
    navigate('/signin');
    // You might want to add additional cleanup here if needed
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 240,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 240,
          boxSizing: 'border-box',
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        },
      }}
    >
      <Box>
        <Box sx={{ p: 2, textAlign: 'center' }}>
          <Typography variant="h6">DGMTS-ImSITE</Typography>
        </Box>
        <Divider />
        <List>
          <ListItemButton component={Link} to="/projects">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <ProjectsIcon />
            </ListItemIcon>
            <ListItemText primary="Projects" />
          </ListItemButton>

          {isAdmin && (
              <ListItemButton component={Link} to="/instruments">
              <ListItemIcon sx={{ color: 'inherit' }}>
                <InstrumentsIcon />
              </ListItemIcon>
              <ListItemText primary="Instruments" />
            </ListItemButton>
          )}
          {!isAdmin && (
          <ListItemButton component={Link} to="/instruments-list">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <InstrumentsIcon />
            </ListItemIcon>
            <ListItemText primary="Instruments" />
          </ListItemButton>
          )}

          <ListItemButton component={Link} to="/alarms">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <AlarmsIcon />
            </ListItemIcon>
            <ListItemText primary="Alarms" />
          </ListItemButton>

          <ListItemButton onClick={handleGraphsClick}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <GraphsIcon />
            </ListItemIcon>
            <ListItemText primary="Graphs" />
            {openGraphs ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
          <Collapse in={openGraphs} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ bgcolor: '#003087' }}>
              <ListItemButton 
                component={Link} 
                to="/project-graphs"
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Project Graphs" />
              </ListItemButton>
              <ListItemButton 
                component={Link} 
                to="/view-custom-graphs"
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Custom Graphs" />
              </ListItemButton>
              <ListItemButton 
                component={Link} 
                to="/single-prism-with-time"
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Single Prism" />
              </ListItemButton>
              <ListItemButton 
                component={Link} 
                to="/multi-prisms-with-time"
                sx={{ pl: 4 }}
              >
                <ListItemText primary="Multiple Prisms" />
              </ListItemButton>
              <ListItemButton 
                component={Link} 
                to="/amts-track-graphs"
                sx={{ pl: 4 }}
              >
                <ListItemText primary="AMTS Track" />
              </ListItemButton>
              <ListItemButton 
                component={Link} 
                to="/amts-ref-graphs"
                sx={{ pl: 4 }}
              >
                <ListItemText primary="AMTS Ref" />
              </ListItemButton>
            </List>
          </Collapse>

          <ListItemButton component={Link} to="/file-manager">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <FileManagerIcon />
            </ListItemIcon>
            <ListItemText primary="File Manager" />
          </ListItemButton>

          {isAdmin && (
            <ListItemButton component={Link} to="/ProjectForm">
              <ListItemIcon sx={{ color: 'inherit' }}>
                <AdminIcon />
              </ListItemIcon>
              <ListItemText primary="Admin Setup" />
            </ListItemButton>
          )}

          {isAdmin && (
            <ListItemButton component={Link} to="/export-data">
              <ListItemIcon sx={{ color: 'inherit' }}>
                <ExportIcon />
              </ListItemIcon>
              <ListItemText primary="Export Data" />
            </ListItemButton>
          )}
        </List>
      </Box>

      {/* User Profile and Logout Section */}
      <Box sx={{ pb: 2 }}>
        <Divider />
        <List>
          <ListItemButton>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <Avatar sx={{ 
                bgcolor: isAdmin ? theme.palette.secondary.main : theme.palette.info.main,
                width: 32, 
                height: 32 
              }}>
                {isAdmin ? <AdminProfileIcon fontSize="small" /> : <UserIcon fontSize="small" />}
              </Avatar>
            </ListItemIcon>
            <ListItemText 
              primary={isAdmin ? "Admin" : "User"} 
              secondary="Logged in" 
            />
          </ListItemButton>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon sx={{ color: 'inherit' }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
};

export default NavSidebar;