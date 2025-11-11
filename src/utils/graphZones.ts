/**
 * Utility functions for creating colored risk zones in graphs
 * Based on the reference image showing Alert Zone (yellow), Warning Zone (light yellow), and Shutdown Zone (red)
 */

export interface ZoneThresholds {
  warning?: number;
  alert?: number;
  shutdown?: number;
}

export interface ZoneConfig {
  warningColor?: string;
  alertColor?: string;
  shutdownColor?: string;
  warningOpacity?: number;
  alertOpacity?: number;
  shutdownOpacity?: number;
}

export interface ZoneShapes {
  shapes: any[];
  annotations: any[];
}

/**
 * Creates colored background zones for different risk levels
 * @param thresholds - The threshold values for warning, alert, and shutdown zones
 * @param config - Optional configuration for colors and opacity
 * @returns Object containing shapes and annotations for Plotly
 */
export function createRiskZones(
  thresholds: ZoneThresholds,
  config: ZoneConfig = {}
): ZoneShapes {
  const shapes: any[] = [];
  const annotations: any[] = [];

  // Default colors and opacity based on reference image
  const defaultConfig: Required<ZoneConfig> = {
    warningColor: '#ffe066', // Light yellow
    alertColor: '#ffcc00',   // Yellow/orange
    shutdownColor: '#ff6b6b', // Light red
    warningOpacity: 0.3,
    alertOpacity: 0.4,
    shutdownOpacity: 0.5,
    ...config
  };

  const { warning, alert, shutdown } = thresholds;
  const { warningColor, alertColor, shutdownColor, warningOpacity, alertOpacity, shutdownOpacity } = defaultConfig;

  // Create zones from highest to lowest priority (shutdown -> alert -> warning)
  // This ensures proper layering with shutdown zones on top

  // Warning Zone (lightest, lowest priority)
  if (warning) {
    // Upper warning zone
    shapes.push({
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      y0: warning,
      x1: 1,
      y1: 10, // Use a large positive number
      fillcolor: warningColor,
      opacity: warningOpacity,
      layer: 'below',
      line: { width: 0 }
    });

    // Lower warning zone
    shapes.push({
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      y0: -warning,
      x1: 1,
      y1: -10, // Use a large negative number
      fillcolor: warningColor,
      opacity: warningOpacity,
      layer: 'below',
      line: { width: 0 }
    });

    // Warning zone labels
    annotations.push(
      {
        x: 0.02,
        xref: 'paper',
        y: warning * 1.1,
        yref: 'y',
        text: 'Warning Zone',
        showarrow: false,
        font: { color: '#333', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: warningColor,
        borderwidth: 1,
        xanchor: 'left',
        yanchor: 'bottom'
      },
      {
        x: 0.02,
        xref: 'paper',
        y: -warning * 1.1,
        yref: 'y',
        text: 'Warning Zone',
        showarrow: false,
        font: { color: '#333', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: warningColor,
        borderwidth: 1,
        xanchor: 'left',
        yanchor: 'top'
      }
    );
  }

  // Alert Zone (medium priority)
  if (alert) {
    // Upper alert zone
    shapes.push({
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      y0: alert,
      x1: 1,
      y1: 10, // Use a large positive number
      fillcolor: alertColor,
      opacity: alertOpacity,
      layer: 'below',
      line: { width: 0 }
    });

    // Lower alert zone
    shapes.push({
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      y0: -alert,
      x1: 1,
      y1: -10, // Use a large negative number
      fillcolor: alertColor,
      opacity: alertOpacity,
      layer: 'below',
      line: { width: 0 }
    });

    // Alert zone labels
    annotations.push(
      {
        x: 0.02,
        xref: 'paper',
        y: alert * 1.1,
        yref: 'y',
        text: 'Alert Zone',
        showarrow: false,
        font: { color: '#333', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: alertColor,
        borderwidth: 1,
        xanchor: 'left',
        yanchor: 'bottom'
      },
      {
        x: 0.02,
        xref: 'paper',
        y: -alert * 1.1,
        yref: 'y',
        text: 'Alert Zone',
        showarrow: false,
        font: { color: '#333', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.8)',
        bordercolor: alertColor,
        borderwidth: 1,
        xanchor: 'left',
        yanchor: 'top'
      }
    );
  }

  // Shutdown Zone (highest priority)
  if (shutdown) {
    // Upper shutdown zone
    shapes.push({
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      y0: shutdown,
      x1: 1,
      y1: 10, // Use a large positive number
      fillcolor: shutdownColor,
      opacity: shutdownOpacity,
      layer: 'below',
      line: { width: 0 }
    });

    // Lower shutdown zone
    shapes.push({
      type: 'rect',
      xref: 'paper',
      yref: 'y',
      x0: 0,
      y0: -shutdown,
      x1: 1,
      y1: -10, // Use a large negative number
      fillcolor: shutdownColor,
      opacity: shutdownOpacity,
      layer: 'below',
      line: { width: 0 }
    });

    // Shutdown zone labels
    annotations.push(
      {
        x: 0.02,
        xref: 'paper',
        y: shutdown * 1.1,
        yref: 'y',
        text: 'Shutdown Zone',
        showarrow: false,
        font: { color: '#fff', size: 12, weight: 'bold' },
        bgcolor: 'rgba(0,0,0,0.7)',
        bordercolor: shutdownColor,
        borderwidth: 1,
        xanchor: 'left',
        yanchor: 'bottom'
      },
      {
        x: 0.02,
        xref: 'paper',
        y: -shutdown * 1.1,
        yref: 'y',
        text: 'Shutdown Zone',
        showarrow: false,
        font: { color: '#fff', size: 12, weight: 'bold' },
        bgcolor: 'rgba(0,0,0,0.7)',
        bordercolor: shutdownColor,
        borderwidth: 1,
        xanchor: 'left',
        yanchor: 'top'
      }
    );
  }

  return { shapes, annotations };
}

/**
 * Creates threshold lines for the zones (dashed lines at threshold values)
 * @param thresholds - The threshold values
 * @returns Array of line shapes for Plotly
 */
export function createThresholdLines(thresholds: ZoneThresholds): any[] {
  const lines: any[] = [];
  const { warning, alert, shutdown } = thresholds;

  // Warning lines (light dashed)
  if (warning) {
    lines.push(
      {
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        y0: warning,
        x1: 1,
        y1: warning,
        line: { color: '#ffcc00', width: 2, dash: 'dash' }
      },
      {
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        y0: -warning,
        x1: 1,
        y1: -warning,
        line: { color: '#ffcc00', width: 2, dash: 'dash' }
      }
    );
  }

  // Alert lines (orange dashed)
  if (alert) {
    lines.push(
      {
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        y0: alert,
        x1: 1,
        y1: alert,
        line: { color: '#ff8c00', width: 2, dash: 'dash' }
      },
      {
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        y0: -alert,
        x1: 1,
        y1: -alert,
        line: { color: '#ff8c00', width: 2, dash: 'dash' }
      }
    );
  }

  // Shutdown lines (red solid)
  if (shutdown) {
    lines.push(
      {
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        y0: shutdown,
        x1: 1,
        y1: shutdown,
        line: { color: '#ff0000', width: 3, dash: 'solid' }
      },
      {
        type: 'line',
        xref: 'paper',
        yref: 'y',
        x0: 0,
        y0: -shutdown,
        x1: 1,
        y1: -shutdown,
        line: { color: '#ff0000', width: 3, dash: 'solid' }
      }
    );
  }

  return lines;
}

/**
 * Creates both colored zones and threshold lines
 * @param thresholds - The threshold values
 * @param config - Optional configuration for colors and opacity
 * @returns Object containing shapes and annotations for Plotly
 */
export function createCompleteRiskZones(
  thresholds: ZoneThresholds,
  config: ZoneConfig = {}
): ZoneShapes {
  const zones = createRiskZones(thresholds, config);
  const lines = createThresholdLines(thresholds);

  return {
    shapes: [...zones.shapes, ...lines],
    annotations: zones.annotations
  };
}

/**
 * Creates only threshold lines without background zones but with labels
 * @param thresholds - The threshold values
 * @returns Object containing line shapes and annotations for Plotly
 */
export function createReferenceLinesOnly(thresholds: ZoneThresholds): ZoneShapes {
  const lines = createThresholdLines(thresholds);
  const annotations: any[] = [];
  
  const { warning, alert, shutdown } = thresholds;
  
  // Add labels for each threshold line
  if (warning) {
    annotations.push(
      {
        x: 0.02,
        xref: 'paper',
        y: warning,
        yref: 'y',
        text: `Warning: ±${warning}`,
        showarrow: false,
        font: { color: '#ffcc00', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.9)',
        xanchor: 'left',
        yanchor: 'bottom'
      },
      {
        x: 0.02,
        xref: 'paper',
        y: -warning,
        yref: 'y',
        text: `Warning: ±${warning}`,
        showarrow: false,
        font: { color: '#ffcc00', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.9)',
        xanchor: 'left',
        yanchor: 'top'
      }
    );
  }
  
  if (alert) {
    annotations.push(
      {
        x: 0.02,
        xref: 'paper',
        y: alert,
        yref: 'y',
        text: `Alert: ±${alert}`,
        showarrow: false,
        font: { color: '#ff8c00', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.9)',
        xanchor: 'left',
        yanchor: 'bottom'
      },
      {
        x: 0.02,
        xref: 'paper',
        y: -alert,
        yref: 'y',
        text: `Alert: ±${alert}`,
        showarrow: false,
        font: { color: '#ff8c00', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.9)',
        xanchor: 'left',
        yanchor: 'top'
      }
    );
  }
  
  if (shutdown) {
    annotations.push(
      {
        x: 0.02,
        xref: 'paper',
        y: shutdown,
        yref: 'y',
        text: `Shutdown: ±${shutdown}`,
        showarrow: false,
        font: { color: '#ff0000', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.9)',
        xanchor: 'left',
        yanchor: 'bottom'
      },
      {
        x: 0.02,
        xref: 'paper',
        y: -shutdown,
        yref: 'y',
        text: `Shutdown: ±${shutdown}`,
        showarrow: false,
        font: { color: '#ff0000', size: 12, weight: 'bold' },
        bgcolor: 'rgba(255,255,255,0.9)',
        xanchor: 'left',
        yanchor: 'top'
      }
    );
  }
  
  return {
    shapes: lines,
    annotations: annotations
  };
}

/**
 * Helper function to get thresholds from instrument settings
 * @param instrumentSettings - The instrument settings object
 * @param axis - Optional axis ('x', 'y', 'z') for tiltmeters
 * @returns ZoneThresholds object
 */
export function getThresholdsFromSettings(
  instrumentSettings: any,
  axis?: 'x' | 'y' | 'z'
): ZoneThresholds {
  if (!instrumentSettings) return {};

  // For tiltmeters with XYZ-specific values
  if (axis && instrumentSettings[`x_y_z_warning_values`]?.[axis] !== undefined) {
    return {
      warning: instrumentSettings[`x_y_z_warning_values`]?.[axis],
      alert: instrumentSettings[`x_y_z_alert_values`]?.[axis],
      shutdown: instrumentSettings[`x_y_z_shutdown_values`]?.[axis]
    };
  }

  // For seismographs with general values
  return {
    warning: instrumentSettings.warning_value,
    alert: instrumentSettings.alert_value,
    shutdown: instrumentSettings.shutdown_value
  };
}

/**
 * Creates a horizontal reference line at y=0.0
 * @returns Shape object for Plotly zero reference line
 */
export function createZeroReferenceLine(): any {
  return {
    type: 'line',
    xref: 'paper',
    yref: 'y',
    x0: 0,
    y0: 0,
    x1: 1,
    y1: 0,
    line: { color: '#808080', width: 0.5 }
  };
}