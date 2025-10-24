import React, { useState, useEffect } from 'react';
import {  Box, IconButton, Typography, Paper } from '@mui/material';
import { Fullscreen } from '@mui/icons-material';

interface ChartWindowProps {
  data: any[];
  layout: any;
  config?: any;
  title: string;
  projectName?: string;
  location?: string;
  nodeId?: string;
}


const ChartWindow: React.FC<ChartWindowProps> = ({
  data,
  layout,
  config = { responsive: true, displayModeBar: true, scrollZoom: true, displaylogo: false },
  title,
  projectName,
  location,
  nodeId
}) => {

  const [windowRef, setWindowRef] = useState<Window | null>(null);

  const generateWindowTitle = () => {
    let windowTitle = title;
    if (projectName) windowTitle = `${projectName} - ${windowTitle}`;
    if (nodeId) windowTitle += ` - Node ${nodeId}`;
    if (location) windowTitle += ` - ${location}`;
    return windowTitle;
  };

  const openChartWindow = () => {
    const windowTitle = generateWindowTitle();
    const windowFeatures = 'width=800,height=600,scrollbars=yes,resizable=yes,toolbar=no,menubar=no,location=no,status=no';
    
    const newWindow = window.open('', '_blank', windowFeatures);
    if (!newWindow) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }

    // Set window title
    newWindow.document.title = windowTitle;

    // Create HTML content for the window
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${windowTitle}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              background-color: #f5f5f5;
            }
            .chart-container {
              background: white;
              border-radius: 8px;
              box-shadow: 0 4px 12px rgba(0,0,0,0.1);
              padding: 20px;
              height: calc(100vh - 40px);
              display: flex;
              flex-direction: column;
            }
            .chart-header {
              margin-bottom: 20px;
              padding-bottom: 15px;
              border-bottom: 1px solid #e0e0e0;
            }
            .chart-title {
              font-size: 24px;
              font-weight: 700;
              color: #1f2937;
              margin: 0;
            }
            .chart-subtitle {
              font-size: 14px;
              color: #6b7280;
              margin-top: 5px;
            }
            .chart-content {
              flex: 1;
              min-height: 0;
            }
            .plotly-graph-div {
              width: 100% !important;
              height: 100% !important;
            }
            .window-controls {
              position: fixed;
              top: 10px;
              right: 10px;
              z-index: 1000;
              display: flex;
              gap: 5px;
            }
            .control-btn {
              background: rgba(255, 255, 255, 0.9);
              border: 1px solid #d1d5db;
              border-radius: 4px;
              padding: 8px;
              cursor: pointer;
              font-size: 14px;
              color: #374151;
              transition: all 0.2s;
            }
            .control-btn:hover {
              background: #f3f4f6;
              border-color: #9ca3af;
            }
            .control-btn:active {
              background: #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="window-controls">
            <button class="control-btn" onclick="window.print()" title="Print">🖨️</button>
            <button class="control-btn" onclick="toggleFullscreen()" title="Toggle Fullscreen">⛶</button>
            <button class="control-btn" onclick="window.close()" title="Close">✕</button>
          </div>
          <div class="chart-container">
            <div class="chart-header">
              <h1 class="chart-title">${title}</h1>
              <div class="chart-subtitle">
                ${projectName ? `${projectName} • ` : ''}${nodeId ? `Node ${nodeId} • ` : ''}${location || ''}
              </div>
            </div>
            <div class="chart-content">
              <div id="plotly-chart"></div>
            </div>
          </div>
          
          <script>
            // Chart data and layout
            const chartData = ${JSON.stringify(data)};
            const chartLayout = ${JSON.stringify(layout)};
            const chartConfig = ${JSON.stringify(config)};
            
            // Create the plot
            Plotly.newPlot('plotly-chart', chartData, chartLayout, chartConfig);
            
            // Handle window resize
            window.addEventListener('resize', function() {
              Plotly.Plots.resize('plotly-chart');
            });
            
            // Fullscreen functionality
            function toggleFullscreen() {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
              } else {
                document.exitFullscreen();
              }
            }
            
            // Handle fullscreen changes
            document.addEventListener('fullscreenchange', function() {
              setTimeout(() => {
                Plotly.Plots.resize('plotly-chart');
              }, 100);
            });
            
            // Auto-resize on load
            window.addEventListener('load', function() {
              setTimeout(() => {
                Plotly.Plots.resize('plotly-chart');
              }, 100);
            });
          </script>
        </body>
      </html>
    `;

    newWindow.document.write(htmlContent);
    newWindow.document.close();
    
    setWindowRef(newWindow);
  };


  // Clean up window reference when component unmounts
  useEffect(() => {
    return () => {
      if (windowRef && !windowRef.closed) {
        windowRef.close();
      }
    };
  }, [windowRef]);

  return (
    <Box sx={{ position: 'relative' }}>
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          mb: 2, 
          position: 'relative',
          minWidth: 200,
          minHeight: 100,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          border: '2px dashed #dee2e6',
          '&:hover': {
            backgroundColor: '#e9ecef',
            borderColor: '#adb5bd'
          }
        }}
      >
        <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', fontWeight: 'bold', color: '#495057' }}>
          {title}
        </Typography>
        
        <IconButton
          size="large"
          onClick={openChartWindow}
          sx={{
            backgroundColor: '#007bff',
            color: 'white',
            '&:hover': {
              backgroundColor: '#0056b3',
            },
            fontSize: '1.2rem',
            padding: 2,
            borderRadius: 2
          }}
          title="Open in separate window"
        >
          <Fullscreen fontSize="large" />
        </IconButton>
        
        <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: '#6c757d' }}>
          Click to open chart
        </Typography>
      </Paper>
    </Box>
  );
};

export default ChartWindow;
