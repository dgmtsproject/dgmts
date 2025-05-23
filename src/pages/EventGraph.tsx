import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import Plotly from 'plotly.js-basic-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';

const Plot = createPlotlyComponent(Plotly);

interface ChartData {
    time: string[];
    x: number[];
    y: number[];
    z: number[];
    units: {
        x: string;
        y: string;
        z: string;
    };
}

const EventGraph: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEventData = async () => {
            try {
                setLoading(true);
                setError(null);

                const apiUrl = import.meta.env.DEV
                    ? `/api/public-api/v1/records/events/${id}/data`
                    : `/api/fetchEventData?id=${id}`;

                const response = await fetch(apiUrl, {
                    headers: {
                        ...(import.meta.env.DEV && {
                            "x-scs-api-key": import.meta.env.VITE_SYSCOM_API_KEY
                        }),
                        "Accept": "application/json",
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }

                const data = await response.json();

                // Process the data into our chart format
                const processedData: ChartData = {
                    time: data.data.map((entry: any[]) => entry[0]),
                    x: data.data.map((entry: any[]) => entry[1]),
                    y: data.data.map((entry: any[]) => entry[2]),
                    z: data.data.map((entry: any[]) => entry[3]),
                    units: {
                        x: data.columns.find((col: any) => col.name === 'X')?.unit || '',
                        y: data.columns.find((col: any) => col.name === 'Y')?.unit || '',
                        z: data.columns.find((col: any) => col.name === 'Z')?.unit || '',
                    }
                };

                setChartData(processedData);
            } catch (err: unknown) {
                setError(
                    err instanceof Error
                        ? `Failed to fetch event data: ${err.message}`
                        : "An unknown error occurred"
                );
            } finally {
                setLoading(false);
            }
        };

        fetchEventData();
    }, [id]);

    const createChart = (data: number[], unit: string, title: string) => {
        return {
            data: [
                {
                    x: chartData?.time,
                    y: data,
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    line: { color: title === 'X' ? '#3f51b5' : title === 'Y' ? '#f50057' : '#4caf50' },
                    hovertemplate: `
            <b>${title}</b><br>
            Time: %{x|%H:%M:%S.%L}<br>
            Value: %{y:.4f} ${unit}<extra></extra>
          `,
                } as Partial<Plotly.ScatterData>
            ] as Plotly.Data[],
            layout: {
                title: { text: `${title}-Axis (${unit})` },
                xaxis: {
                    title: { text: 'Time' },
                    tickformat: '%H:%M:%S.%L',
                    hoverformat: '%H:%M:%S.%L',
                },
                yaxis: {
                    title: { text: `Amplitude (${unit})` },
                },
                margin: { l: 60, r: 30, t: 60, b: 60 },
                height: 300,
            },
            config: {
                responsive: true,
                displayModeBar: true,
            }
        };
    };

    if (loading) {
        return (
            <>
                <HeaNavLogo />
                <MainContentWrapper>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                        <CircularProgress />
                    </Box>
                </MainContentWrapper >

            </>
        );
    }

    if (error) {
        return (
            <Box p={3}>
                <Typography color="error">{error}</Typography>
                <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                    Back to Events
                </Button>
            </Box>
        );
    }

    if (!chartData) {
        return (
            <Box p={3}>
                <Typography>No chart data available</Typography>
                <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                    Back to Events
                </Button>
            </Box>
        );
    }

    return (
        <>
            <HeaNavLogo />
            <MainContentWrapper>
                <Box p={3}>
                    <Typography variant="h4" gutterBottom>
                        Event #{id} - Seismic Data
                    </Typography>

                    <Box mb={4}>
                        <Plot
                            {...createChart(chartData.x, chartData.units.x, 'X')}
                        />
                    </Box>

                    <Box mb={4}>
                        <Plot
                            {...createChart(chartData.y, chartData.units.y, 'Y')}
                        />
                    </Box>

                    <Box mb={4}>
                        <Plot
                            {...createChart(chartData.z, chartData.units.z, 'Z')}
                        />
                    </Box>

                    <Button variant="contained" onClick={() => navigate(-1)}>
                        Back to Events
                    </Button>
                </Box>
            </MainContentWrapper>
        </>
    );
};

export default EventGraph;