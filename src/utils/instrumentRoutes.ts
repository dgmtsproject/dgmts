export interface InstrumentRouteInput {
  instrument_id: string;
  instrument_name?: string | null;
  syscom_device_id?: number | null;
  sno?: string | null;
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
  "AMTS-1": "/single-prism-with-time",
  "AMTS-2": "/single-prism-with-time",
};

const MICROMATE_DEVICE_ROUTES: Record<string, string> = {
  UM15783: "/instantel1-seismograph",
  UM16368: "/instantel2-seismograph",
};

const MICROMATE_DEVICE_BY_ROUTE: Record<string, string> = {
  "/instantel1-seismograph": "UM15783",
  "/instantel2-seismograph": "UM16368",
};

function normalizeMicromateToken(value?: string | null): string | null {
  const token = value?.trim().toUpperCase();
  return token && MICROMATE_DEVICE_ROUTES[token] ? token : null;
}

/** Micromate FTP folder for Instantel CSV data (UM15783 / UM16368). */
export function getMicromateDeviceFolder(
  instrument: InstrumentRouteInput
): string | null {
  const fromName = normalizeMicromateToken(instrument.instrument_name);
  if (fromName) return fromName;

  const fromSerial = normalizeMicromateToken(instrument.sno);
  if (fromSerial) return fromSerial;

  const route = getInstrumentGraphRoute(instrument);
  return route ? MICROMATE_DEVICE_BY_ROUTE[route] ?? null : null;
}

/** Resolve the graph page path for an instrument, or null if none exists. */
export function getInstrumentGraphRoute(
  instrument: InstrumentRouteInput
): string | null {
  const instrumentId = instrument.instrument_id?.trim();
  if (!instrumentId) return null;

  let route = STATIC_INSTRUMENT_ROUTES[instrumentId];

  if (!route) {
    const micromateFromName = normalizeMicromateToken(instrument.instrument_name);
    if (micromateFromName) {
      route = MICROMATE_DEVICE_ROUTES[micromateFromName];
    }
  }

  if (!route) {
    const name = instrument.instrument_name?.trim().toLowerCase();
    if (name === "instantel 1" || name === "instantel-1") {
      route = "/instantel1-seismograph";
    } else if (name === "instantel 2" || name === "instantel-2") {
      route = "/instantel2-seismograph";
    }
  }

  if (!route) {
    const micromateFromSerial = normalizeMicromateToken(instrument.sno);
    if (micromateFromSerial) {
      route = MICROMATE_DEVICE_ROUTES[micromateFromSerial];
    }
  }

  if (!route && instrument.syscom_device_id) {
    const idParam = encodeURIComponent(instrumentId);
    route = `/dynamic-seismograph?instrument=${idParam}`;
  }

  if (!route && instrumentId.includes("TILT")) {
    const tiltSuffix = instrumentId.split("-")[1];
    if (tiltSuffix) {
      route = `/tiltmeter-${tiltSuffix}`;
    }
  }

  if (!route && instrument.instrument_name === "Tiltmeter") {
    route = "/tiltmeter";
  }

  return route ?? null;
}

export function canViewInstrumentGraph(
  instrument: InstrumentRouteInput,
  options?: { viewGraphPermission?: boolean; isActive?: boolean }
): boolean {
  const { viewGraphPermission = true, isActive = true } = options ?? {};
  return Boolean(viewGraphPermission && isActive && getInstrumentGraphRoute(instrument));
}

export function getInstrumentGraphLabel(
  instrument: InstrumentRouteInput
): string {
  const micromateFolder = getMicromateDeviceFolder(instrument);
  if (micromateFolder === "UM15783") return "Instantel 1 (UM15783)";
  if (micromateFolder === "UM16368") return "Instantel 2 (UM16368)";
  return instrument.instrument_name?.trim() || instrument.instrument_id;
}

export interface ProjectNavState {
  id: number;
  name: string;
}

/** Build router state to pass when opening a graph from any project. */
export function buildInstrumentGraphNavState(
  instrument: InstrumentRouteInput,
  project: ProjectNavState
) {
  return {
    project: { id: project.id, name: project.name },
    instrumentId: instrument.instrument_id,
    micromateDeviceFolder: getMicromateDeviceFolder(instrument),
  };
}
