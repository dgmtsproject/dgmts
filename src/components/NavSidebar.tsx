import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from "../assets/logo.jpg"; 
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
  Notifications as AlarmsIcon,
  ShowChart as GraphsIcon,
  InsertDriveFile as FileManagerIcon,
  AdminPanelSettings as AdminIcon,
  ExpandLess,
  ExpandMore,
  Summarize as SummaryIcon,
  ExitToApp as LogoutIcon,
  Person as UserIcon,
  VerifiedUser as AdminProfileIcon,
  AccountTree as ProjectIcon,
  Map as ProjectMapIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import { useAdminContext } from '../context/AdminContext';
import { supabase } from '../supabase';

const NavSidebar: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [openGraphs, setOpenGraphs] = useState(false);
  const [openProject, setOpenProject] = useState(false);
  const [opensecondProject, setOpenSecondProject] = useState(false);
  const [openThirdProject, setOpenThirdProject] = useState(false);
  const [openFourthProject, setOpenFourthProject] = useState(false);
  const [hasLongBridgeAccess, setHasLongBridgeAccess] = useState(false);
  const [hasDgmtsTestingAccess, setHasDgmtsTestingAccess] = useState(false);
  const [hasAncDarBcAccess, setHasAncDarBcAccess] = useState(false);
  const [hasYellowLineAncAccess, setHasYellowLineAncAccess] = useState(false);
  const [projectNames, setProjectNames] = useState({
    longBridge: 'Long Bridge North',
    dgmtsTesting: 'DGMTS Testing',
    ancDarBc: 'ANC DAR-BC',
    yellowLineAnc: 'Yellow Line ANC'
  });
  const { isAdmin, setIsAdmin, userEmail, permissions } = useAdminContext();

useEffect(() => {
  const checkProjectAccess = async () => {
    if (!userEmail) return;

    try {
      // Check access for Long Bridge North (ID: 24637)
      const { data, error } = await supabase
        .from('ProjectUsers')
        .select('*')
        .eq('user_email', userEmail)
        .eq('project_id', 24637);

      setHasLongBridgeAccess(Boolean(isAdmin || (data && data.length > 0)));

      if (error) {
        console.error('Error checking Long Bridge North access:', error);
      }
    } catch (err) {
      console.error('Unexpected error checking Long Bridge North access:', err);
      setHasLongBridgeAccess(false);
    }
  };

  const checkDgmtsTestingAccess = async () => {
    if (!userEmail) return;
    try {
      // Check access for DGMTS Testing (ID: 20151)
      const { data, error } = await supabase
        .from('ProjectUsers')
        .select('*')
        .eq('user_email', userEmail)
        .eq('project_id', 20151);
      
      setHasDgmtsTestingAccess(Boolean(isAdmin || (data && data.length > 0)));
      
      if (error) {
        console.error('Error checking DGMTS Testing access:', error);
      }
    } catch (err) {
      console.error('Unexpected error checking DGMTS Testing access:', err);
      setHasDgmtsTestingAccess(false);
    }
  };

  const checkAncDarBcAccess = async () => {
    if (!userEmail) return;
    try {
      // Check access for ANC DAR-BC (ID: 24429)
      const { data, error } = await supabase
        .from('ProjectUsers')
        .select('*')
        .eq('user_email', userEmail)
        .eq('project_id', 24429);
      
      setHasAncDarBcAccess(Boolean(isAdmin || (data && data.length > 0)));
      
      if (error) {
        console.error('Error checking ANC DAR-BC access:', error);
      }
    } catch (err) {
      console.error('Unexpected error checking ANC DAR-BC access:', err);
      setHasAncDarBcAccess(false);
    }
  };

  const checkYellowLineAncAccess = async () => {
    if (!userEmail) return;
    try {
      // Check access for Yellow Line ANC (ID: 25304)
      const { data, error } = await supabase
        .from('ProjectUsers')
        .select('*')
        .eq('user_email', userEmail)
        .eq('project_id', 25304);
      
      setHasYellowLineAncAccess(Boolean(isAdmin || (data && data.length > 0)));
      
      if (error) {
        console.error('Error checking Yellow Line ANC access:', error);
      }
    } catch (err) {
      console.error('Unexpected error checking Yellow Line ANC access:', err);
      setHasYellowLineAncAccess(false);
    }
  };

  const fetchProjectNames = async () => {
    try {
      const { data, error } = await supabase
        .from('Projects')
        .select('id, name')
        .in('id', [24637, 20151, 24429, 25304]);
      
      if (error) {
        console.error('Error fetching project names:', error);
        return;
      }
      
      if (data) {
        const names = {
          longBridge: data.find(p => p.id === 24637)?.name || 'Long Bridge North',
          dgmtsTesting: data.find(p => p.id === 20151)?.name || 'DGMTS Testing',
          ancDarBc: data.find(p => p.id === 24429)?.name || 'ANC DAR-BC',
          yellowLineAnc: data.find(p => p.id === 25304)?.name || 'Yellow Line ANC'
        };
        setProjectNames(names);
      }
    } catch (err) {
      console.error('Error fetching project names:', err);
    }
  };

  checkProjectAccess();
  checkDgmtsTestingAccess();
  checkAncDarBcAccess();
  checkYellowLineAncAccess();
  fetchProjectNames();
}, [userEmail, isAdmin]);

  const handleGraphsClick = () => {
    setOpenGraphs(!openGraphs);
  };

  const handleProjectClick = () => {
    setOpenProject(!openProject);
  };
  const handleSecondProjectClick = () => {
    setOpenSecondProject(!opensecondProject);
  };
  const handleThirdProjectClick = () => {
    setOpenThirdProject(!openThirdProject);
  };
  const handleFourthProjectClick = () => {
    setOpenFourthProject(!openFourthProject);
  };

  const handleLogout = async () => {
    localStorage.removeItem('jwtToken');
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
          justifyContent: 'space-between',
          borderRight: '1px solid #fff', // Match the header's border
        },
      }}
    >
      <Box>
         <Box>
        {/* Updated header area with logo */}
        <Box sx={{  
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: 'white', // White background for logo area
          borderBottom: '1px solid #000' // Match header's border
        }}>
          <img
            src={logo}
            alt="DGMTS Logo"
            style={{ 
              height: '50px', 
              marginBottom: '-5px',
            }} 
          />
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'black', // Black text to match your header
              fontWeight: 'bold',
              fontSize: '1rem',
            }}
          >
            DGMTS-imSite
          </Typography>
        </Box>
        
        {/* Rest of your existing sidebar content... */}
        <Divider />
      </Box>
        <List>
          <ListItemButton component={Link} to="/dashboard">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
          {permissions.access_to_site && (
            <ListItemButton component={Link} to="/projects-list">
              <ListItemIcon sx={{ color: 'inherit' }}>
                <ProjectsIcon />
              </ListItemIcon>
              <ListItemText primary="Projects" />
            </ListItemButton>
          )}
          <ListItemButton component={Link} to="/alarms">
            <ListItemIcon sx={{ color: 'inherit' }}>
              <AlarmsIcon />
            </ListItemIcon>
            <ListItemText primary="Alarms" />
          </ListItemButton>

          {permissions.view_graph && (
            <>
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
                        <ListItemText primary={projectNames.longBridge} />
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
                        </List>
                      </Collapse>
                    </>
                  )}
                  {(isAdmin || hasDgmtsTestingAccess) && (
                    <>
                      <ListItemButton onClick={handleSecondProjectClick} sx={{ pl: 4 }}>
                        <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
                          <ProjectIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={projectNames.dgmtsTesting} />
                        {opensecondProject ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                      <Collapse in={opensecondProject} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding sx={{ bgcolor: '#002366' }}>
                          {/* Remove Seismograph link, keep only Background as Seismograph Data Graphs */}
                          <ListItemButton
                            component={Link}
                            to="/background"
                            sx={{ pl: 4 }}
                          >
                            <ListItemText primary="Seismograph" />
                          </ListItemButton>
                        </List>
                      </Collapse>
                    </>
                  )}
                  {(isAdmin || hasAncDarBcAccess) && (
                    <>
                      <ListItemButton onClick={handleThirdProjectClick} sx={{ pl: 4 }}>
                        <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
                          <ProjectIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={projectNames.ancDarBc} />
                        {openThirdProject ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                                              <Collapse in={openThirdProject} timeout="auto" unmountOnExit>
                          <List component="div" disablePadding sx={{ bgcolor: '#002366' }}>
                            {/* <ListItemButton
                              // component={Link}
                              // to="/tiltmeter"
                              sx={{ pl: 4 }}
                            >
                              <ListItemText primary="Tiltmeter" />
                            </ListItemButton> */}
                                  <ListItemButton
        component={Link}
        to="/anc-seismograph"
        sx={{ pl: 4 }}
      >
        <ListItemText primary="Seismograph" />
      </ListItemButton>
      <ListItemButton
        component={Link}
        to="/smg3-seismograph"
        sx={{ pl: 4 }}
      >
        <ListItemText primary="Seismograph 2 (SMG-3)" />
      </ListItemButton>
                            <ListItemButton
                              component={Link}
                              to="/tiltmeter-142939"
                              sx={{ pl: 4 }}
                            >
                              <ListItemText primary="Tiltmeter-Node-142939" />
                            </ListItemButton>
                            <ListItemButton
                              component={Link}
                              to="/tiltmeter-143969"
                              sx={{ pl: 4 }}
                            >
                              <ListItemText primary="Tiltmeter-Node-143969" />
                            </ListItemButton>
                          </List>
                        </Collapse>
                    </>
                  )}
                  {(isAdmin || hasYellowLineAncAccess) && (
                    <>
                      <ListItemButton onClick={handleFourthProjectClick} sx={{ pl: 4 }}>
                        <ListItemIcon sx={{ color: 'inherit', minWidth: '36px' }}>
                          <ProjectIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary={projectNames.yellowLineAnc} />
                        {openFourthProject ? <ExpandLess /> : <ExpandMore />}
                      </ListItemButton>
                      <Collapse in={openFourthProject} timeout="auto" unmountOnExit>
                        <List component="div" disablePadding sx={{ bgcolor: '#002366' }}>
                          <ListItemButton
                            component={Link}
                            to="/rocksmg1-seismograph"
                            sx={{ pl: 4 }}
                          >
                            <ListItemText primary="Rock Seismograph 1 (ROCKSMG-1)" />
                          </ListItemButton>
                          <ListItemButton
                            component={Link}
                            to="/rocksmg2-seismograph"
                            sx={{ pl: 4 }}
                          >
                            <ListItemText primary="Rock Seismograph 2 (ROCKSMG-2)" />
                          </ListItemButton>
                        </List>
                      </Collapse>
                    </>
                  )}
                </List>
              </Collapse>
            </>
          )}
          {permissions.view_data && (
            <ListItemButton
              component={Link}
              to="/data-summary"
            >
              <ListItemIcon sx={{ color: 'inherit' }}>
                <SummaryIcon />
              </ListItemIcon>
              <ListItemText primary="Data Summary" />
            </ListItemButton>
          )}

          <ListItemButton
            component={Link}
            to="/maps"
          >
            <ListItemIcon sx={{ color: 'inherit' }}>
              <ProjectMapIcon />
            </ListItemIcon>
            <ListItemText primary="Maps" />
          </ListItemButton>
          {permissions.view_data && (
            <ListItemButton component={Link} to="/file-manager">
              <ListItemIcon sx={{ color: 'inherit' }}>
                <FileManagerIcon />
              </ListItemIcon>
              <ListItemText primary="File Manager" />
            </ListItemButton>
          )}


          {isAdmin && (
            <>
              <ListItemButton component={Link} to="/admin-setup">
                <ListItemIcon sx={{ color: 'inherit' }}>
                  <AdminIcon />
                </ListItemIcon>
                <ListItemText primary="Admin Setup" />
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