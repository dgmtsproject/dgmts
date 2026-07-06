/**
 * Display-only corrections for seismograph charts (does not change Syscom / DB data).
 * Used for report graphics when specific spikes should show adjusted values.
 *
 * Remove or disable entries here when no longer needed.
 */

type SyscomRow = [string, number | string, number | string, number | string];

interface DisplayAdjustment {
  /** instruments.instrument_id or Syscom device id */
  instrumentOrDeviceId: string;
  date: string; // YYYY-MM-DD
  axis: 'x' | 'y' | 'z';
  matchValue: number;
  matchTolerance: number;
  displayValue: number;
}

const DISPLAY_ADJUSTMENTS: DisplayAdjustment[] = [
  // Instrument 13453 — report request 2026-06
  {
    instrumentOrDeviceId: '13453',
    date: '2026-06-25',
    axis: 'x',
    matchValue: 0.991,
    matchTolerance: 0.08,
    displayValue: 0.54,
  },
  {
    instrumentOrDeviceId: '13453',
    date: '2026-06-24',
    axis: 'y',
    matchValue: 2.595,
    matchTolerance: 0.15,
    displayValue: 0.54,
  },
  {
    instrumentOrDeviceId: '13453',
    date: '2026-06-24',
    axis: 'z',
    matchValue: 1.5,
    matchTolerance: 0.15,
    displayValue: 0.54,
  },
];

const AXIS_INDEX: Record<'x' | 'y' | 'z', number> = { x: 1, y: 2, z: 3 };

function rowDate(timestamp: string): string {
  return timestamp.split('T')[0];
}

/**
 * Apply display-only value overrides to Syscom background rows `[time, x, y, z]`.
 */
export function applySeismographDisplayAdjustments(
  data: SyscomRow[] | null | undefined,
  instrumentOrDeviceId: string | undefined
): SyscomRow[] {
  if (!data?.length || !instrumentOrDeviceId) {
    return data ?? [];
  }

  const rules = DISPLAY_ADJUSTMENTS.filter(
    (rule) => rule.instrumentOrDeviceId === instrumentOrDeviceId
  );
  if (!rules.length) {
    return data;
  }

  return data.map((row) => {
    const timestamp = String(row[0]);
    const date = rowDate(timestamp);
    const values: [number, number, number] = [
      Number(row[1]),
      Number(row[2]),
      Number(row[3]),
    ];

    let changed = false;
    for (const rule of rules) {
      if (rule.date !== date) continue;
      const idx = AXIS_INDEX[rule.axis];
      const current = values[idx - 1];
      const magnitude = Math.abs(current);
      if (Math.abs(magnitude - rule.matchValue) <= rule.matchTolerance) {
        values[idx - 1] = Math.sign(current) * rule.displayValue;
        changed = true;
      }
    }

    if (!changed) return row;
    return [row[0], values[0], values[1], values[2]];
  });
}
