import React, { useState, useEffect } from 'react';
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
  Summarize as SummaryIcon,
  ExitToApp as LogoutIcon,
  Person as UserIcon,
  VerifiedUser as AdminProfileIcon,
  AccountTree as ProjectIcon,
} from '@mui/icons-material';
import { useAdminContext } from '../context/AdminContext';
import { supabase } from '../supabase';

const NavSidebar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [openGraphs, setOpenGraphs] = useState(false);
  const [openProject, setOpenProject] = useState(false);
  const [hasLongBridgeAccess, setHasLongBridgeAccess] = useState(false);
  const { isAdmin, setIsAdmin, userEmail } = useAdminContext();

useEffect(() => {
  const checkProjectAccess = async () => {
    if (!userEmail) return;

    try {
      const { data: projectData, error: projectError } = await supabase
        .from('Projects')
        .select('id')
        .eq('name', 'Long Bridge North')
        .single();

      if (projectError || !projectData) {
        console.error('Error fetching project:', projectError);
        setHasLongBridgeAccess(false);
        return;
      }
      const { data, error } = await supabase
        .from('ProjectUsers')
        .select('*')
        .eq('user_email', userEmail)
        .eq('project_id', projectData.id);

      setHasLongBridgeAccess(Boolean(isAdmin || (data && data.length > 0)));

      if (error) {
        console.error('Error checking access:', error);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setHasLongBridgeAccess(false);
    }
  };

  checkProjectAccess();
}, [userEmail, isAdmin]);

  const handleGraphsClick = () => {
    setOpenGraphs(!openGraphs);
  };

  const handleProjectClick = () => {
    setOpenProject(!openProject);
  };

  const handleLogout = () => {
    setIsAdmin(false);
    navigate('/signin');
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
          <Typography variant="h6">DGMTS-imSite</Typography>
        </Box>
        <Divider />
        <List>
          <ListItemButton component={Link} to="/projects">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <ProjectsIcon />
            </ListItemIcon>
            <ListItemText primary="Projects" />
          </ListItemButton>

          
            <ListItemButton component={Link} to="/instruments-list">
              <ListItemIcon sx={{ color: 'inherit' }}>
                <InstrumentsIcon />
              </ListItemIcon>
              <ListItemText primary="Instruments" />
            </ListItemButton>


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

              {/* Long Bridge North Project Section - only show if has access */}
              {(isAdmin || hasLongBridgeAccess) && (
                <>
                  <ListItemButton onClick={handleProjectClick} sx={{ pl: 4 }}>
                    <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
                      <ProjectIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Long Bridge North" />
                    {openProject ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                  <Collapse in={openProject} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding sx={{ bgcolor: '#002366' }}>
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

                      {/* <ListItemButton
                        component={Link}
                        to="/reading-tables"
                        sx={{ pl: 4 }}
                      >
                    <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
                      <TableChartIcon fontSize="small" />
                    </ListItemIcon>
                        <ListItemText primary="Reading Tables" />
                      </ListItemButton> */}
                    </List>
                  </Collapse>
                </>
              )}
            </List>
          </Collapse>

          <ListItemButton component={Link} to="/file-manager">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <FileManagerIcon />
            </ListItemIcon>
            <ListItemText primary="File Manager" />
          </ListItemButton>
          <ListItemButton
            component={Link}
            to="/data-summary"
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <SummaryIcon />
            </ListItemIcon>
            <ListItemText primary="Data Summary" />
          </ListItemButton>

          {isAdmin && (
            <>
              <ListItemButton component={Link} to="/admin-setup">
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText primary="Admin Setup" />
              </ListItemButton>
              <ListItemButton component={Link} to="/export-data">
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <ExportIcon />
                </ListItemIcon>
                <ListItemText primary="Export Data" />
              </ListItemButton>
              {/* <ListItemButton component={Link} to="/seismograph">
                <ListItemIcon sx={{ color: 'inherit' }}>
                </ListItemIcon>
                <ListItemText primary="Seismograph" />
                </ListItemButton> */}
            </>
          )}
        </List>
      </Box>

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
              secondary={userEmail || "Not logged in"}
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