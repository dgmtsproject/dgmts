import { supabase } from '../supabase';

/** Treat null/undefined as active for backwards compatibility. */
export function isInstrumentActive(isActive: boolean | null | undefined): boolean {
  return isActive !== false;
}

export async function fetchInstrumentActiveStatus(instrumentId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('instruments')
    .select('is_active')
    .eq('instrument_id', instrumentId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching instrument active status:', error);
    return true;
  }

  return isInstrumentActive(data?.is_active);
}
