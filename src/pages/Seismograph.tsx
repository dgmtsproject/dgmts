import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import HeaNavLogo from "../components/HeaNavLogo";
import MainContentWrapper from "../components/MainContentWrapper";
import { Button, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import * as XLSX from 'xlsx';

interface SeismicEvent {
  id: number;
  peakX: number;
  peakY: number;
  peakZ: number;
  startTime: string;
  [key: string]: any; // For other properties we might not use
}

const Seismograph: React.FC = () => {
  const syscomapikey = import.meta.env.VITE_SYSCOM_API_KEY;
  const [events, setEvents] = useState<SeismicEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
    console.log(syscomapikey);


    useEffect(() => {
        localStorage.removeItem('seismicEvents');
        localStorage.removeItem('fileProcessingStatus');
    }, []);

const handleEvents = async () => {
  setLoading(true);
  setError(null);
  try {
    // First try with proxy
    let response = await fetch('/api/public-api/v1/records/events', {
      method: 'GET',
      headers: {
        'x-scs-api-key': syscomapikey,
        'Accept': 'application/json'
      }
    });
    console.log('Proxy response:', response);

    // If proxy fails, try direct connection (for debugging)
    if (!response.ok) {
      console.warn('Proxy failed, trying direct connection');
      response = await fetch('https://scs.syscom-instruments.com/public-api/v1/records/events', {
        method: 'GET',
        headers: {
          'x-scs-api-key': syscomapikey,
          'Accept': 'application/json'
        }
      });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Invalid content-type. Received: ${contentType}. Response start: ${text.substring(0, 100)}`);
    }

    const data = await response.json();
    setEvents(data);
    localStorage.setItem('seismicEvents', JSON.stringify(data));
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('API Error:', errorMessage);
    setError(`Failed to load data: ${errorMessage}`);
    
    // Suggest CORS-specific troubleshooting
    if (errorMessage.includes('Failed to fetch') || errorMessage.includes('blocked by CORS')) {
      setError(prev => `${prev} (CORS issue detected)`);
    }
  } finally {
    setLoading(false);
  }
};

  const processEventFiles = () => {
    if (events.length === 0) {
      setError('Please fetch events first');
      return;
    }
    // Store that we're starting processing
    localStorage.setItem('fileProcessingStatus', JSON.stringify({
      currentIndex: 0,
      totalFiles: events.length,
      completed: false
    }));
    navigate('/process-files');
  }

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      events.map(event => ({
        ID: event.id,
        'Peak X': event.peakX,
        'Peak Y': event.peakY,
        'Peak Z': event.peakZ,
        'Start Time': event.startTime
      }))
    );
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Events");
    XLSX.writeFile(workbook, "Seismograph-Events.xlsx");
  }

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <Typography variant="h4" gutterBottom>Seismograph Events</Typography>
        
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleEvents}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Fetch Events'}
          </Button>
          
          {events.length > 0 && (
            <>
              <Button 
                variant="contained" 
                color="secondary" 
                onClick={processEventFiles}
              >
                Process Event Files
              </Button>
              <Button 
                variant="contained" 
                color="success" 
                onClick={exportToExcel}
              >
                Export to Excel
              </Button>
            </>
          )}
        </div>

        {error && (
          <Typography color="error" style={{ marginBottom: '20px' }}>
            Error: {error}
          </Typography>
        )}

        {events.length > 0 ? (
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Peak X</TableCell>
                  <TableCell>Peak Y</TableCell>
                  <TableCell>Peak Z</TableCell>
                  <TableCell>Start Time</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.id}</TableCell>
                    <TableCell>{event.peakX}</TableCell>
                    <TableCell>{event.peakY}</TableCell>
                    <TableCell>{event.peakZ}</TableCell>
                    <TableCell>{new Date(event.startTime).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          !loading && <Typography>No events found. Click "Fetch Events" to load data.</Typography>
        )}
      </MainContentWrapper>
    </>
  );
}

export default Seismograph;