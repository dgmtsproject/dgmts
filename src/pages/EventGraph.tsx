import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, CircularProgress } from '@mui/material';
import Plot, { PlotParams } from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import EventReportGenerator from '../components/EventReportGenerator';

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

interface EventDetails {
    id: number;
    filename: string;
    startTime: string;
    duration: number;
    triggerTime: string;
    peakX: number;
    peakY: number;
    peakZ: number;
    maxVsum: number;
    domFreqX: number;
    domFreqY: number;
    domFreqZ: number;
    unit: string;
}

const EventGraph: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [chartData, setChartData] = useState<ChartData | null>(null);
    const [eventDetails, setEventDetails] = useState<EventDetails | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const chartXRef = useRef<HTMLDivElement>(null);
    const chartYRef = useRef<HTMLDivElement>(null);
    const chartZRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchEventData = async () => {
            try {
                setLoading(true);
                setError(null);

                // First fetch event details for pdf event information content
                const eventApiUrl = import.meta.env.DEV
                    ? `/api/public-api/v1/records/events/${id}`
                    : `/api/fetchEventById?id=${id}`;

                const eventResponse = await fetch(eventApiUrl, {
                    headers: {
                        ...(import.meta.env.DEV && {
                            "x-scs-api-key": import.meta.env.VITE_SYSCOM_API_KEY
                        }),
                        "Accept": "application/json",
                    },
                });

                if (!eventResponse.ok) {
                    throw new Error(`Failed to fetch event details: ${eventResponse.status}`);
                }

                const eventData = await eventResponse.json();

                const processedEventDetails: EventDetails = {
                    id: eventData.id,
                    filename: eventData.filename,
                    startTime: eventData.startTime,
                    duration: eventData.duration,
                    triggerTime: eventData.triggerTime,
                    peakX: eventData.peakX,
                    peakY: eventData.peakY,
                    peakZ: eventData.peakZ,
                    maxVsum: eventData.maxVsum,
                    domFreqX: eventData.domFreqX,
                    domFreqY: eventData.domFreqY,
                    domFreqZ: eventData.domFreqZ,
                    unit: eventData.unit || 'mm/s' // Default to mm/s if not specified
                };

                setEventDetails(processedEventDetails);

                const dataApiUrl = import.meta.env.DEV
                    ? `/api/public-api/v1/records/events/${id}/data`
                    : `/api/fetchEventData?id=${id}`;

                const dataResponse = await fetch(dataApiUrl, {
                    headers: {
                        ...(import.meta.env.DEV && {
                            "x-scs-api-key": import.meta.env.VITE_SYSCOM_API_KEY
                        }),
                        "Accept": "application/json",
                    },
                });

                if (!dataResponse.ok) {
                    throw new Error(`Failed to fetch event data: ${dataResponse.status}`);
                }

                const data = await dataResponse.json();

                // Process the data into our chart format
                const processedChartData: ChartData = {
                    time: data.data.map((entry: any[]) => entry[0]),
                    x: data.data.map((entry: any[]) => entry[1]),
                    y: data.data.map((entry: any[]) => entry[2]),
                    z: data.data.map((entry: any[]) => entry[3]),
                    units: {
                        x: data.columns.find((col: any) => col.name === 'X')?.unit || processedEventDetails.unit,
                        y: data.columns.find((col: any) => col.name === 'Y')?.unit || processedEventDetails.unit,
                        z: data.columns.find((col: any) => col.name === 'Z')?.unit || processedEventDetails.unit,
                    }
                };

                setChartData(processedChartData);
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

    // Calculate the common y-axis range for all charts
    const getYAxisRange = () => {
        if (!chartData) return [-1, 1];
        
        const allValues = [...chartData.x, ...chartData.y, ...chartData.z];
        const min = Math.min(...allValues);
        const max = Math.max(...allValues);
        const padding = (max - min) * 0.1; // 10% padding
        
        return [min - padding, max + padding];
    };

    const yAxisRange = getYAxisRange();

 const createChart = (data: number[], unit: string, title: string): PlotParams => {
    // Convert the time strings to JavaScript Date objects
    const timeData = chartData?.time.map(t => new Date(t)) || [];
    
    return {
        data: [{
            x: timeData,
            y: data,
            type: 'scatter',
            mode: 'lines',
            line: { color: '#3f51b5', width: 2 },
            hoverinfo: 'x+y',
            hovertemplate: `<b>${title}</b><br>Time: %{x|%m/%d/%Y, %H:%M:%S}<br>Value: %{y:.4f} ${unit}<extra></extra>`,
        }],
        layout: {
            title: undefined,
            xaxis: {
                title: undefined,
                type: 'date',
                tickformat: '%m/%d/%Y, %H:%M:%S',
                hoverformat: '%m/%d/%Y, %H:%M:%S',
                showgrid: true,
                gridcolor: '#f0f0f0',
                showline: true,
            },
            yaxis: {
                title: { text: title },
                side: 'left',
                range: yAxisRange,
                showgrid: true,
                gridcolor: '#f0f0f0',
                showline: true,
            },
            margin: { l: 40, r: 20, t: 20, b: 40 },
            height: 250,
            showlegend: false,
            hovermode: 'x unified',
        },
        config: {
            responsive: true,
            displayModeBar: true,
            displaylogo: false,
        },
        style: { width: '100%', height: '250px' }
    };
};

    if (loading) {
        return (
            <>
                <HeaNavLogo />
                <MainContentWrapper>
                    <BackButton to="/dashboard" />
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
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
                    <BackButton to="/dashboard" />
                    <Box p={3}>
                        <Typography color="error">{error}</Typography>
                        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                            Back to Events
                        </Button>
                    </Box>
                </MainContentWrapper>
            </>
        );
    }

    if (!chartData) {
        return (
            <>
                <HeaNavLogo />
                <MainContentWrapper>
                    <BackButton to="/dashboard" />
                    <Box p={3}>
                        <Typography>No chart data available</Typography>
                        <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                            Back to Events
                        </Button>
                    </Box>
                </MainContentWrapper>
            </>
        );
    }

    return (
<>
            <HeaNavLogo />
            <MainContentWrapper>
                <BackButton to="/dashboard" />
                <Box p={3}>
                    <Typography variant="h4" gutterBottom>
                        Event #{id} - Axis Graphs
                    </Typography>

                    {loading && (
                        <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                            <CircularProgress />
                        </Box>
                    )}

                    {error && (
                        <Box mb={4}>
                            <Typography color="error">{error}</Typography>
                            <Button variant="contained" onClick={() => navigate(-1)} sx={{ mt: 2 }}>
                                Back to Events
                            </Button>
                        </Box>
                    )}

                    {chartData && (
                        <>
                            <Box mb={4} sx={{ width: '100%' }} ref={chartXRef}>
                                <Plot {...createChart(chartData.x, chartData.units.x, 'X')} />
                            </Box>

                            <Box mb={4} sx={{ width: '100%' }} ref={chartYRef}>
                                <Plot {...createChart(chartData.y, chartData.units.y, 'Y')} />
                            </Box>

                            <Box mb={4} sx={{ width: '100%' }} ref={chartZRef}>
                                <Plot {...createChart(chartData.z, chartData.units.z, 'Z')} />
                            </Box>

                            {eventDetails && (
                                <EventReportGenerator 
                                    eventId={Number(id)} 
                                    eventData={eventDetails}
                                    chartRefs={{
                                        x: chartXRef,
                                        y: chartYRef,
                                        z: chartZRef
                                    }}
                                />
                            )}
                        </>
                    )}

                    <Button variant="contained" onClick={() => navigate(-1)}>
                        Back to Events
                    </Button>
                </Box>
            </MainContentWrapper>
        </>
    );
};

export default EventGraph;