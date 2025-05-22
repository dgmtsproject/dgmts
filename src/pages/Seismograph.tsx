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
    // console.log(syscomapikey);


    useEffect(() => {
        localStorage.removeItem('seismicEvents');
        localStorage.removeItem('fileProcessingStatus');
    }, []);

const handleEvents = async () => {
  setLoading(true);
  setError(null);
  try {
    // Use proxy in development, direct API in production (if CORS allows)
    const apiUrl = import.meta.env.DEV
      ? '/api/public-api/v1/records/events' // Proxy in dev
      : 'https://scs.syscom-instruments.com/public-api/v1/records/events'; // Direct in prod (if CORS allows)

    const response = await fetch(apiUrl, {
      headers: {
        'x-scs-api-key': syscomapikey,
        'Accept': 'application/json',
      },
    });
    console.log(response);

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    
    const data = await response.json();
    console.log(data);
    setEvents(data);
    localStorage.setItem('seismicEvents', JSON.stringify(data));
  } catch (err) {
    setError(`Failed to fetch: ${err instanceof Error ? err.message : String(err)}`);
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