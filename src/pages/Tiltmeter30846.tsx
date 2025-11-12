import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import BackButton from '../components/Back';
import MainContentWrapper from '../components/MainContentWrapper';
import { 
  Typography, 
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Box,
  Paper,
  Tooltip
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { API_BASE_URL } from '../config';
import { supabase } from '../supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { createReferenceLinesOnly, getThresholdsFromSettings, createZeroReferenceLine } from '../utils/graphZones';

interface SensorData {
  id: number;
  node_id: number;
  timestamp: string;
  x_value: number;
  y_value: number;
  z_value: number;
  created_at: string;
}

interface InstrumentSettings {
  alert_value?: number;
  warning_value?: number;
  shutdown_value?: number;
}

interface Project {
  id: number;
  name: string;
}

interface Instrument {
  instrument_id: string;
  instrument_name: string;
  project_id: number;
  instrument_location?: string;
}

const Tiltmeter30846: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sensorData, setSensorData] = useState<SensorData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<number>(142939);
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);
  const [project, setProject] = useState<Project | null>(location.state?.project || null);
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);

  // Fetch instrument settings and project info on component mount
  useEffect(() => {
    fetchInstrumentSettings();
    if (!location.state?.project) {
      fetchProjectInfo();
    } else {
      // If project is passed from navigation, fetch available instruments for this project
      fetchAvailableInstruments(location.state.project.id);
    }
  }, [location.state?.project]);

  const fetchProjectInfo = async () => {
    try {
      // First get the project_id for this tiltmeter (using node_id to find instrument)
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id')
        .eq('instrument_id', 'TILTMETER-30846')
        .single();

      if (instrumentError) {
        console.error('Error fetching instrument project:', instrumentError);
        return;
      }

      if (!instrumentData || !instrumentData.project_id) {
        console.error('No project_id found for instrument TILTMETER-30846');
        return;
      }

      // Then get the project details
      const { data: projectData, error: projectError } = await supabase
        .from('Projects')
        .select('id, name')
        .eq('id', instrumentData.project_id)
        .single();

      if (projectError) {
        console.error('Error fetching project details:', projectError);
        return;
      }

      setProject(projectData);
      fetchAvailableInstruments(projectData.id);
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  };

  const fetchAvailableInstruments = async (projectId: number) => {
    try {
      // Get all instruments for this project that have graph pages
      const { data, error } = await supabase
        .from('instruments')
        .select('instrument_id, instrument_name, project_id, instrument_location')
        .eq('project_id', projectId)
        .in('instrument_id', ['SMG1', 'SMG-2', 'SMG-3', 'TILT-142939', 'TILT-143969', 'TILTMETER-30846'])
        .order('instrument_id');

      if (error) {
        console.error('Error fetching available instruments:', error);
        return;
      }

      setAvailableInstruments(data || []);
    } catch (err) {
      console.error('Error fetching available instruments:', err);
    }
  };

  const handleInstrumentChange = (instrumentId: string) => {
    if (instrumentId === 'SMG1') {
      navigate('/background', { state: { project } });
    } else if (instrumentId === 'SMG-2') {
      navigate('/anc-seismograph', { state: { project } });
    } else if (instrumentId === 'SMG-3') {
      navigate('/smg3-seismograph', { state: { project } });
    } else if (instrumentId === 'TILT-142939') {
      navigate('/tiltmeter-142939', { state: { project } });
    } else if (instrumentId === 'TILTMETER-30846') {
      navigate('/tiltmeter-30846', { state: { project } });
    }
  };

  const fetchSensorData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startTime = new Date();
      
      // Calculate start time based on selected range
      switch (timeRange) {
        case '1h':
          startTime.setHours(now.getHours() - 1);
          break;
        case '6h':
          startTime.setHours(now.getHours() - 6);
          break;
        case '24h':
          startTime.setDate(now.getDate() - 1);
          break;
        case '7d':
          startTime.setDate(now.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(now.getDate() - 30);
          break;
        default:
          startTime.setDate(now.getDate() - 1);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/sensor-data/${selectedNode}?start_time=${startTime.toISOString()}&limit=1000`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch sensor data');
      }
      
      const data = await response.json();
      setSensorData(data.reverse()); // Reverse to show chronological order
    } catch (error) {
      toast.error('Failed to fetch sensor data');
      console.error('Error fetching sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerDataFetch = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/fetch-sensor-data`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to trigger data fetch');
      }
      
      toast.success('Data fetch triggered successfully');
      setTimeout(fetchSensorData, 2000); // Refresh data after 2 seconds
    } catch (error) {
      toast.error('Failed to trigger data fetch');
      console.error('Error triggering data fetch:', error);
    }
  };

  const fetchInstrumentSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value')
        .eq('instrument_name', 'Tiltmeter (30846)')
        .single();
      if (error) throw error;
      setInstrumentSettings(data);
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  useEffect(() => {
    fetchSensorData();
    fetchInstrumentSettings();
  }, [selectedNode, timeRange]);

  // Prepare data for charts
  const timestamps = sensorData.map(d => new Date(d.timestamp));
  const xValues = sensorData.map(d => d.x_value);
  const yValues = sensorData.map(d => d.y_value);
  const zValues = sensorData.map(d => d.z_value);

  // Color palette and hovertemplate for consistency
  const COLORS = {
    x: '#10b981',
    y: '#8b5cf6',
    z: '#f59e0b',
  };
  const AXIS_HOVERTEMPLATE = (axis: string) => `
    <b>${axis}-Axis</b><br>
    Time: %{x|%m/%d/%Y %H:%M}<br>
    Value: %{y:.6f}°<extra></extra>
  `;

  const plotlyLayout = {
    autosize: true,
    height: 550,
    margin: { t: 60, b: 180, l: 80, r: 80 },
    title: {
      font: { size: 20, weight: 700, color: '#1f2937' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { 
        text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER-30846</span>`, 
        standoff: 20, 
        font: { size: 16, weight: 700, color: '#374151' } 
      },
      type: 'date' as const,
      tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 14, color: '#374151', weight: 700 },
      tickangle: 0,
      tickmode: 'auto' as const,
      ticks: 'outside' as const,
      ticklen: 8,
      tickwidth: 1,
      tickcolor: '#666666',
      showticklabels: true,
      minor: {
        nticks: 4,
        ticklen: 4,
        tickwidth: 0.5,
        tickcolor: '#999999',
        showgrid: false
      }
    },
    yaxis: {
      title: { 
        text: 'Tilt (degrees)', 
        standoff: 25,
        font: { size: 16, weight: 700, color: '#374151' }
      },
      fixedrange: false,
      gridcolor: '#f0f0f0',
      zeroline: true,
      zerolinecolor: '#f0f0f0',
      tickfont: { size: 14, color: '#374151', weight: 700 }
    },
    showlegend: true,
    legend: {
      x: 0.02,
      xanchor: 'left' as const,
      y: -0.45,
      yanchor: 'top' as const,
      orientation: 'h' as const,
      font: { size: 12, weight: 700 },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#CCC',
      borderwidth: 1,
      traceorder: 'normal' as const
    },
    hovermode: 'closest' as const,
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
  };

  // Helper function to calculate y-axis range for auto-zoom
  const getYAxisRange = (values: number[], thresholds: any) => {
    if (values.length === 0) return { min: -0.1, max: 0.1 };
    
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const range = maxValue - minValue;
    
    // Add 20% padding
    const padding = Math.max(range * 0.2, 0.01);
    
    // Consider threshold values for range
    const thresholdMax = Math.max(
      thresholds.warning || 0,
      thresholds.alert || 0,
      thresholds.shutdown || 0
    );
    
    return {
      min: Math.min(minValue - padding, -thresholdMax * 1.2),
      max: Math.max(maxValue + padding, thresholdMax * 1.2)
    };
  };

  function getReferenceShapesAndAnnotations() {
    if (!instrumentSettings) return { shapes: [createZeroReferenceLine()], annotations: [] };
    
    // Get thresholds (this tiltmeter uses general values, not axis-specific)
    const thresholds = getThresholdsFromSettings(instrumentSettings);
    
    // Create colored zones and threshold lines
    const referenceLines = createReferenceLinesOnly(thresholds);
    return {
      shapes: [createZeroReferenceLine(), ...referenceLines.shapes],
      annotations: referenceLines.annotations
    };
  }

  const openChartInWindow = (
    chartTitle: string,
    chartData: any[],
    layout: any,
    config: any,
    location: string | undefined
  ) => {
    const windowTitle = `${project?.name || 'Project'} - ${chartTitle}${location ? ` - ${location}` : ''}`;
    // Popup window size - reduced height
    const windowFeatures = 'width=1400,height=750,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no';
    
    const newWindow = window.open('', '_blank', windowFeatures);
    if (!newWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }

    newWindow.document.title = windowTitle;

    // Update layout for popup window - ensure it uses the same font settings
    const popupLayout = {
      ...layout,
      height: 650,
      autosize: true
    };

    // Set up the HTML structure with Plotly from CDN
    // Using the exact same layout ensures fonts appear correctly
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${windowTitle}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.plot.ly/plotly-2.26.0.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background-color: #f5f5f5;
            }
            #chart {
              background-color: white;
              padding: 20px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              overflow: visible !important;
              width: 100% !important;
              min-width: 100% !important;
            }
            .plotly-graph-div {
              overflow: visible !important;
            }
            .js-plotly-plot {
              overflow: visible !important;
            }
            /* Force bold font weight for all Plotly text elements */
            .js-plotly-plot svg text {
              font-weight: 700 !important;
            }
          </style>
        </head>
        <body>
          <div id="chart"></div>
          <script>
            const data = ${JSON.stringify(chartData)};
            const layout = ${JSON.stringify(layout)};
            const config = ${JSON.stringify(config)};
            Plotly.newPlot('chart', data, layout, config).then(function() {
              const plotDiv = document.getElementById('chart');
              if (plotDiv) {
                // Function to make all text bold in SVG (for display)
                function makeTextBold() {
                  const textElements = plotDiv.querySelectorAll('svg text');
                  textElements.forEach(function(text) {
                    text.setAttribute('font-weight', 'bold');
                    text.setAttribute('font-weight', '700');
                    text.style.fontWeight = '700';
                  });
                }
                
                makeTextBold();
                
                // Override download button to capture SVG with bold fonts and convert to image
                setTimeout(function() {
                  const modeBar = plotDiv.querySelector('.modebar');
                  if (modeBar) {
                    const downloadBtn = modeBar.querySelector('[data-title="Download plot as a png"]');
                    if (downloadBtn) {
                      // Clone button to remove existing handlers
                      const newDownloadBtn = downloadBtn.cloneNode(true);
                      downloadBtn.parentNode.replaceChild(newDownloadBtn, downloadBtn);
                      
                      newDownloadBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        // Ensure all SVG text elements have bold font-weight
                        makeTextBold();
                        
                        // Wait a moment for fonts to be applied
                        setTimeout(function() {
                          // Use html2canvas to capture the rendered chart with bold fonts
                          if (typeof html2canvas !== 'undefined') {
                            // Hide all Plotly hover elements before capture
                            const hoverElements = plotDiv.querySelectorAll('.hoverlayer, .hovertext, [class*="hover"]');
                            const hiddenElements = [];
                            
                            hoverElements.forEach(function(el) {
                              const originalDisplay = el.style.display;
                              el.style.display = 'none';
                              hiddenElements.push({ element: el, display: originalDisplay });
                            });
                            
                            // Also hide any tooltip elements
                            const tooltips = document.querySelectorAll('.plotly .hoverlayer, .plotly .hovertext');
                            tooltips.forEach(function(el) {
                              if (!hiddenElements.some(item => item.element === el)) {
                                const originalDisplay = el.style.display;
                                el.style.display = 'none';
                                hiddenElements.push({ element: el, display: originalDisplay });
                              }
                            });
                            
                            // Function to restore hover elements
                            function restoreHoverElements() {
                              hiddenElements.forEach(function(item) {
                                if (item.element && item.element.parentNode) {
                                  item.element.style.display = item.display || '';
                                }
                              });
                            }
                            
                            // Get the SVG element to determine actual chart dimensions
                            const svgElement = plotDiv.querySelector('svg');
                            let targetWidth = config.toImageButtonOptions?.width || 1200;
                            let targetHeight = config.toImageButtonOptions?.height || 600;
                            
                            if (svgElement) {
                              // Use the SVG's viewBox or actual dimensions
                              const viewBox = svgElement.getAttribute('viewBox');
                              if (viewBox) {
                                const viewBoxValues = viewBox.split(' ');
                                if (viewBoxValues.length >= 4) {
                                  targetWidth = Math.max(targetWidth, parseFloat(viewBoxValues[2]));
                                  targetHeight = Math.max(targetHeight, parseFloat(viewBoxValues[3]));
                                }
                              }
                              // Also check actual rendered size
                              targetWidth = Math.max(targetWidth, svgElement.scrollWidth || svgElement.clientWidth);
                              targetHeight = Math.max(targetHeight, svgElement.scrollHeight || svgElement.clientHeight);
                            }
                            
                            // Temporarily set explicit width to ensure full capture
                            const originalWidth = plotDiv.style.width;
                            const originalOverflow = plotDiv.style.overflow;
                            plotDiv.style.width = targetWidth + 'px';
                            plotDiv.style.overflow = 'visible';
                            
                            // Capture the chart at full width
                            html2canvas(plotDiv, {
                              scale: config.toImageButtonOptions?.scale || 2,
                              useCORS: true,
                              logging: false,
                              backgroundColor: '#ffffff',
                              allowTaint: true,
                              width: targetWidth,
                              height: targetHeight
                            }).then(function(canvas) {
                              // Restore hover elements
                              restoreHoverElements();
                              
                              // Restore original styles
                              plotDiv.style.width = originalWidth;
                              plotDiv.style.overflow = originalOverflow;
                              // Convert canvas to blob and download
                              canvas.toBlob(function(blob) {
                                if (blob) {
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.download = (config.toImageButtonOptions?.filename || 'chart') + '.png';
                                  link.href = url;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                }
                              }, 'image/png');
                            }).catch(function(err) {
                              // Restore hover elements on error
                              restoreHoverElements();
                              
                              // Restore original styles on error
                              plotDiv.style.width = originalWidth;
                              plotDiv.style.overflow = originalOverflow;
                              console.error('Error with html2canvas:', err);
                              // Fallback to Plotly's download
                              Plotly.downloadImage(plotDiv, {
                                format: 'png',
                                filename: config.toImageButtonOptions?.filename || 'chart',
                                height: config.toImageButtonOptions?.height || 600,
                                width: config.toImageButtonOptions?.width || 1200,
                                scale: config.toImageButtonOptions?.scale || 2
                              });
                            });
                          } else {
                            // Fallback if html2canvas not loaded
                            Plotly.downloadImage(plotDiv, {
                              format: 'png',
                              filename: config.toImageButtonOptions?.filename || 'chart',
                              height: config.toImageButtonOptions?.height || 600,
                              width: config.toImageButtonOptions?.width || 1200,
                              scale: config.toImageButtonOptions?.scale || 2
                            });
                          }
                        }, 100);
                      }, true);
                    }
                  }
                }, 500);
                
                // Make text bold on any updates
                const observer = new MutationObserver(function() {
                  makeTextBold();
                });
                observer.observe(plotDiv, { childList: true, subtree: true });
              }
            });
          </script>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };
  
  // General thresholds for legend display
  const thresholds = instrumentSettings ? getThresholdsFromSettings(instrumentSettings) : {} as any;

  const xChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'X-Axis',
      line: { color: COLORS.x, shape: 'spline' as const },
      hovertemplate: AXIS_HOVERTEMPLATE('X'),
      connectgaps: true,
    },
    ...(thresholds?.alert ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Alert (${thresholds.alert} °)`,
      line: { color: 'orange', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.warning ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Warning (${thresholds.warning} °)`,
      line: { color: 'red', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.shutdown ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Shutdown (${thresholds.shutdown} °)`,
      line: { color: 'darkred', width: 3, dash: 'solid' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : [])
  ];
  const yChartData = [
    {
      x: timestamps,
      y: yValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Y-Axis',
      line: { color: COLORS.y, shape: 'spline' as const },
      hovertemplate: AXIS_HOVERTEMPLATE('Y'),
      connectgaps: true,
    },
    ...(thresholds?.alert ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Alert (${thresholds.alert} °)`,
      line: { color: 'orange', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.warning ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Warning (${thresholds.warning} °)`,
      line: { color: 'red', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.shutdown ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Shutdown (${thresholds.shutdown} °)`,
      line: { color: 'darkred', width: 3, dash: 'solid' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : [])
  ];
  const zChartData = [
    {
      x: timestamps,
      y: zValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Z-Axis',
      line: { color: COLORS.z, shape: 'spline' as const },
      hovertemplate: AXIS_HOVERTEMPLATE('Z'),
      connectgaps: true,
    },
    ...(thresholds?.alert ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Alert (${thresholds.alert} °)`,
      line: { color: 'orange', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.warning ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Warning (${thresholds.warning} °)`,
      line: { color: 'red', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.shutdown ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Shutdown (${thresholds.shutdown} °)`,
      line: { color: 'darkred', width: 3, dash: 'solid' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : [])
  ];
  const combinedChartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'X-Axis',
      line: { color: COLORS.x, shape: 'spline' as const },
      hovertemplate: AXIS_HOVERTEMPLATE('X'),
      connectgaps: true,
    },
    {
      x: timestamps,
      y: yValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Y-Axis',
      line: { color: COLORS.y, shape: 'spline' as const },
      hovertemplate: AXIS_HOVERTEMPLATE('Y'),
      connectgaps: true,
    },
    {
      x: timestamps,
      y: zValues,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'Z-Axis',
      line: { color: COLORS.z, shape: 'spline' as const },
      hovertemplate: AXIS_HOVERTEMPLATE('Z'),
      connectgaps: true,
    },
    ...(thresholds?.alert ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Alert (${thresholds.alert} °)`,
      line: { color: 'orange', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.warning ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Warning (${thresholds.warning} °)`,
      line: { color: 'red', width: 2, dash: 'dash' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : []),
    ...(thresholds?.shutdown ? [{
      x: [null],
      y: [null],
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: `Shutdown (${thresholds.shutdown} °)`,
      line: { color: 'darkred', width: 3, dash: 'solid' as const },
      showlegend: true,
      legendgroup: 'reference-lines'
    }] : [])
  ];

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
      <BackButton />
        <Typography variant="h4" gutterBottom>
          {project ? `${project.name} - Tiltmeter Data Graphs (Node-30846)` : 'Tiltmeter (30846) - Sensor Data'}
        </Typography>

        {project && (
          <Box mb={3} display="flex" justifyContent="center" alignItems="center" gap={3}>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#003087' }}>
                Location: {availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location 
                  ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location 
                  : 'None'}
            </Typography>
            <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
              <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
              <Select
                labelId="instrument-select-label"
                value="TILTMETER-30846"
                label="Select Instrument"
                onChange={(e) => handleInstrumentChange(e.target.value as string)}
              >
                {availableInstruments.map((instrument) => (
                  <MenuItem key={instrument.instrument_id} value={instrument.instrument_id}>
                    {instrument.instrument_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Node</InputLabel>
              <Select
                value={selectedNode}
                label="Node"
                onChange={(e) => setSelectedNode(Number(e.target.value))}
              >
                <MenuItem value={142939}>Node 142939</MenuItem>
                <MenuItem value={143969}>Node 143969</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(e.target.value)}
              >
                <MenuItem value="1h">Last 1 Hour</MenuItem>
                <MenuItem value="6h">Last 6 Hours</MenuItem>
                <MenuItem value="24h">Last 24 Hours</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
            
            <Button
              variant="contained"
              onClick={fetchSensorData}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : null}
            >
              {loading ? 'Loading...' : 'Refresh Data'}
            </Button>
            
            <Button
              variant="contained"
              color="success"
              onClick={triggerDataFetch}
            >
              Fetch New Data
            </Button>
          </Box>
          
          <Typography variant="body2" color="text.secondary">
            <strong>Data Points:</strong> {sensorData.length} | 
            <strong> Last Updated:</strong> {sensorData.length > 0 ? new Date(sensorData[sensorData.length - 1].timestamp).toLocaleString() : 'No data'}
          </Typography>
        </Paper>

        {/* Individual Charts in order: X, Y, Z */}
        {/* X-Axis Chart */}
        <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom>
              X-Axis Tilt (Channel 0)
            </Typography>
            <Tooltip title="Open in Popup">
              <Button
                startIcon={<OpenInNew />}
                onClick={() => {
                  const chartConfig = {
                    responsive: true,
                    displayModeBar: true,
                    scrollZoom: true,
                    displaylogo: false,
                  };
                  const chartLayout = {
                    ...plotlyLayout,
                    title: { 
                      text: `${project ? project.name + ' - ' : ''}X-Axis Tilt - Node ${selectedNode} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location : 'Location: None'}`,
                      font: { size: 20, weight: 'bold', color: '#1f2937' },
                      x: 0.5,
                      xanchor: 'center'
                    },
                    xaxis: {
                      ...plotlyLayout.xaxis,
                      title: { 
                        text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER-30846</span>`, 
                        standoff: 20, 
                        font: { size: 16, weight: 'bold', color: '#374151' } 
                      },
                      tickfont: { size: 14, color: '#374151', weight: 'bold' }
                    },
                    yaxis: { 
                      ...plotlyLayout.yaxis, 
                      title: { 
                        text: 'X-Axis Value', 
                        standoff: 15,
                        font: { size: 16, weight: 'bold', color: '#374151' }
                      },
                      tickfont: { size: 14, color: '#374151', weight: 'bold' },
                      range: (() => {
                        const range = getYAxisRange(xValues, getThresholdsFromSettings(instrumentSettings));
                        return [range.min, range.max];
                      })()
                    },
                    shapes: getReferenceShapesAndAnnotations().shapes,
                    annotations: getReferenceShapesAndAnnotations().annotations,
                  };
                  openChartInWindow(
                    `X-Axis Tilt - Node ${selectedNode}`,
                    xChartData,
                    chartLayout,
                    chartConfig,
                    availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location
                  );
                }}
                variant="outlined"
                size="small"
              >
                Open in Popup
              </Button>
            </Tooltip>
          </Box>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={xChartData}
              layout={{
                ...plotlyLayout,
                title: { 
                  text: `${project ? project.name + ' - ' : ''}X-Axis Tilt - Node ${selectedNode} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location : 'Location: None'}`,
                  font: { size: 20, weight: 700, color: '#1f2937' },
                  x: 0.5,
                  xanchor: 'center'
                },
                yaxis: { 
                  ...plotlyLayout.yaxis, 
                  title: { 
                    text: 'X-Axis Value', 
                    standoff: 15,
                    font: { size: 16, weight: 700, color: '#374151' }
                  },
                  range: (() => {
                    const range = getYAxisRange(xValues, getThresholdsFromSettings(instrumentSettings));
                    return [range.min, range.max];
                  })()
                },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                  style={{ width: '100%', height: 550 }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
        {/* Y-Axis Chart */}
        <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom>
              Y-Axis Tilt (Channel 1)
            </Typography>
            <Tooltip title="Open in Popup">
              <Button
                startIcon={<OpenInNew />}
                onClick={() => {
                  const chartConfig = {
                    responsive: true,
                    displayModeBar: true,
                    scrollZoom: true,
                    displaylogo: false,
                  };
                  const chartLayout = {
                    ...plotlyLayout,
                    title: { 
                      text: `${project ? project.name + ' - ' : ''}Y-Axis Tilt - Node ${selectedNode} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location : 'Location: None'}`,
                      font: { size: 20, weight: 'bold', color: '#1f2937' },
                      x: 0.5,
                      xanchor: 'center'
                    },
                    xaxis: {
                      ...plotlyLayout.xaxis,
                      title: { 
                        text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER-30846</span>`, 
                        standoff: 20, 
                        font: { size: 16, weight: 'bold', color: '#374151' } 
                      },
                      tickfont: { size: 14, color: '#374151', weight: 'bold' }
                    },
                    yaxis: { 
                      ...plotlyLayout.yaxis, 
                      title: { 
                        text: 'Y-Axis Value', 
                        standoff: 15,
                        font: { size: 16, weight: 'bold', color: '#374151' }
                      },
                      tickfont: { size: 14, color: '#374151', weight: 'bold' },
                      range: (() => {
                        const range = getYAxisRange(yValues, getThresholdsFromSettings(instrumentSettings));
                        return [range.min, range.max];
                      })()
                    },
                    shapes: getReferenceShapesAndAnnotations().shapes,
                    annotations: getReferenceShapesAndAnnotations().annotations,
                  };
                  openChartInWindow(
                    `Y-Axis Tilt - Node ${selectedNode}`,
                    yChartData,
                    chartLayout,
                    chartConfig,
                    availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location
                  );
                }}
                variant="outlined"
                size="small"
              >
                Open in Popup
              </Button>
            </Tooltip>
          </Box>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={yChartData}
              layout={{
                ...plotlyLayout,
                title: { 
                  text: `${project ? project.name + ' - ' : ''}Y-Axis Tilt - Node ${selectedNode} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location : 'Location: None'}`,
                  font: { size: 20, weight: 700, color: '#1f2937' },
                  x: 0.5,
                  xanchor: 'center'
                },
                yaxis: { 
                  ...plotlyLayout.yaxis, 
                  title: { 
                    text: 'Y-Axis Value', 
                    standoff: 15,
                    font: { size: 16, weight: 700, color: '#374151' }
                  },
                  range: (() => {
                    const range = getYAxisRange(yValues, getThresholdsFromSettings(instrumentSettings));
                    return [range.min, range.max];
                  })()
                },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                  style={{ width: '100%', height: 550 }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
        {/* Z-Axis Chart */}
        <Paper elevation={3} sx={{ p: 3, mb: 10 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" gutterBottom>
              Z-Axis Tilt (Channel 2)
            </Typography>
            <Tooltip title="Open in Popup">
              <Button
                startIcon={<OpenInNew />}
                onClick={() => {
                  const chartConfig = {
                    responsive: true,
                    displayModeBar: true,
                    scrollZoom: true,
                    displaylogo: false,
                  };
                  const chartLayout = {
                    ...plotlyLayout,
                    title: { 
                      text: `${project ? project.name + ' - ' : ''}Z-Axis Tilt - Node ${selectedNode} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location : 'Location: None'}`,
                      font: { size: 20, weight: 'bold', color: '#1f2937' },
                      x: 0.5,
                      xanchor: 'center'
                    },
                    xaxis: {
                      ...plotlyLayout.xaxis,
                      title: { 
                        text: `Time<br><span style="font-size:12px;color:#666;">TILTMETER-30846</span>`, 
                        standoff: 20, 
                        font: { size: 16, weight: 'bold', color: '#374151' } 
                      },
                      tickfont: { size: 14, color: '#374151', weight: 'bold' }
                    },
                    yaxis: { 
                      ...plotlyLayout.yaxis, 
                      title: { 
                        text: 'Z-Axis Value', 
                        standoff: 15,
                        font: { size: 16, weight: 'bold', color: '#374151' }
                      },
                      tickfont: { size: 14, color: '#374151', weight: 'bold' },
                      range: (() => {
                        const range = getYAxisRange(zValues, getThresholdsFromSettings(instrumentSettings));
                        return [range.min, range.max];
                      })()
                    },
                    shapes: getReferenceShapesAndAnnotations().shapes,
                    annotations: getReferenceShapesAndAnnotations().annotations,
                  };
                  openChartInWindow(
                    `Z-Axis Tilt - Node ${selectedNode}`,
                    zChartData,
                    chartLayout,
                    chartConfig,
                    availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location
                  );
                }}
                variant="outlined"
                size="small"
              >
                Open in Popup
              </Button>
            </Tooltip>
          </Box>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={zChartData}
              layout={{
                ...plotlyLayout,
                title: { 
                  text: `${project ? project.name + ' - ' : ''}Z-Axis Tilt - Node ${selectedNode} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location : 'Location: None'}`,
                  font: { size: 20, weight: 700, color: '#1f2937' },
                  x: 0.5,
                  xanchor: 'center'
                },
                yaxis: { 
                  ...plotlyLayout.yaxis, 
                  title: { 
                    text: 'Z-Axis Value', 
                    standoff: 15,
                    font: { size: 16, weight: 700, color: '#374151' }
                  },
                  range: (() => {
                    const range = getYAxisRange(zValues, getThresholdsFromSettings(instrumentSettings));
                    return [range.min, range.max];
                  })()
                },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                  style={{ width: '100%', height: 550 }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
        {/* Combined Chart - last */}
        <Paper elevation={3} sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Combined X, Y, Z Tilt Data
          </Typography>
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <Plot
              data={combinedChartData}
              layout={{
                ...plotlyLayout,
                title: { 
                  text: `${project ? project.name + ' - ' : ''}Combined Tilt Data - Node ${selectedNode} - ${availableInstruments.length > 0 && availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location ? availableInstruments.find(inst => inst.instrument_id === 'TILTMETER-30846')?.instrument_location : 'Location: None'}`,
                  font: { size: 20, weight: 700, color: '#1f2937' },
                  x: 0.5,
                  xanchor: 'center'
                },
                yaxis: { 
                  ...plotlyLayout.yaxis, 
                  title: { 
                    text: 'Axis Values', 
                    standoff: 15,
                    font: { size: 16, weight: 700, color: '#374151' }
                  },
                  range: (() => {
                    const range = getYAxisRange([...xValues, ...yValues, ...zValues], getThresholdsFromSettings(instrumentSettings));
                    return [range.min, range.max];
                  })()
                },
                shapes: getReferenceShapesAndAnnotations().shapes,
                annotations: getReferenceShapesAndAnnotations().annotations,
              }}
              config={{ responsive: true, displayModeBar: true, displaylogo: false }}
                  style={{ width: '100%', height: 550 }}
              useResizeHandler={true}
            />
          </div>
        </Paper>
      </MainContentWrapper>
      <ToastContainer />
    </>
  );
};

export default Tiltmeter30846; 