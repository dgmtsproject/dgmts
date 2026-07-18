export type InstrumentOwnership = 'owned' | 'rental';

export const INSTRUMENT_OWNERSHIP_OPTIONS: {
  value: InstrumentOwnership;
  label: string;
}[] = [
  { value: 'owned', label: 'Owned' },
  { value: 'rental', label: 'Rental' },
];

export function normalizeInstrumentOwnership(
  value: string | null | undefined
): InstrumentOwnership {
  return value === 'rental' ? 'rental' : 'owned';
}

export function getOwnershipLabel(
  value: string | null | undefined
): string {
  return normalizeInstrumentOwnership(value) === 'rental' ? 'Rental' : 'Owned';
}

/** Default ownership by instrument type. */
export function defaultOwnershipForInstrument(instrument: {
  instrument_id?: string | null;
  instrument_name?: string | null;
}): InstrumentOwnership {
  const id = (instrument.instrument_id || '').toUpperCase();
  const name = (instrument.instrument_name || '').toLowerCase();
  if (id.includes('TILT') || name.includes('tiltmeter') || name.startsWith('tm ')) {
    return 'rental';
  }
  return 'owned';
}
