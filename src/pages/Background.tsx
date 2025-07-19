import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { Box, Typography, CircularProgress, Button, Stack } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

const MAX_POINTS = 1000;

interface InstrumentSettings {
  alert_value: number;
  warning_value: number;
  shutdown_value: number;
}

const Background: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);
  
  // Separate data structures for each plot

  // Fetch instrument settings on component mount
  useEffect(() => {
    fetchInstrumentSettings();
  }, []);

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value')
        .eq('instrument_id', 'SMG1')
        .single();

      if (error) {
        console.error('Error fetching instrument settings:', error);
        return;
      }
      
      setInstrumentSettings(data);
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  const processedData = useMemo(() => {
    if (!rawData.length) {
      return {
        combined: { time: [], x: [], y: [], z: [] },
        x: { time: [], values: [] },
        y: { time: [], values: [] },
        z: { time: [], values: [] }
      };
    }

    // Combined: at least one axis is nonzero
    const combined = rawData.filter(entry => {
      const x = Math.abs(Number(entry[1].toFixed(2)));
      const y = Math.abs(Number(entry[2].toFixed(2)));
      const z = Math.abs(Number(entry[3].toFixed(2)));
      return x > 0 || y > 0 || z > 0;
    });
    const stepCombined = Math.max(1, Math.floor(combined.length / MAX_POINTS));
    const combinedFiltered = [];
    for (let i = 0; i < combined.length; i += stepCombined) {
      combinedFiltered.push(combined[i]);
    }

    // X: only where X is nonzero
    const xFiltered = rawData.filter(entry => Math.abs(Number(entry[1].toFixed(2))) > 0);
    const stepX = Math.max(1, Math.floor(xFiltered.length / MAX_POINTS));
    const xDown = [];
    for (let i = 0; i < xFiltered.length; i += stepX) xDown.push(xFiltered[i]);

    // Y: only where Y is nonzero
    const yFiltered = rawData.filter(entry => Math.abs(Number(entry[2].toFixed(2))) > 0);
    const stepY = Math.max(1, Math.floor(yFiltered.length / MAX_POINTS));
    const yDown = [];
    for (let i = 0; i < yFiltered.length; i += stepY) yDown.push(yFiltered[i]);

    // Z: only where Z is nonzero
    const zFiltered = rawData.filter(entry => Math.abs(Number(entry[3].toFixed(2))) > 0);
    const stepZ = Math.max(1, Math.floor(zFiltered.length / MAX_POINTS));
    const zDown = [];
    for (let i = 0; i < zFiltered.length; i += stepZ) zDown.push(zFiltered[i]);

    return {
      combined: {
        time: combinedFiltered.map(entry => parseISO(entry[0])),
        x: combinedFiltered.map(entry => entry[1]),
        y: combinedFiltered.map(entry => entry[2]),
        z: combinedFiltered.map(entry => entry[3])
      },
      x: {
        time: xDown.map(entry => parseISO(entry[0])),
        values: xDown.map(entry => entry[1])
      },
      y: {
        time: yDown.map(entry => parseISO(entry[0])),
        values: yDown.map(entry => entry[2])
      },
      z: {
        time: zDown.map(entry => parseISO(entry[0])),
        values: zDown.map(entry => entry[3])
      }
    };
  }, [rawData]);

  useEffect(() => {
    console.log('rawData', rawData.slice(0, 5));
    console.log('X', processedData.x);
    console.log('Y', processedData.y);
    console.log('Z', processedData.z);
  }, [rawData, processedData]);

  useEffect(() => {
    if (rawData.length > 0) {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    }
  }, [rawData]);

  const fetchData = async () => {
    if (!fromDate || !toDate) return;

    try {
      setLoading(true);
      setError(null);

      const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
      const startParam = formatDate(fromDate);
      const endParam = formatDate(toDate);

      const apiUrl = import.meta.env.DEV
        ? `/api/public-api/v1/records/background/15092/data?start=${startParam}&end=${endParam}`
        : `/api/fetchBackgroundData?start=${startParam}&end=${endParam}`;

      const response = await fetch(apiUrl, {
        headers: {
          ...(import.meta.env.DEV && {
            "x-scs-api-key": import.meta.env.VITE_SYSCOM_API_KEY
          }),
          "Accept": "application/json"
        }
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);

      const data = await response.json();
      setRawData(data.data);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Failed to fetch background data: ${err.message}`
          : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const createSinglePlot = (data: { time: Date[]; values: number[] }, axis: string, color: string) => {
    // Filter out any pairs where time or value is missing or invalid
    const filtered = data.time
      .map((t, i) => ({ t, v: data.values[i] }))
      .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));

    if (filtered.length === 0) return null;

    // Create shapes and annotations for reference lines
    const shapes: any[] = [];
    const annotations: any[] = [];

    if (instrumentSettings) {
      // Alert level (orange)
      if (instrumentSettings.alert_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.alert_value,
            x1: 1,
            y1: instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.alert_value,
            x1: 1,
            y1: -instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Warning level (red)
      if (instrumentSettings.warning_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.warning_value,
            x1: 1,
            y1: instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.warning_value,
            x1: 1,
            y1: -instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Shutdown level (dark red)
      if (instrumentSettings.shutdown_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.shutdown_value,
            x1: 1,
            y1: instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.shutdown_value,
            x1: 1,
            y1: -instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          }
        );
      }
    }

    return (
      <Plot
        key={`${axis}-plot`}
        data={[
          {
            x: filtered.map(pair => pair.t),
            y: filtered.map(pair => pair.v),
            type: 'scatter',
            mode: 'lines+markers',
            name: `${axis} [in/s]`,
            line: {
              color: color,
              shape: 'spline',
              width: 1.5
            },
            marker: {
              size: 6,
              color: color
            },
            hovertemplate: `
              <b>${axis}</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          }
        ]}
        layout={{
          title: { text: `${axis} Axis Vibration Data`, font: { size: 14 } },
          xaxis: {
            title: { text: 'Time' },
            type: 'date',
            tickformat: '%m/%d %H:%M',
            gridcolor: '#f0f0f0',
            showgrid: true
          },
          yaxis: {
            title: { text: 'Vibration (in/s)', standoff: 15 },
            fixedrange: false,
            gridcolor: '#f0f0f0',
            zeroline: true,
            zerolinecolor: '#f0f0f0'
          },
          showlegend: true,
          legend: {
            x: 1.05,
            xanchor: 'left',
            y: 0.5,
            yanchor: 'middle',
            font: { size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#CCC',
            borderwidth: 1
          },
          height: 350,
          margin: { t: 40, b: 60, l: 60, r: 200 },
          hovermode: 'closest',
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
          shapes: shapes,
          annotations: annotations
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          displaylogo: false
        }}
        style={{ width: '100%', height: 400 }}
        useResizeHandler={true}
      />
    );
  };

  const createCombinedPlot = (combined: { time: Date[]; x: number[]; y: number[]; z: number[] }) => {
    if (!combined.time.length) return null;

    // Create shapes and annotations for reference lines
    const shapes: any[] = [];
    const annotations: any[] = [];

    if (instrumentSettings) {
      // Alert level (orange)
      if (instrumentSettings.alert_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.alert_value,
            x1: 1,
            y1: instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.alert_value,
            x1: 1,
            y1: -instrumentSettings.alert_value,
            line: { color: 'orange', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.alert_value,
            yref: 'y',
            text: 'Alert',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,165,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Warning level (red)
      if (instrumentSettings.warning_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.warning_value,
            x1: 1,
            y1: instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.warning_value,
            x1: 1,
            y1: -instrumentSettings.warning_value,
            line: { color: 'red', width: 2, dash: 'dash' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.warning_value,
            yref: 'y',
            text: 'Warning',
            showarrow: false,
            font: { color: 'black', size: 10 },
            bgcolor: 'rgba(255,0,0,0.8)',
            xanchor: 'left'
          }
        );
      }

      // Shutdown level (dark red)
      if (instrumentSettings.shutdown_value) {
        shapes.push(
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: instrumentSettings.shutdown_value,
            x1: 1,
            y1: instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          },
          {
            type: 'line',
            xref: 'paper',
            yref: 'y',
            x0: 0,
            y0: -instrumentSettings.shutdown_value,
            x1: 1,
            y1: -instrumentSettings.shutdown_value,
            line: { color: 'darkred', width: 3, dash: 'solid' }
          }
        );
        annotations.push(
          {
            x: 0.01,
            xref: 'paper',
            y: instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          },
          {
            x: 0.01,
            xref: 'paper',
            y: -instrumentSettings.shutdown_value,
            yref: 'y',
            text: 'Shutdown',
            showarrow: false,
            font: { color: 'white', size: 10 },
            bgcolor: 'rgba(139,0,0,0.9)',
            xanchor: 'left'
          }
        );
      }
    }

    return (
      <Plot
        key="combined-plot"
        data={[
          {
            x: combined.time,
            y: combined.x,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'X [in/s]',
            line: {
              color: '#FF6384',
              shape: 'spline',
              width: 1.2
            },
            marker: {
              size: 5,
              color: '#FF6384'
            },
            hovertemplate: `
              <b>X</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.y,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Y [in/s]',
            line: {
              color: '#36A2EB',
              shape: 'spline',
              width: 1.2
            },
            marker: {
              size: 5,
              color: '#36A2EB'
            },
            hovertemplate: `
              <b>Y</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          },
          {
            x: combined.time,
            y: combined.z,
            type: 'scatter',
            mode: 'lines+markers',
            name: 'Z [in/s]',
            line: {
              color: '#FFCE56',
              shape: 'spline',
              width: 1.2
            },
            marker: {
              size: 5,
              color: '#FFCE56'
            },
            hovertemplate: `
              <b>Z</b><br>
              Time: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              Value: %{y:.6f}<extra></extra>
            `,
            connectgaps: true
          },
          // Add reference line traces for legend
          ...(instrumentSettings?.alert_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Alert (${instrumentSettings.alert_value} in/s)`,
            line: { color: 'orange', width: 2, dash: 'dash' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : []),
          ...(instrumentSettings?.warning_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Warning (${instrumentSettings.warning_value} in/s)`,
            line: { color: 'red', width: 2, dash: 'dash' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : []),
          ...(instrumentSettings?.shutdown_value ? [{
            x: [null],
            y: [null],
            type: 'scatter' as const,
            mode: 'lines' as const,
            name: `Shutdown (${instrumentSettings.shutdown_value} in/s)`,
            line: { color: 'darkred', width: 3, dash: 'solid' as const },
            showlegend: true,
            legendgroup: 'reference-lines'
          }] : [])
        ]}
        layout={{
          title: { text: 'Combined Vibration Data', font: { size: 14 } },
          xaxis: {
            title: { text: 'Time' },
            type: 'date',
            tickformat: '%m/%d %H:%M',
            gridcolor: '#f0f0f0',
            showgrid: true
          },
          yaxis: {
            title: { text: 'Vibration (in/s)', standoff: 15 },
            fixedrange: false,
            gridcolor: '#f0f0f0',
            zeroline: true,
            zerolinecolor: '#f0f0f0'
          },
          showlegend: true,
          legend: {
            x: 1.05,
            xanchor: 'left',
            y: 0.5,
            yanchor: 'middle',
            font: { size: 10 },
            bgcolor: 'rgba(255,255,255,0.8)',
            bordercolor: '#CCC',
            borderwidth: 1
          },
          height: 400,
          margin: { t: 40, b: 60, l: 60, r: 200 },
          hovermode: 'closest',
          plot_bgcolor: 'white',
          paper_bgcolor: 'white',
          shapes: shapes,
          annotations: annotations
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          displaylogo: false
        }}
        style={{ width: '100%', height: 400 }}
        useResizeHandler={true}
      />
    );
  };

  return (
    <>

      <HeaNavLogo />
            
      <MainContentWrapper>
        <Box p={3}>
          <Typography variant="h4" align="center" sx={{ mb: 3, mt: 2 }}>
            Seismograph Data Graphs
          </Typography>
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction="row" spacing={2} sx={{ mb: 4 }} alignItems="center">
              <DateTimePicker
                label="From Date"
                value={fromDate}
                onChange={setFromDate}
                maxDateTime={toDate || undefined}
                slotProps={{ textField: { size: 'small' } }}
              />
              <DateTimePicker
                label="To Date"
                value={toDate}
                onChange={setToDate}
                minDateTime={fromDate || undefined}
                maxDateTime={new Date()}
                slotProps={{ textField: { size: 'small' } }}
              />
              <Button 
                variant="contained" 
                onClick={fetchData}
                disabled={loading || !fromDate || !toDate}
                sx={{ height: 40 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Load Data'}
              </Button>
              {rawData.length > 0 && (
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/vibration-data-table', { 
                    state: { rawData, fromDate, toDate } 
                  })}
                  sx={{ height: 40 }}
                >
                  View Data Table
                </Button>
              )}
            </Stack>
          </LocalizationProvider>

          {error && (
            <Box mb={4}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          {rawData.length > 0 && (
            <>
              {processedData.x.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.x, 'X', '#FF6384')}
                </Box>
              )}
              {processedData.y.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.y, 'Y', '#36A2EB')}
                </Box>
              )}
              {processedData.z.values.length > 0 && (
                <Box mb={4} width="100%">
                  {createSinglePlot(processedData.z, 'Z', '#FFCE56')}
                </Box>
              )}
              <Box mb={4} width="100%">
                {createCombinedPlot(processedData.combined)}
              </Box>
            </>
          )}

          {!loading && rawData.length === 0 && !error && (
            <Typography variant="body1" color="textSecondary">
              Select a date range and click "Load Data" to view vibration data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>Seismograph Reference Levels</Typography>
              <Stack direction="row" spacing={3}>
                {instrumentSettings.alert_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'orange', fontWeight: 'bold' }}>Alert:</span> ±{instrumentSettings.alert_value} in/s
                  </Typography>
                )}
                {instrumentSettings.warning_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'red', fontWeight: 'bold' }}>Warning:</span> ±{instrumentSettings.warning_value} in/s
                  </Typography>
                )}
                {instrumentSettings.shutdown_value && (
                  <Typography variant="body2">
                    <span style={{ color: 'darkred', fontWeight: 'bold' }}>Shutdown:</span> ±{instrumentSettings.shutdown_value} in/s
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default Background;