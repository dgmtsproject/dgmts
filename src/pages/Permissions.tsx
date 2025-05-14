import React, { useState, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, Button, Box, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Checkbox, FormControlLabel, FormGroup
} from '@mui/material';
import { Edit as EditIcon } from '@mui/icons-material';
import { supabase } from '../supabase';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { toast } from 'react-toastify';
import "react-toastify/dist/ReactToastify.css";

type User = {
  id: string;
  sno: number;
  username: string;
  email: string;
  Company: string;
  Position: string;
  'Phone No': string;
  access_to_site?: boolean;
  view_graph?: boolean;
  download_graph?: boolean;
  view_data?: boolean;
  download_data?: boolean;
};

const Permissions: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState({
    access_to_site: false,
    view_graph: false,
    download_graph: false,
    view_data: false,
    download_data: false
  });

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;

        const usersWithSno = data?.map((user, index) => ({
          ...user,
          sno: index + 1
        })) || [];

        setUsers(usersWithSno);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleEditClick = (user: User) => {
    setCurrentUser(user);
    setPermissions({
      access_to_site: user.access_to_site || false,
      view_graph: user.view_graph || false,
      download_graph: user.download_graph || false,
      view_data: user.view_data || false,
      download_data: user.download_data || false
    });
    setEditDialogOpen(true);
  };

  const handlePermissionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPermissions({
      ...permissions,
      [e.target.name]: e.target.checked
    });
  };

  const handleSaveChanges = async () => {
    if (!currentUser) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update(permissions)
        .eq('id', currentUser.id);

      if (error) throw error;

      setUsers(users.map(user => 
        user.id === currentUser.id ? { ...user, ...permissions } : user
      ));

      setEditDialogOpen(false);
    toast.success('Permissions updated successfully for ' + currentUser.username);
    } catch (error) {
      console.error('Error updating permissions:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('Error updating permissions: ' + errorMessage);

    }
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <Box sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
            User Permissions
          </Typography>
          
          <TableContainer component={Paper} sx={{ border: '1px solid black' }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f1f1f1' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>S.No</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Username</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Company</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Position</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Phone No</TableCell>
                  <TableCell sx={{ fontWeight: 'bold', border: '1px solid black' }}>Permissions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Loading users...</TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">No users found</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id} sx={{ backgroundColor: '#fff' }}>
                      <TableCell sx={{ border: '1px solid black' }}>{user.sno}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>{user.username || '-'}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>{user.email}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>{user.Company || '-'}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>{user.Position || '-'}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>{user['Phone No'] || '-'}</TableCell>
                      <TableCell sx={{ border: '1px solid black' }}>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={() => handleEditClick(user)}
                          sx={{ 
                            py: 1, 
                            fontSize: 14,
                            minWidth: 'auto',
                            px: 1
                          }}
                        >
                            <EditIcon />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Edit Permissions Dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
          <DialogTitle>Edit User Permissions</DialogTitle>
          <DialogContent>
            {currentUser && (
              <Box sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {currentUser.username} ({currentUser.email})
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.access_to_site}
                        onChange={handlePermissionChange}
                        name="access_to_site"
                      />
                    }
                    label="Access to Site"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.view_graph}
                        onChange={handlePermissionChange}
                        name="view_graph"
                      />
                    }
                    label="View Graph"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.download_graph}
                        onChange={handlePermissionChange}
                        name="download_graph"
                      />
                    }
                    label="Download Graph"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.view_data}
                        onChange={handlePermissionChange}
                        name="view_data"
                      />
                    }
                    label="View Data"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={permissions.download_data}
                        onChange={handlePermissionChange}
                        name="download_data"
                      />
                    }
                    label="Download Data"
                  />
                </FormGroup>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveChanges} variant="contained" color="primary">
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </MainContentWrapper>
    </>
  );
};

export default Permissions;