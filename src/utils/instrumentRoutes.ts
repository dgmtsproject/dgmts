export interface InstrumentRouteInput {
  instrument_id: string;
  instrument_name?: string | null;
  syscom_device_id?: number | null;
}

const STATIC_INSTRUMENT_ROUTES: Record<string, string> = {
  SMG1: "/background",
  "SMG-1": "/dynamic-seismograph?instrument=SMG-1",
  "SMG-2": "/anc-seismograph",
  "SMG-3": "/smg3-seismograph",
  "TILT-142939": "/tiltmeter-142939",
  "TILT-143969": "/tiltmeter-143969",
  "TILTMETER-30846": "/tiltmeter-30846",
  "Instantel 1": "/instantel1-seismograph",
  "Instantel 2": "/instantel2-seismograph",
  "ROCKSMG-1": "/rocksmg1-seismograph",
  "ROCKSMG-2": "/rocksmg2-seismograph",
};

/** Resolve the graph page path for an instrument, or null if none exists. */
export function getInstrumentGraphRoute(
  instrument: InstrumentRouteInput
): string | null {
  let route = STATIC_INSTRUMENT_ROUTES[instrument.instrument_id];

  if (!route && instrument.syscom_device_id) {
    const idParam = encodeURIComponent(String(instrument.instrument_id));
    route = `/dynamic-seismograph?instrument=${idParam}`;
  }

  if (!route && instrument.instrument_id.includes("TILT")) {
    const tiltSuffix = instrument.instrument_id.split("-")[1];
    if (tiltSuffix) {
      route = `/tiltmeter-${tiltSuffix}`;
    }
  }

  return route ?? null;
}

export function getInstrumentGraphLabel(
  instrument: InstrumentRouteInput
): string {
  return instrument.instrument_name?.trim() || instrument.instrument_id;
}
