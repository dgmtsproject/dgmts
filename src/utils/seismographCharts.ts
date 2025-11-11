import { createReferenceLinesOnly, getThresholdsFromSettings, createZeroReferenceLine } from '../utils/graphZones';

interface ChartData {
  data: any[];
  layout: any;
  config: any;
}

interface ProcessedData {
  time: Date[];
  values: number[];
}

interface CombinedData {
  time: Date[];
  x: number[];
  y: number[];
  z: number[];
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

export const createSeismographChartData = (
  data: ProcessedData,
  axis: string,
  color: string,
  instrumentId: string,
  instrumentSettings: InstrumentSettings | null,
  project: Project | null,
  availableInstruments: Instrument[]
): ChartData | null => {
  // Filter out any pairs where time or value is missing or invalid
  const filtered = data.time
    .map((t, i) => ({ t, v: data.values[i] }))
    .filter(pair => pair.t && typeof pair.v === 'number' && !isNaN(pair.v));

  if (filtered.length === 0) return null;

  // Create shapes and annotations for reference lines using the new utility
  const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };

  const chartData = [
    {
      x: filtered.map(pair => pair.t),
      y: filtered.map(pair => pair.v),
      type: 'scatter',
      mode: 'lines',
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
        Value: %{y:.3~f}<extra></extra>
      `,
      connectgaps: true
    },
      // Add reference line traces for legend
      ...(instrumentSettings?.alert_value ? [{
        x: [filtered[0]?.t, filtered[filtered.length - 1]?.t],
        y: [instrumentSettings.alert_value, instrumentSettings.alert_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Alert (${instrumentSettings.alert_value} in/s)`,
        line: { color: 'orange', width: 2, dash: 'dash' as const },
        showlegend: true,
        legendgroup: 'reference-lines'
      }, {
        x: [filtered[0]?.t, filtered[filtered.length - 1]?.t],
        y: [-instrumentSettings.alert_value, -instrumentSettings.alert_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Alert (-${instrumentSettings.alert_value} in/s)`,
        line: { color: 'orange', width: 2, dash: 'dash' as const },
        showlegend: false,
        legendgroup: 'reference-lines'
      }] : []),
      ...(instrumentSettings?.warning_value ? [{
        x: [filtered[0]?.t, filtered[filtered.length - 1]?.t],
        y: [instrumentSettings.warning_value, instrumentSettings.warning_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Warning (${instrumentSettings.warning_value} in/s)`,
        line: { color: 'red', width: 2, dash: 'dash' as const },
        showlegend: true,
        legendgroup: 'reference-lines'
      }, {
        x: [filtered[0]?.t, filtered[filtered.length - 1]?.t],
        y: [-instrumentSettings.warning_value, -instrumentSettings.warning_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Warning (-${instrumentSettings.warning_value} in/s)`,
        line: { color: 'red', width: 2, dash: 'dash' as const },
        showlegend: false,
        legendgroup: 'reference-lines'
      }] : []),
      ...(instrumentSettings?.shutdown_value ? [{
        x: [filtered[0]?.t, filtered[filtered.length - 1]?.t],
        y: [instrumentSettings.shutdown_value, instrumentSettings.shutdown_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Shutdown (${instrumentSettings.shutdown_value} in/s)`,
        line: { color: 'darkred', width: 3, dash: 'solid' as const },
        showlegend: true,
        legendgroup: 'reference-lines'
      }, {
        x: [filtered[0]?.t, filtered[filtered.length - 1]?.t],
        y: [-instrumentSettings.shutdown_value, -instrumentSettings.shutdown_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Shutdown (-${instrumentSettings.shutdown_value} in/s)`,
        line: { color: 'darkred', width: 3, dash: 'solid' as const },
        showlegend: false,
        legendgroup: 'reference-lines'
      }] : [])
    ];

  const currentInstrument = availableInstruments.find(inst => inst.instrument_id === instrumentId);
  
  const chartLayout = {
    title: { 
      text: `${project?.name || 'Project'} - ${axis} Axis Vibration Data${currentInstrument?.instrument_location ? ` - ${currentInstrument.instrument_location}` : ''}`,
    font: { size: 20, weight: 700, color: '#003087', family: 'Arial, sans-serif' },
    x: 0.5,
    xanchor: 'center'
  },
    xaxis: {
      title: { 
        text: `Time<br><span style="font-size:12px;color:#666;">${instrumentId}</span>`, 
        font: { size: 18, weight: 700, color: '#374151', family: 'Arial, sans-serif' },
        standoff: 20
      },
      type: 'date',
      tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
      tickmode: 'auto',
      nticks: 16,
      dtick: undefined,
      tick0: undefined,
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 14, color: '#374151', weight: 700, family: 'Arial, sans-serif' },
      tickangle: 0,
      ticks: 'outside',
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
        text: 'Vibration (in/s)', 
        font: { size: 18, weight: 700, color: '#374151', family: 'Arial, sans-serif' },
        standoff: 25 
      },
      fixedrange: false,
      autorange: true,
      gridcolor: '#f0f0f0',
      zeroline: true,
      zerolinecolor: '#f0f0f0',
      tickfont: { size: 14, color: '#374151', weight: 700, family: 'Arial, sans-serif' },
      range: (() => {
        const allValues = filtered.map(pair => pair.v);
        const maxAbsValue = Math.max(...allValues.map(v => Math.abs(v)));
        const thresholdMax = Math.max(
          instrumentSettings?.alert_value || 0,
          instrumentSettings?.warning_value || 0,
          instrumentSettings?.shutdown_value || 0
        );
        const rangeMax = Math.max(maxAbsValue, thresholdMax) * 1.2;
        return [-rangeMax, rangeMax];
      })()
    },
    showlegend: true,
    legend: {
      x: 0.5,
      xanchor: 'center',
      y: -0.40,
      yanchor: 'top',
      orientation: 'h',
      font: { size: 12, weight: 700, family: 'Arial, sans-serif' },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#CCC',
      borderwidth: 1,
      traceorder: 'normal'
    },
    height: 550,
    margin: { t: 60, b: 150, l: 80, r: 80 },
    hovermode: 'closest',
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    shapes: [createZeroReferenceLine(), ...zones.shapes],
    annotations: zones.annotations
  };

  const chartConfig = {
    responsive: true,
    displayModeBar: true,
    scrollZoom: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `${project?.name || 'Project'}_${axis}_${new Date().toISOString().split('T')[0]}`,
      height: 600,
      width: 1200,
      scale: 2
    }
  };

  return { data: chartData, layout: chartLayout, config: chartConfig };
};

export const createSeismographCombinedChartData = (
  combined: CombinedData,
  instrumentId: string,
  instrumentSettings: InstrumentSettings | null,
  project: Project | null,
  availableInstruments: Instrument[]
): ChartData | null => {
  if (!combined.time.length) return null;

  // Create shapes and annotations for reference lines using the new utility
  const zones = instrumentSettings ? createReferenceLinesOnly(getThresholdsFromSettings(instrumentSettings)) : { shapes: [], annotations: [] };

  const chartData = [
    {
      x: combined.time,
      y: combined.x,
      type: 'scatter',
      mode: 'lines',
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
        Value: %{y:.3~f}<extra></extra>
      `,
      connectgaps: true
    },
    {
      x: combined.time,
      y: combined.y,
      type: 'scatter',
      mode: 'lines',
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
        Value: %{y:.3~f}<extra></extra>
      `,
      connectgaps: true
    },
    {
      x: combined.time,
      y: combined.z,
      type: 'scatter',
      mode: 'lines',
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
        Value: %{y:.3~f}<extra></extra>
      `,
      connectgaps: true
    },
      // Add reference line traces for legend
      ...(instrumentSettings?.alert_value ? [{
        x: [combined.time[0], combined.time[combined.time.length - 1]],
        y: [instrumentSettings.alert_value, instrumentSettings.alert_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Alert (${instrumentSettings.alert_value} in/s)`,
        line: { color: 'orange', width: 2, dash: 'dash' as const },
        showlegend: true,
        legendgroup: 'reference-lines'
      }, {
        x: [combined.time[0], combined.time[combined.time.length - 1]],
        y: [-instrumentSettings.alert_value, -instrumentSettings.alert_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Alert (-${instrumentSettings.alert_value} in/s)`,
        line: { color: 'orange', width: 2, dash: 'dash' as const },
        showlegend: false,
        legendgroup: 'reference-lines'
      }] : []),
      ...(instrumentSettings?.warning_value ? [{
        x: [combined.time[0], combined.time[combined.time.length - 1]],
        y: [instrumentSettings.warning_value, instrumentSettings.warning_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Warning (${instrumentSettings.warning_value} in/s)`,
        line: { color: 'red', width: 2, dash: 'dash' as const },
        showlegend: true,
        legendgroup: 'reference-lines'
      }, {
        x: [combined.time[0], combined.time[combined.time.length - 1]],
        y: [-instrumentSettings.warning_value, -instrumentSettings.warning_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Warning (-${instrumentSettings.warning_value} in/s)`,
        line: { color: 'red', width: 2, dash: 'dash' as const },
        showlegend: false,
        legendgroup: 'reference-lines'
      }] : []),
      ...(instrumentSettings?.shutdown_value ? [{
        x: [combined.time[0], combined.time[combined.time.length - 1]],
        y: [instrumentSettings.shutdown_value, instrumentSettings.shutdown_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Shutdown (${instrumentSettings.shutdown_value} in/s)`,
        line: { color: 'darkred', width: 3, dash: 'solid' as const },
        showlegend: true,
        legendgroup: 'reference-lines'
      }, {
        x: [combined.time[0], combined.time[combined.time.length - 1]],
        y: [-instrumentSettings.shutdown_value, -instrumentSettings.shutdown_value],
        type: 'scatter' as const,
        mode: 'lines' as const,
        name: `Shutdown (-${instrumentSettings.shutdown_value} in/s)`,
        line: { color: 'darkred', width: 3, dash: 'solid' as const },
        showlegend: false,
        legendgroup: 'reference-lines'
      }] : [])
  ];

  const currentInstrument = availableInstruments.find(inst => inst.instrument_id === instrumentId);
  
  const chartLayout = {
    title: { 
      text: `${project?.name || 'Project'} - Combined Vibration Data${currentInstrument?.instrument_location ? ` - ${currentInstrument.instrument_location}` : ''}`, 
      font: { size: 20, weight: 700, color: '#003087', family: 'Arial, sans-serif' },
      x: 0.5,
      xanchor: 'center'
    },
    xaxis: {
      title: { 
        text: `Time<br><span style="font-size:12px;color:#666;">${instrumentId}</span>`, 
        font: { size: 18, weight: 700, color: '#374151', family: 'Arial, sans-serif' },
        standoff: 20
      },
      type: 'date',
      tickformat: '<span style="font-size:10px;font-weight:700;">%m/%d</span><br><span style="font-size:8px;font-weight:700;">%H:%M</span>',
      tickmode: 'auto',
      nticks: 16,
      dtick: undefined,
      tick0: undefined,
      gridcolor: '#f0f0f0',
      showgrid: true,
      tickfont: { size: 14, color: '#374151', weight: 700, family: 'Arial, sans-serif' },
      tickangle: 0,
      ticks: 'outside',
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
        text: 'Vibration (in/s)', 
        font: { size: 18, weight: 700, color: '#374151', family: 'Arial, sans-serif' },
        standoff: 25 
      },
      fixedrange: false,
      autorange: true,
      gridcolor: '#f0f0f0',
      zeroline: true,
      zerolinecolor: '#f0f0f0',
      tickfont: { size: 14, color: '#374151', weight: 700, family: 'Arial, sans-serif' },
      range: (() => {
        const allValues = [...combined.x, ...combined.y, ...combined.z];
        const maxAbsValue = Math.max(...allValues.map(v => Math.abs(v)));
        const thresholdMax = Math.max(
          instrumentSettings?.alert_value || 0,
          instrumentSettings?.warning_value || 0,
          instrumentSettings?.shutdown_value || 0
        );
        const rangeMax = Math.max(maxAbsValue, thresholdMax) * 1.2;
        return [-rangeMax, rangeMax];
      })()
    },
    showlegend: true,
    legend: {
      x: 0.5,
      xanchor: 'center',
      y: -0.40,
      yanchor: 'top',
      orientation: 'h',
      font: { size: 12, weight: 700, family: 'Arial, sans-serif' },
      bgcolor: 'rgba(255,255,255,0.8)',
      bordercolor: '#CCC',
      borderwidth: 1,
      traceorder: 'normal'
    },
    height: 600,
    margin: { t: 60, b: 150, l: 80, r: 80 },
    hovermode: 'closest',
    plot_bgcolor: 'white',
    paper_bgcolor: 'white',
    shapes: [createZeroReferenceLine(), ...zones.shapes],
    annotations: zones.annotations
  };

  const chartConfig = {
    responsive: true,
    displayModeBar: true,
    scrollZoom: true,
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: `${project?.name || 'Project'}_Combined_${new Date().toISOString().split('T')[0]}`,
      height: 600,
      width: 1200,
      scale: 2
    }
  };

  return { data: chartData, layout: chartLayout, config: chartConfig };
};

// Helper function for Y-axis range calculation

