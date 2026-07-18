-- Instrument ownership status: Owned | Rental
-- Replaces Active/Inactive as the admin-facing Status in the UI.
-- is_active remains for alert monitoring (keep instruments active unless you disable alerts).

ALTER TABLE instruments
ADD COLUMN IF NOT EXISTS ownership text
CHECK (ownership IS NULL OR ownership IN ('owned', 'rental'));

COMMENT ON COLUMN instruments.ownership IS 'Instrument ownership status: owned or rental';

-- Seismographs / Instantel / Rock -> Owned
UPDATE instruments
SET ownership = 'owned'
WHERE instrument_id IN (
  'SMG-1',
  'SMG1',
  'SMG-2',
  'SMG2',
  'SMG-3',
  'SMG4',
  'SMG-4',
  '13453',
  'ROCKSMG-1',
  'ROCKSMG-2',
  'Instantel 1',
  'Instantel 2',
  'UM15783',
  'UM16368'
)
OR sno IN ('UM15783', 'UM16368', 'R25160046', 'R24460069')
OR instrument_name IN ('UM15783', 'UM16368');

-- Tiltmeters -> Rental
UPDATE instruments
SET ownership = 'rental'
WHERE instrument_id IN (
  'TILT-142939',
  'TILT-143969'
)
OR instrument_id ILIKE 'TILT%'
OR instrument_name ILIKE 'TM %'
OR instrument_name ILIKE '%tiltmeter%';
