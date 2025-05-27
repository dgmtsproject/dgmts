import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import { Box, Typography, CircularProgress } from '@mui/material';
import { format, subDays, parseISO } from 'date-fns';

const MAX_POINTS = 1000; // Maximum points to display
const WARNING_LEVEL = 0.5;

const Background: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);

  // Process data with priority for peak values
  const processedData = useMemo(() => {
    if (!rawData.length) return { time: [], x: [], y: [], z: [] };

    // Sort data by absolute value (descending) to prioritize peaks
    const sortedData = [...rawData].sort((a, b) => {
      const maxA = Math.max(Math.abs(a[1]), Math.abs(a[2]), Math.abs(a[3]));
      const maxB = Math.max(Math.abs(b[1]), Math.abs(b[2]), Math.abs(b[3]));
      return maxB - maxA;
    });

    // Take top N points (or all if less than MAX_POINTS)
    const sampledData = sortedData.slice(0, MAX_POINTS);

    return {
      time: sampledData.map(entry => parseISO(entry[0])),
      x: sampledData.map(entry => entry[1]),
      y: sampledData.map(entry => entry[2]),
      z: sampledData.map(entry => entry[3])
    };
  }, [rawData]);

  useEffect(() => {
    const fetchBackgroundData = async () => {
      try {
        setLoading(true);
        setError(null);

        const endDate = new Date();
        const startDate = subDays(endDate, 7);
        
        const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
        const startParam = formatDate(startDate);
        const endParam = formatDate(endDate);

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

    fetchBackgroundData();
  }, []);

  const createPlot = (data: number[], axis: string) => {
    return (
      <Plot
        data={[
          {
            x: processedData.time,
            y: data,
            type: 'scatter',
            mode: 'markers',
            marker: {
              size: 6,
              color: '#3f51b5',
              opacity: 0.8
            },
            name: `${axis} [in/s]`,
            hovertemplate: `
              <b>${axis} Value</b><br>
              <b>Time</b>: %{x|%Y-%m-%d %H:%M:%S.%L}<br>
              <b>Value</b>: %{y:.4f} in/s<extra></extra>
            `
          },
          {
            x: [processedData.time[0], processedData.time[processedData.time.length - 1]],
            y: [WARNING_LEVEL, WARNING_LEVEL],
            type: 'scatter',
            mode: 'lines',
            line: {
              color: 'red',
              width: 2
            },
            showlegend: false,
            hovertemplate: 'Warning Level: 0.5 in/s<extra></extra>'
          }
        ]}
        layout={{
          title: undefined,
          xaxis: { 
            title: undefined,
            type: 'date',
            tickformat: '%b %d %H:%M'
          },
          yaxis: { 
            title: { text: `${axis} [in/s]` },
            fixedrange: false
          },
          showlegend: false,
          height: 300,
          margin: { t: 20, b: 60, l: 60, r: 20 },
          hovermode: 'closest',
          hoverlabel: {
            bgcolor: '#fff',
            bordercolor: '#ddd',
            font: {
              family: 'Arial',
              size: 12,
              color: '#333'
            }
          }
        }}
        config={{
          responsive: true,
          displayModeBar: true,
          scrollZoom: true,
          toImageButtonOptions: {
            format: 'svg',
            filename: `background_${axis.toLowerCase()}`,
            height: 500,
            width: 1000,
            scale: 1
          }
        }}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />
    );
  };

  if (loading) {
    return (
      <>
        <HeaNavLogo />
        <MainContentWrapper>
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        </MainContentWrapper>
      </>
    );
  }

  if (error) {
    return (
      <>
        <HeaNavLogo />
        <MainContentWrapper>
          <Box p={3}>
            <Typography color="error">Error: {error}</Typography>
          </Box>
        </MainContentWrapper>
      </>
    );
  }

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <Box p={3}>
          <Typography variant="h4" gutterBottom>DGMTS Testing - Background </Typography>
          
          <Box mb={4}>
            {createPlot(processedData.x, 'X')}
          </Box>
          
          <Box mb={4}>
            {createPlot(processedData.y, 'Y')}
          </Box>
          
          <Box mb={4}>
            {createPlot(processedData.z, 'Z')}
          </Box>
        </Box>
      </MainContentWrapper>
    </>
  );
};

export default Background;