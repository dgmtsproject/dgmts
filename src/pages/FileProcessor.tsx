import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography,
  Paper,
  CircularProgress,
  Button,
  Box,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';

interface FileData {
  eventId: number;
  content: string;
  startTime: string;
  peakX: number;
  peakY: number;
  peakZ: number;
}

const FileProcessor: React.FC = () => {
  const syscomapikey = import.meta.env.VITE_SYSCOM_API_KEY;
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

useEffect(() => {
  const fetchRandomFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the same dual-path approach as Seismograph.tsx
      const apiBase = import.meta.env.DEV
        ? "/api/public-api/v1/records/events"  // Vite proxy in dev
        : "/api/fetchEvents";   // Serverless function in prod

      // Fetch events
      const eventsResponse = await fetch(apiBase, {
        headers: {
          ...(import.meta.env.DEV && { 
            'x-scs-api-key': syscomapikey 
          }),
          'Accept': 'application/json'
        }
      });
      
      if (!eventsResponse.ok) {
        throw new Error(`HTTP error! Status: ${eventsResponse.status}`);
      }
      
      const responseData = await eventsResponse.json();
      
      // Ensure the response is an array
      const events = Array.isArray(responseData) ? responseData : [];
      
      // Get random events (max 5)
      const randomEvents = events.length <= 5 
        ? [...events] 
        : [...events].sort(() => 0.5 - Math.random()).slice(0, 5);
      
      // Fetch files - always use proxy path
      const fileBase = "/api/public-api/v1";
      const fetchedFiles = await Promise.all(
        randomEvents.map(async (event) => {
          try {
            const fileResponse = await fetch(
              `${fileBase}/records/events/${event.id}/file?format=ascii`,
              { headers: { 'x-scs-api-key': syscomapikey } }
            );
            
            return {
              eventId: event.id,
              content: fileResponse.ok ? await fileResponse.text() : 'No content',
              startTime: event.startTime,
              peakX: event.peakX,
              peakY: event.peakY,
              peakZ: event.peakZ
            };
          } catch (e) {
            console.error('Error fetching file:', e);
            return null;
          }
        })
      );
      
      setFiles(fetchedFiles.filter((file): file is FileData => file !== null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  fetchRandomFiles();
}, [syscomapikey]);
  const handleBack = () => {
    navigate('/seismograph');
  };

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <Typography variant="h4" gutterBottom>
          Event Files (Random 5 Samples)
        </Typography>
        
        {loading && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <CircularProgress />
            <Typography>Loading file data...</Typography>
          </Box>
        )}
        
        {error && (
          <Typography color="error" sx={{ mb: 3 }}>
            Error: {error}
          </Typography>
        )}
        
        {!loading && !error && (
          <Paper elevation={3} sx={{ mb: 3 }}>
            <List>
              {files.map((file, index) => (
                <React.Fragment key={file.eventId}>
                  <ListItem alignItems="flex-start">
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle1">
                            Event ID: {file.eventId}
                          </Typography>
                          <Typography variant="caption">
                            {new Date(file.startTime).toLocaleString()}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Box sx={{ display: 'flex', gap: 2, mb: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2">
                              <strong>Peak X:</strong> {file.peakX}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Peak Y:</strong> {file.peakY}
                            </Typography>
                            <Typography variant="body2">
                              <strong>Peak Z:</strong> {file.peakZ}
                            </Typography>
                          </Box>
                          <Paper 
                            variant="outlined" 
                            sx={{ 
                              p: 1,
                              backgroundColor: '#f5f5f5',
                              overflow: 'auto',
                              maxHeight: '400px',
                              fontFamily: 'monospace',
                              whiteSpace: 'pre-wrap'
                            }}
                          >
                            {file.content}
                          </Paper>
                        </Box>
                      }
                    //   secondaryTypographyProps={{ component: 'div' }}
                    />
                  </ListItem>
                  {index < files.length - 1 && <Divider component="li" />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        )}
        
        <Button 
          variant="contained" 
          onClick={handleBack}
          disabled={loading}
          sx={{ mt: 2 }}
        >
          Back to Events
        </Button>
      </MainContentWrapper>
    </>
  );
};

export default FileProcessor;