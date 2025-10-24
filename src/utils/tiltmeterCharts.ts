import { getThresholdsFromSettings } from '../utils/graphZones';

interface ChartData {
  data: any[];
  layout: any;
  config: any;
}

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
  x_y_z_alert_values?: { x: number; y: number; z: number } | null;
  x_y_z_warning_values?: { x: number; y: number; z: number } | null;
  x_y_z_shutdown_values?: { x: number; y: number; z: number } | null;
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

export const createTiltmeterChartData = (
  sensorData: SensorData[],
  axis: 'x' | 'y' | 'z',
  nodeId: string,
  instrumentSettings: InstrumentSettings | null,
  project: Project | null,
  _availableInstruments: Instrument[]
): ChartData | null => {
  if (!sensorData.length) return null;

  const values = sensorData.map(d => {
    switch (axis) {
      case 'x': return d.x_value;
      case 'y': return d.y_value;
      case 'z': return d.z_value;
      default: return 0;
    }
  });

  const timestamps = sensorData.map(d => new Date(d.timestamp));

  const chartData = [
    {
      x: timestamps,
      y: values,
      type: 'scatter',
      mode: 'lines+markers',
      name: `${axis.toUpperCase()}-Axis Tilt`,
      line: {
        color: axis === 'x' ? '#FF6384' : axis === 'y' ? '#36A2EB' : '#FFCE56',
        width: 2
      },
      marker: {
        size: 4,
        color: axis === 'x' ? '#FF6384' : axis === 'y' ? '#36A2EB' : '#FFCE56'
      },
      hovertemplate: `
        <b>${axis.toUpperCase()}-Axis</b><br>
        Time: %{x|%Y-%m-%d %H:%M:%S}<br>
        Value: %{y:.6f}°<extra></extra>
      `,
      connectgaps: false
    }
  ];

  const plotlyLayout = {
    title: { 
      text: `${axis.toUpperCase()}-Axis Tilt - Node ${nodeId}`, 
      font: { size: 20, weight: 700, color: '#1f2937' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { 
        text: 'Time', 
        font: { size: 16, weight: 700, color: '#374151' },
        standoff: 20
      },
      type: 'date',
      tickformat: '%m/%d %H:%M',
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 12, color: '#374151', weight: 600 },
      tickangle: 0
    },
    yaxis: {
      title: { 
        text: `${axis.toUpperCase()}-Axis Value (°)`, 
        standoff: 15,
        font: { size: 16, weight: 700, color: '#374151' }
      },
      fixedrange: false,
      gridcolor: '#f0f0f0',
      zeroline: true,
      zerolinecolor: '#f0f0f0',
      tickfont: { size: 12, color: '#374151', weight: 600 },
      range: (() => {
        const range = getYAxisRange(values, getThresholdsFromSettings(instrumentSettings, axis));
        return [range.min, range.max];
      })()
    },
    showlegend: true,
    legend: {
      x: 0.02,
      xanchor: 'left',
      y: -0.15,
      yanchor: 'top',
      orientation: 'h',
      font: { size: 12, weight: 600 },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#CCC',
      borderwidth: 1
    },
    height: 550,
    margin: { t: 60, b: 80, l: 80, r: 40 },
    hovermode: 'closest',
    plot_bgcolor: 'white',
    paper_bgcolor: 'white'
  };

  const chartLayout = {
    ...plotlyLayout,
    ...getReferenceShapesAndAnnotations(axis)
  };

  const chartConfig = {
    responsive: true,
    displayModeBar: true,
    scrollZoom: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `${project?.name || 'Project'}_${axis.toUpperCase()}_Tilt_${new Date().toISOString().split('T')[0]}`,
      height: 600,
      width: 1200,
      scale: 2
    }
  };

  return { data: chartData, layout: chartLayout, config: chartConfig };
};

export const createTiltmeterCombinedChartData = (
  sensorData: SensorData[],
  _instrumentId: string,
  nodeId: string,
  instrumentSettings: InstrumentSettings | null,
  project: Project | null,
  _availableInstruments: Instrument[]
): ChartData | null => {
  if (!sensorData.length) return null;

  const timestamps = sensorData.map(d => new Date(d.timestamp));
  const xValues = sensorData.map(d => d.x_value);
  const yValues = sensorData.map(d => d.y_value);
  const zValues = sensorData.map(d => d.z_value);

  const chartData = [
    {
      x: timestamps,
      y: xValues,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'X-Axis Tilt',
      line: { color: '#FF6384', width: 1.5 },
      marker: { size: 3, color: '#FF6384' },
      hovertemplate: '<b>X-Axis</b><br>Time: %{x|%Y-%m-%d %H:%M:%S}<br>Value: %{y:.6f}°<extra></extra>',
      connectgaps: false
    },
    {
      x: timestamps,
      y: yValues,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Y-Axis Tilt',
      line: { color: '#36A2EB', width: 1.5 },
      marker: { size: 3, color: '#36A2EB' },
      hovertemplate: '<b>Y-Axis</b><br>Time: %{x|%Y-%m-%d %H:%M:%S}<br>Value: %{y:.6f}°<extra></extra>',
      connectgaps: false
    },
    {
      x: timestamps,
      y: zValues,
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Z-Axis Tilt',
      line: { color: '#FFCE56', width: 1.5 },
      marker: { size: 3, color: '#FFCE56' },
      hovertemplate: '<b>Z-Axis</b><br>Time: %{x|%Y-%m-%d %H:%M:%S}<br>Value: %{y:.6f}°<extra></extra>',
      connectgaps: false
    }
  ];

  const plotlyLayout = {
    title: { 
      text: `Combined Tilt Data - Node ${nodeId}`, 
      font: { size: 20, weight: 700, color: '#1f2937' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { 
        text: 'Time', 
        font: { size: 16, weight: 700, color: '#374151' },
        standoff: 20
      },
      type: 'date',
      tickformat: '%m/%d %H:%M',
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 12, color: '#374151', weight: 600 },
      tickangle: 0
    },
    yaxis: {
      title: { 
        text: 'Axis Values (°)', 
        standoff: 15,
        font: { size: 16, weight: 700, color: '#374151' }
      },
      fixedrange: false,
      gridcolor: '#f0f0f0',
      zeroline: true,
      zerolinecolor: '#f0f0f0',
      tickfont: { size: 12, color: '#374151', weight: 600 },
      range: (() => {
        const allValues = [...xValues, ...yValues, ...zValues];
        const range = getYAxisRange(allValues, getThresholdsFromSettings(instrumentSettings));
        return [range.min, range.max];
      })()
    },
    showlegend: true,
    legend: {
      x: 0.02,
      xanchor: 'left',
      y: -0.15,
      yanchor: 'top',
      orientation: 'h',
      font: { size: 12, weight: 600 },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#CCC',
      borderwidth: 1
    },
    height: 600,
    margin: { t: 60, b: 100, l: 80, r: 40 },
    hovermode: 'closest',
    plot_bgcolor: 'white',
    paper_bgcolor: 'white'
  };

  const chartLayout = {
    ...plotlyLayout,
    ...getReferenceShapesAndAnnotations('y')
  };

  const chartConfig = {
    responsive: true,
    displayModeBar: true,
    scrollZoom: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `${project?.name || 'Project'}_Combined_Tilt_${new Date().toISOString().split('T')[0]}`,
      height: 600,
      width: 1200,
      scale: 2
    }
  };

  return { data: chartData, layout: chartLayout, config: chartConfig };
};

// Helper function for Y-axis range calculation
const getYAxisRange = (values: number[], thresholds: any) => {
  if (!values.length) return { min: -0.1, max: 0.1 };
  
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const padding = Math.max(Math.abs(minValue), Math.abs(maxValue)) * 0.1;
  
  const thresholdMax = Math.max(
    thresholds?.alert_value || 0,
    thresholds?.warning_value || 0,
    thresholds?.shutdown_value || 0
  );
  
  return {
    min: Math.min(minValue - padding, -thresholdMax * 1.2),
    max: Math.max(maxValue + padding, thresholdMax * 1.2)
  };
};

// Helper function for reference shapes and annotations
const getReferenceShapesAndAnnotations = (_axis: string) => {
  // This would need to be implemented based on the specific tiltmeter requirements
  // For now, returning empty objects
  return { shapes: [], annotations: [] };
};
