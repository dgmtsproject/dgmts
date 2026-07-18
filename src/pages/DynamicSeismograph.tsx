import React, { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import HeaNavLogo from '../components/HeaNavLogo';
import MainContentWrapper from '../components/MainContentWrapper';
import BackButton from '../components/Back';
import { Box, Typography, CircularProgress, Button, Stack, FormControl, InputLabel, Select, MenuItem, Tooltip, Alert } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import { format, parseISO } from 'date-fns';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAdminContext } from '../context/AdminContext';
import { createSeismographChartData, createSeismographCombinedChartData, getDisplayInstrumentId } from '../utils/seismographCharts';
import { applySeismographDisplayAdjustments } from '../utils/seismographDisplayAdjustments';
import { useInstrumentActiveGuard } from '../hooks/useInstrumentActiveGuard';

interface InstrumentSettings {
  alert_value: number;
  warning_value: number;
  shutdown_value: number;
}

interface Project {
  id: number;
  name: string;
}

interface Instrument {
  instrument_id: string;
  instrument_id_second?: string;
  instrument_name: string;
  project_id: number;
  instrument_location?: string;
}

const DynamicSeismograph: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { permissions } = useAdminContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState<Date | null>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [instrumentSettings, setInstrumentSettings] = useState<InstrumentSettings | null>(null);
  const [project, setProject] = useState<Project | null>(location.state?.project || null);
  const [availableInstruments, setAvailableInstruments] = useState<Instrument[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument | null>(null);
  const [syscomDeviceId, setSyscomDeviceId] = useState<string>('');

  // Get instrument ID from URL params or state
  const instrumentId = new URLSearchParams(location.search).get('instrument') || location.state?.instrumentId;
  const { isInactive, checking: checkingActiveStatus } = useInstrumentActiveGuard(instrumentId || '');

  useEffect(() => {
    if (!permissions.view_graph) {
      navigate('/dashboard');
      return;
    }
    
    if (instrumentId) {
      fetchInstrumentSettings();
      fetchProjectInfo();
    }
  }, [instrumentId, permissions.view_graph, navigate]);

  const fetchInstrumentSettings = async () => {
    if (!instrumentId) return;
    
    try {
      const { data, error } = await supabase
        .from('instruments')
        .select('alert_value, warning_value, shutdown_value, syscom_device_id')
        .eq('instrument_id', instrumentId)
        .single();

      if (error) {
        console.error('Error fetching instrument settings:', error);
        return;
      }
      
      setInstrumentSettings(data);
      
      // Set Syscom Device ID from database
      if (data.syscom_device_id) {
        setSyscomDeviceId(data.syscom_device_id.toString());
      }
    } catch (err) {
      console.error('Error fetching instrument settings:', err);
    }
  };

  const fetchProjectInfo = async () => {
    if (!instrumentId) return;
    
    try {
      const { data: instrumentData, error: instrumentError } = await supabase
        .from('instruments')
        .select('project_id, instrument_name, instrument_location, instrument_id_second')
        .eq('instrument_id', instrumentId)
        .single();

      if (instrumentError) {
        console.error('Error fetching instrument project:', instrumentError);
        return;
      }

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
      setSelectedInstrument({
        instrument_id: instrumentId,
        instrument_id_second: instrumentData.instrument_id_second,
        instrument_name: instrumentData.instrument_name,
        project_id: instrumentData.project_id,
        instrument_location: instrumentData.instrument_location
      });
      
      fetchAvailableInstruments(projectData.id);
    } catch (err) {
      console.error('Error fetching project info:', err);
    }
  };

  const fetchAvailableInstruments = async (projectId: number) => {
    try {
      const { data: instrumentsData, error: instrumentsError } = await supabase
        .from('instruments')
        .select('instrument_id, instrument_id_second, instrument_name, project_id, instrument_location')
        .eq('project_id', projectId)
        .order('instrument_id');

      if (instrumentsError) {
        console.error('Error fetching available instruments:', instrumentsError);
        return;
      }

      setAvailableInstruments(instrumentsData);
    } catch (err) {
      console.error('Error fetching available instruments:', err);
    }
  };

  const handleInstrumentChange = (newInstrumentId: string) => {
    const instrument = availableInstruments.find(inst => inst.instrument_id === newInstrumentId);
    if (instrument) {
      setSelectedInstrument(instrument);
      
      // Route to the appropriate page based on instrument type
      switch (newInstrumentId) {
        case 'SMG1':
          navigate('/background', { state: { project } });
          break;
        case 'SMG-1':
          navigate('/dynamic-seismograph?instrument=SMG-1', { state: { project } });
          break;
        case 'SMG-2':
          navigate('/anc-seismograph', { state: { project } });
          break;
        case 'SMG-3':
          navigate('/smg3-seismograph', { state: { project } });
          break;
        case 'AMTS-1':
        case 'AMTS-2':
          navigate('/single-prism-with-time', { state: { project } });
          break;
        case 'TILT-142939':
          navigate('/tiltmeter-142939', { state: { project } });
          break;
        case 'TILT-143969':
          navigate('/tiltmeter-143969', { state: { project } });
          break;
        default:
          // For any other instruments, stay on dynamic seismograph
          navigate(`/dynamic-seismograph?instrument=${newInstrumentId}`, { 
            state: { project, instrumentId: newInstrumentId } 
          });
          break;
      }
    }
  };

  const adjustedRawData = useMemo(
    () => applySeismographDisplayAdjustments(rawData, instrumentId || syscomDeviceId),
    [rawData, instrumentId, syscomDeviceId]
  );

  const processedData = useMemo(() => {
    if (!adjustedRawData.length) {
      return {
        combined: { time: [], x: [], y: [], z: [] },
        x: { time: [], values: [] },
        y: { time: [], values: [] },
        z: { time: [], values: [] }
      };
    }

    // Date and hour-based filtering: Ensure at least one point per hour per date (same as Background.tsx)
    const getDateHourKey = (timestamp: string) => {
      const date = timestamp.split('T')[0]; // Get YYYY-MM-DD
      const hour = timestamp.split('T')[1]?.split(':')[0]; // Get HH
      return `${date}-${hour}`;
    };

    // Group data by date and hour
    const dataByDateHour = new Map<string, any[]>();
    adjustedRawData.forEach(entry => {
      const dateHourKey = getDateHourKey(entry[0]);
      if (!dataByDateHour.has(dateHourKey)) {
        dataByDateHour.set(dateHourKey, []);
      }
      dataByDateHour.get(dateHourKey)!.push(entry);
    });

    // For each date-hour, keep the entry with the highest value (max of all axes) to ensure date-hour coverage
    const dateHourCoverageData: any[] = [];
    dataByDateHour.forEach((dateHourEntries) => {
      // Find the entry with the highest value across all axes
      let maxEntry = dateHourEntries[0];
      let maxValue = Math.max(
        Math.abs(Number(dateHourEntries[0][1])), // X axis
        Math.abs(Number(dateHourEntries[0][2])), // Y axis
        Math.abs(Number(dateHourEntries[0][3]))  // Z axis
      );
      
      dateHourEntries.forEach(entry => {
        const currentMax = Math.max(
          Math.abs(Number(entry[1])), // X axis
          Math.abs(Number(entry[2])), // Y axis
          Math.abs(Number(entry[3]))  // Z axis
        );
        if (currentMax > maxValue) {
          maxValue = currentMax;
          maxEntry = entry;
        }
      });
      
      dateHourCoverageData.push(maxEntry); // Get the entry with highest value
    });

    // Ensure minimum 500 points per chart while covering all dates
    const MIN_POINTS = 500;
    
    // Combined: at least one axis is nonzero (from date-hour coverage data)
    const combined = dateHourCoverageData.filter((entry: any) => {
      const x = Math.abs(Number(entry[1]));
      const y = Math.abs(Number(entry[2]));
      const z = Math.abs(Number(entry[3]));
      return x > 0.0001 || y > 0.0001 || z > 0.0001;
    });
    
    // Ensure combined has at least MIN_POINTS or all available data
    const combinedFiltered = combined.length <= MIN_POINTS ? combined : 
      combined.filter((_, index) => index % Math.max(1, Math.floor(combined.length / MIN_POINTS)) === 0);

    // X: ensure at least MIN_POINTS while covering dates
    const xFiltered = dateHourCoverageData.filter((entry: any) => Math.abs(Number(entry[1])) > 0.0001);
    const xDown = xFiltered.length <= MIN_POINTS ? xFiltered : 
      xFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(xFiltered.length / MIN_POINTS)) === 0);

    // Y: ensure at least MIN_POINTS while covering dates
    const yFiltered = dateHourCoverageData.filter((entry: any) => Math.abs(Number(entry[2])) > 0.0001);
    const yDown = yFiltered.length <= MIN_POINTS ? yFiltered : 
      yFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(yFiltered.length / MIN_POINTS)) === 0);

    // Z: ensure at least MIN_POINTS while covering dates
    const zFiltered = dateHourCoverageData.filter((entry: any) => Math.abs(Number(entry[3])) > 0.0001);
    const zDown = zFiltered.length <= MIN_POINTS ? zFiltered : 
      zFiltered.filter((_: any, index: number) => index % Math.max(1, Math.floor(zFiltered.length / MIN_POINTS)) === 0);

    return {
      combined: {
        time: combinedFiltered.map(entry => parseISO(entry[0])),
        x: combinedFiltered.map(entry => parseFloat(Number(entry[1]).toFixed(3))),
        y: combinedFiltered.map(entry => parseFloat(Number(entry[2]).toFixed(3))),
        z: combinedFiltered.map(entry => parseFloat(Number(entry[3]).toFixed(3)))
      },
      x: {
        time: xDown.map(entry => parseISO(entry[0])),
        values: xDown.map(entry => parseFloat(Number(entry[1]).toFixed(3)))
      },
      y: {
        time: yDown.map(entry => parseISO(entry[0])),
        values: yDown.map(entry => parseFloat(Number(entry[2]).toFixed(3)))
      },
      z: {
        time: zDown.map(entry => parseISO(entry[0])),
        values: zDown.map(entry => parseFloat(Number(entry[3]).toFixed(3)))
      }
    };
  }, [adjustedRawData]);

  const fetchData = async () => {
    if (isInactive) {
      setError('This instrument is inactive. Enable it from the instruments list to load data.');
      return;
    }

    if (!fromDate || !toDate || !syscomDeviceId) {
      setError('Please enter a Syscom Device ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formatDate = (date: Date) => format(date, "yyyy-MM-dd'T'HH:mm:ss");
      const startParam = formatDate(fromDate);
      const endParam = formatDate(toDate);

      const apiUrl = import.meta.env.DEV
        ? `/api/public-api/v1/records/background/${syscomDeviceId}/data?start=${startParam}&end=${endParam}`
        : `/api/fetchBackgroundData?start=${startParam}&end=${endParam}&instrumentId=${syscomDeviceId}`;

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
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              background-color: #f5f5f5;
            }
            .chart-wrapper {
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              padding: 20px;
              height: calc(100vh - 40px);
              box-sizing: border-box;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            #plotly-chart {
              width: 100%;
              height: 100%;
            }
            /* Force bold font weight for all Plotly text elements */
            .js-plotly-plot svg text {
              font-weight: 700 !important;
            }
          </style>
        </head>
        <body>
          <div class="chart-wrapper">
            <div id="plotly-chart"></div>
          </div>
          <script>
            const chartData = ${JSON.stringify(chartData)};
            const chartLayout = ${JSON.stringify(popupLayout)};
            const chartConfig = ${JSON.stringify(config)};
            
            // Wait for Plotly to load
            function initChart() {
              if (typeof Plotly === 'undefined') {
                setTimeout(initChart, 100);
                return;
              }
              
              // Function to make all text bold in SVG by setting font-weight as SVG attribute
              function makeTextBold() {
                const plotDiv = document.getElementById('plotly-chart');
                if (plotDiv) {
                  const textElements = plotDiv.querySelectorAll('svg text');
                  textElements.forEach(function(text) {
                    // Set as SVG attribute so it's preserved
                    text.setAttribute('font-weight', '700');
                    text.style.fontWeight = '700';
                  });
                }
              }
              
              // Create the plot with the exact same data, layout, and config
              Plotly.newPlot('plotly-chart', chartData, chartLayout, chartConfig).then(function() {
                // Apply bold fonts after initial render
                makeTextBold();
                
                // Override download button to ensure fonts are preserved
                setTimeout(function() {
                  const plotDiv = document.getElementById('plotly-chart');
                  if (plotDiv) {
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
                          
                          // Force all text to be bold before download
                          makeTextBold();
                          
                          // Also set font-weight on all text elements more aggressively
                          const textElements = plotDiv.querySelectorAll('svg text');
                          textElements.forEach(function(text) {
                            text.setAttribute('font-weight', '700');
                            text.setAttribute('font-weight', 'bold');
                            text.style.fontWeight = '700';
                            text.style.fontWeight = 'bold';
                            // Also try setting it on the parent if needed
                            if (text.parentElement) {
                              text.parentElement.setAttribute('font-weight', '700');
                            }
                          });
                          
                          // Hide hover elements and modebar before download
                          const hoverElements = plotDiv.querySelectorAll('.hoverlayer, .hovertext, [class*="hover"]');
                          const modebar = plotDiv.querySelector('.modebar');
                          const hiddenElements = [];
                          
                          // Hide hover elements
                          hoverElements.forEach(function(el) {
                            const originalDisplay = el.style.display;
                            el.style.display = 'none';
                            hiddenElements.push({ element: el, display: originalDisplay });
                          });
                          
                          // Hide modebar (toolbar with download button)
                          if (modebar) {
                            const originalModebarDisplay = modebar.style.display;
                            modebar.style.display = 'none';
                            hiddenElements.push({ element: modebar, display: originalModebarDisplay });
                          }
                          
                          // Function to restore hidden elements
                          function restoreHiddenElements() {
                            hiddenElements.forEach(function(item) {
                              if (item.element && item.element.parentNode) {
                                item.element.style.display = item.display || '';
                              }
                            });
                          }
                          
                          // Get actual chart dimensions from SVG
                          const svgElement = plotDiv.querySelector('svg');
                          let targetWidth = chartConfig.toImageButtonOptions?.width || 1200;
                          let targetHeight = chartConfig.toImageButtonOptions?.height || 600;
                          
                          if (svgElement) {
                            // Get actual SVG dimensions
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
                          
                          // Wait a moment for changes to apply, then use html2canvas
                          setTimeout(function() {
                            if (typeof html2canvas !== 'undefined') {
                              // Temporarily set explicit dimensions to ensure full capture
                              const originalWidth = plotDiv.style.width;
                              const originalHeight = plotDiv.style.height;
                              const originalOverflow = plotDiv.style.overflow;
                              
                              plotDiv.style.width = targetWidth + 'px';
                              plotDiv.style.height = targetHeight + 'px';
                              plotDiv.style.overflow = 'visible';
                              
                              // Use html2canvas to capture the rendered chart with bold fonts
                              html2canvas(plotDiv, {
                                scale: chartConfig.toImageButtonOptions?.scale || 2,
                                useCORS: true,
                                logging: false,
                                backgroundColor: '#ffffff',
                                allowTaint: true,
                                width: targetWidth,
                                height: targetHeight,
                                windowWidth: targetWidth,
                                windowHeight: targetHeight
                              }).then(function(canvas) {
                                // Restore hidden elements
                                restoreHiddenElements();
                                
                                // Restore original styles
                                plotDiv.style.width = originalWidth;
                                plotDiv.style.height = originalHeight;
                                plotDiv.style.overflow = originalOverflow;
                                
                                // Convert canvas to blob and download
                                canvas.toBlob(function(blob) {
                                  if (blob) {
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.download = (chartConfig.toImageButtonOptions?.filename || 'chart') + '.png';
                                    link.href = url;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(url);
                                  }
                                }, 'image/png');
                              }).catch(function(err) {
                                // Restore hidden elements on error
                                restoreHiddenElements();
                                
                                // Restore original styles on error
                                plotDiv.style.width = originalWidth;
                                plotDiv.style.height = originalHeight;
                                plotDiv.style.overflow = originalOverflow;
                                
                                console.error('Error with html2canvas:', err);
                                // Fallback to Plotly's download
                                Plotly.downloadImage(plotDiv, {
                                  format: 'png',
                                  filename: chartConfig.toImageButtonOptions?.filename || 'chart',
                                  height: chartConfig.toImageButtonOptions?.height || 600,
                                  width: chartConfig.toImageButtonOptions?.width || 1200,
                                  scale: chartConfig.toImageButtonOptions?.scale || 2
                                });
                              });
                            } else {
                              // Fallback if html2canvas not loaded
                              restoreHiddenElements();
                              Plotly.downloadImage(plotDiv, {
                                format: 'png',
                                filename: chartConfig.toImageButtonOptions?.filename || 'chart',
                                height: chartConfig.toImageButtonOptions?.height || 600,
                                width: chartConfig.toImageButtonOptions?.width || 1200,
                                scale: chartConfig.toImageButtonOptions?.scale || 2
                              });
                            }
                          }, 150);
                        }, true);
                      }
                    }
                  }
                }, 500);
                
                // Use MutationObserver to keep fonts bold when Plotly redraws
                const plotDiv = document.getElementById('plotly-chart');
                if (plotDiv) {
                  const observer = new MutationObserver(function() {
                    makeTextBold();
                  });
                  observer.observe(plotDiv, { childList: true, subtree: true });
                }
                
                // Handle window resize
                window.addEventListener('resize', function() {
                  Plotly.Plots.resize('plotly-chart');
                  // Reapply bold fonts after resize
                  setTimeout(makeTextBold, 100);
                });
              });
            }
            
            initChart();
          </script>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
  };

  const createSinglePlot = (data: { time: Date[]; values: number[] }, axis: string, color: string) => {
    const chartResult = createSeismographChartData(
      data,
      axis,
      color,
      instrumentId || selectedInstrument?.instrument_id || '',
      instrumentSettings,
      project,
      availableInstruments
    );
    if (!chartResult) return null;

    return (
      <Plot
        key={`${axis}-plot-${project?.name || 'default'}`}
        data={chartResult.data}
        layout={chartResult.layout}
        config={chartResult.config}
        style={{ width: '100%', height: 550 }}
        useResizeHandler={true}
      />
    );
  };

  const createCombinedPlot = (combined: { time: Date[]; x: number[]; y: number[]; z: number[] }) => {
    const chartResult = createSeismographCombinedChartData(
      combined,
      instrumentId || selectedInstrument?.instrument_id || '',
      instrumentSettings,
      project,
      availableInstruments
    );
    if (!chartResult) return null;

    return (
      <Plot
        key={`combined-plot-${project?.name || 'default'}`}
        data={chartResult.data}
        layout={chartResult.layout}
        config={chartResult.config}
        style={{ width: '100%', height: 550 }}
        useResizeHandler={true}
      />
    );
  };

  const displayInstrumentId = getDisplayInstrumentId(selectedInstrument, instrumentId || 'Instrument');

  return (
    <>
      <HeaNavLogo />
      <MainContentWrapper>
        <BackButton />  
        <Box p={3}>
          <Typography variant="h4" align="center" sx={{ mb: 3, mt: 2 }}>
            {project && selectedInstrument ? `${project.name} - Seismograph Data Graphs (${displayInstrumentId})` : 'Seismograph Data Graphs'}
          </Typography>
          
          {project && availableInstruments.length > 0 && (
            <Box mb={3} display="flex" justifyContent="center" alignItems="center" gap={3}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#003087' }}>
                Location: {selectedInstrument?.instrument_location || 'None'}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 200, maxWidth: 300 }}>
                <InputLabel id="instrument-select-label">Select Instrument</InputLabel>
                <Select
                  labelId="instrument-select-label"
                  value={selectedInstrument?.instrument_id || ''}
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
          
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Stack direction="row" spacing={2} sx={{ mb: 4 }} alignItems="center" flexWrap="wrap">
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
                disabled={loading || isInactive || checkingActiveStatus || !fromDate || !toDate || !syscomDeviceId}
                sx={{ height: 40 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Load Data'}
              </Button>
              {isInactive && (
                <Alert severity="warning" sx={{ flex: '1 1 100%' }}>
                  This instrument is inactive. Data loading and alerts are paused. Set status to Active in the instruments list to resume.
                </Alert>
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
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">X Axis Vibration Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const chartData = createSeismographChartData(
                            processedData.x,
                            'X',
                            '#FF6384',
                            instrumentId || selectedInstrument?.instrument_id || '',
                            instrumentSettings,
                            project,
                            availableInstruments
                          );
                          if (chartData) {
                            openChartInWindow(
                              'X Axis Vibration Data',
                              chartData.data,
                              chartData.layout,
                              chartData.config,
                              selectedInstrument?.instrument_location
                            );
                          }
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.x, 'X', '#FF6384')}
                </Box>
              )}
              {processedData.y.values.length > 0 && (
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Y Axis Vibration Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const chartData = createSeismographChartData(
                            processedData.y,
                            'Y',
                            '#36A2EB',
                            instrumentId || selectedInstrument?.instrument_id || '',
                            instrumentSettings,
                            project,
                            availableInstruments
                          );
                          if (chartData) {
                            openChartInWindow(
                              'Y Axis Vibration Data',
                              chartData.data,
                              chartData.layout,
                              chartData.config,
                              selectedInstrument?.instrument_location
                            );
                          }
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.y, 'Y', '#36A2EB')}
                </Box>
              )}
              {processedData.z.values.length > 0 && (
                <Box mb={10} width="100%">
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Z Axis Vibration Data</Typography>
                    <Tooltip title="Open in Popup">
                      <Button
                        startIcon={<OpenInNew />}
                        onClick={() => {
                          const chartData = createSeismographChartData(
                            processedData.z,
                            'Z',
                            '#FFCE56',
                            instrumentId || selectedInstrument?.instrument_id || '',
                            instrumentSettings,
                            project,
                            availableInstruments
                          );
                          if (chartData) {
                            openChartInWindow(
                              'Z Axis Vibration Data',
                              chartData.data,
                              chartData.layout,
                              chartData.config,
                              selectedInstrument?.instrument_location
                            );
                          }
                        }}
                        variant="outlined"
                        size="small"
                      >
                        Open in Popup
                      </Button>
                    </Tooltip>
                  </Box>
                  {createSinglePlot(processedData.z, 'Z', '#FFCE56')}
                </Box>
              )}
              <Box mb={4} width="100%">
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">Combined Vibration Data</Typography>
                  <Tooltip title="Open in Popup">
                    <Button
                      startIcon={<OpenInNew />}
                      onClick={() => {
                        const chartData = createSeismographCombinedChartData(
                          processedData.combined,
                          instrumentId || selectedInstrument?.instrument_id || '',
                          instrumentSettings,
                          project,
                          availableInstruments
                        );
                        if (chartData) {
                          openChartInWindow(
                            'Combined Vibration Data',
                            chartData.data,
                            chartData.layout,
                            chartData.config,
                            selectedInstrument?.instrument_location
                          );
                        }
                      }}
                      variant="outlined"
                      size="small"
                    >
                      Open in Popup
                    </Button>
                  </Tooltip>
                </Box>
                {createCombinedPlot(processedData.combined)}
              </Box>
            </>
          )}

          {!loading && rawData.length === 0 && !error && (
            <Typography variant="body1" color="textSecondary">
              Enter Syscom Device ID, select a date range and click "Load Data" to view vibration data.
            </Typography>
          )}

          {instrumentSettings && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="h6" gutterBottom>
                {project && selectedInstrument ? `${project.name} - Seismograph Reference Levels (${displayInstrumentId})` : 'Seismograph Reference Levels'}
              </Typography>
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

export default DynamicSeismograph;
