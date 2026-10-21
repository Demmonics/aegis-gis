import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  CircleMarker,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { MAP_STYLES, DEFAULT_STYLE_ID } from '../services/mapConfig';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Satellite,
  Compass,
  Navigation,
  Anchor,
  Activity,
  CheckCircle,
  XCircle,
  X,
  Volume2,
  VolumeX,
  ChevronRight
} from 'lucide-react';

// Auto-centering helper
function AutoMapCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Custom Leaflet DivIcons
const createShipIcon = (color, isGhost = false, label = '') => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${color}" stroke="#0f172a" stroke-width="1.5">
      <path d="M2 17l10 5 10-5M12 2v20M7 7l5-5 5 5"/>
    </svg>
  `;
  return L.divIcon({
    className: 'custom-ship-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        opacity: ${isGhost ? '0.5' : '1.0'};
        transform: translate(-50%, -50%);
        pointer-events: auto;
      ">
        <div style="
          background: ${color}22;
          border: 1.5px solid ${color};
          border-radius: 9999px;
          padding: 4px;
          box-shadow: 0 0 ${isGhost ? '8px' : '16px'} ${color}aa;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          ${svg}
        </div>
        ${label ? `
          <div style="
            background: #020617ee;
            border: 1px solid ${color};
            color: ${color};
            font-size: 9px;
            font-family: monospace;
            padding: 1px 5px;
            border-radius: 4px;
            white-space: nowrap;
            margin-top: 3px;
            font-weight: bold;
            box-shadow: 0 2px 6px rgba(0,0,0,0.8);
          ">
            ${label}
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
};

const createRadarStationIcon = (isAttacking) => {
  return L.divIcon({
    className: 'custom-radar-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -50%);
        position: relative;
      ">
        ${isAttacking ? `
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 50px;
            height: 50px;
            margin-top: -25px;
            margin-left: -25px;
            border-radius: 50%;
            border: 2px solid #ef4444;
            animation: rf-wave-expand 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite;
            pointer-events: none;
          "></div>
          <div style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 70px;
            height: 70px;
            margin-top: -35px;
            margin-left: -35px;
            border-radius: 50%;
            border: 1.5px solid #f87171;
            animation: rf-wave-expand 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite;
            animation-delay: 0.9s;
            pointer-events: none;
          "></div>
        ` : ''}
        <div style="
          background: ${isAttacking ? '#dc2626' : '#475569'};
          border: 2px solid ${isAttacking ? '#fca5a5' : '#94a3b8'};
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 15px ${isAttacking ? '#ef4444' : '#475569'};
          z-index: 10;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
            <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/>
            <path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/>
            <circle cx="12" cy="12" r="2"/>
            <path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/>
            <path d="M19.1 4.9C23 8.8 23 15.1 19.1 19"/>
          </svg>
        </div>
        <div style="
          background: #0f172a;
          border: 1px solid ${isAttacking ? '#ef4444' : '#64748b'};
          color: ${isAttacking ? '#fca5a5' : '#cbd5e1'};
          font-size: 9px;
          font-family: monospace;
          padding: 1px 5px;
          border-radius: 4px;
          white-space: nowrap;
          margin-top: 4px;
          font-weight: bold;
        ">
          ${isAttacking ? '⚠️ HOSTILE SDR SPOOFER' : 'COASTAL RADIO STATION'}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

const createSatelliteIcon = (name, isSpoofed) => {
  const color = isSpoofed ? '#ef4444' : '#10b981';
  return L.divIcon({
    className: 'custom-sat-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -50%);
      ">
        <div style="
          background: #020617;
          border: 1.5px solid ${color};
          border-radius: 6px;
          padding: 3px 6px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 0 10px ${color}66;
        ">
          <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${color};"></span>
          <span style="color: ${color}; font-size: 9px; font-family: monospace; font-weight: bold;">${name}</span>
        </div>
      </div>
    `,
    iconSize: [60, 24],
    iconAnchor: [30, 12]
  });
};

export default function CinematicSimulationPlayer({
  scenarioRun = null,
  onClose = null
}) {
  // Timeline playback state
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 1x or 2x
  const [enableEkf, setEnableEkf] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [mapStyle, setMapStyle] = useState(DEFAULT_STYLE_ID);

  const timerRef = useRef(null);

  // Fallback Baltic Sea coordinates generator if scenarioRun is not loaded
  const baseLat = 54.680;
  const baseLon = 19.850;
  const attackStart = 15;
  const totalEpochs = 60;

  // Build the 60 epochs if scenarioRun isn't provided or Baltic isn't active
  const truePath = (scenarioRun?.ground_truth_path && scenarioRun?.scenario_metadata?.scenario_id === 'baltic_maritime_c4ads')
    ? scenarioRun.ground_truth_path.map(p => [p[1], p[0]])
    : Array.from({ length: totalEpochs }, (_, t) => [
        54.680 + t * 0.0008,
        19.850 + t * 0.0012
      ]);

  const spoofedPath = (scenarioRun?.reported_spoofed_path && scenarioRun?.scenario_metadata?.scenario_id === 'baltic_maritime_c4ads')
    ? scenarioRun.reported_spoofed_path.map(p => [p[1], p[0]])
    : Array.from({ length: totalEpochs }, (_, t) => {
        const tLat = 54.680 + t * 0.0008;
        const tLon = 19.850 + t * 0.0012;
        if (t < attackStart) return [tLat, tLon];
        const prog = (t - attackStart) / (totalEpochs - attackStart);
        return [
          tLat + prog * (54.890 - tLat),
          tLon + prog * (20.592 - tLon)
        ];
      });

  const ekfPath = (scenarioRun?.ekf_recovered_path && scenarioRun?.scenario_metadata?.scenario_id === 'baltic_maritime_c4ads')
    ? scenarioRun.ekf_recovered_path.map(p => [p[1], p[0]])
    : Array.from({ length: totalEpochs }, (_, t) => {
        const tLat = 54.680 + t * 0.0008;
        const tLon = 19.850 + t * 0.0012;
        if (t < attackStart) return [tLat, tLon];
        const drift = (t - attackStart) * 0.000004;
        return [tLat + drift, tLon + drift];
      });

  // Current epoch coordinates
  const curTrue = truePath[currentEpoch] || truePath[0];
  const curSpoof = spoofedPath[currentEpoch] || spoofedPath[0];
  const curEkf = ekfPath[currentEpoch] || ekfPath[0];

  // Actors locations
  const coastalSpooferLoc = [54.745, 20.150]; // Coastal radar station (Sambia Peninsula)
  const satellites = [
    { name: 'GPS PRN 12', pos: [54.95, 19.70] },
    { name: 'GALILEO E24', pos: [54.97, 20.08] },
    { name: 'BEIDOU B08', pos: [54.93, 20.45] }
  ];

  // Polygons
  const shippingCorridor = [
    [54.62, 19.75],
    [54.72, 20.15],
    [54.82, 20.05],
    [54.72, 19.65],
    [54.62, 19.75]
  ];

  const runwayPolygon = [
    [54.880, 20.570],
    [54.880, 20.615],
    [54.905, 20.615],
    [54.905, 20.570]
  ];

  // Attack state calculations
  const isAttackActive = currentEpoch >= attackStart;
  const isRunwayIncursion = currentEpoch >= 26;

  // Haversine distance from true ship to reported spoofed ship
  const calculateDistanceKm = (p1, p2) => {
    const R = 6371; // Earth radius in km
    const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1[0] * Math.PI) / 180) *
        Math.cos((p2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const separationKm = calculateDistanceKm(curTrue, curSpoof).toFixed(2);
  const ekfErrorM = (calculateDistanceKm(curTrue, curEkf) * 1000).toFixed(1);

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      const stepMs = playbackSpeed === 2 ? 175 : 350;
      timerRef.current = setInterval(() => {
        setCurrentEpoch(prev => {
          if (prev >= totalEpochs - 1) {
            setIsPlaying(false);
            return totalEpochs - 1;
          }
          return prev + 1;
        });
      }, stepMs);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed]);

  // Current attack phase calculation
  let phaseNumber = 1;
  let phaseTitle = 'Phase 1: Authentic Navigation';
  let phaseDescription = 'Commercial oil tanker navigating IMO traffic separation lane at 12.4 knots. Multi-constellation signals are nominal.';
  if (currentEpoch >= 26) {
    phaseNumber = 3;
    phaseTitle = 'Phase 3: Trajectory Capture & GIS Conflict';
    phaseDescription = 'Spoofer dragged the reported fix 14.8 km inland onto the Khrabrovo Military Runway. Legacy GIS platforms plot the vessel overland.';
  } else if (currentEpoch >= 15) {
    phaseNumber = 2;
    phaseTitle = 'Phase 2: Signal Injection & Pull-off';
    phaseDescription = 'Hostile coastal SDR begins intermediate synchronized pull-off. Correlator peak experiences asymmetric distortion, dragging the tracking loop.';
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden">
      {/* 1. Cinematic Top Mission Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between shadow-2xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-base text-white tracking-wide">
                BALTIC SEA SPOOFING INCIDENT SIMULATOR
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Section 5.2 C4ADS Reenactment
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Target: 100,000 DWT Commercial Tanker (ECDIS + RTK) • Location: Baltic Sea to Khrabrovo Airport
            </p>
          </div>
        </div>

        {/* Attack Stage Indicator */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs">
          <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
            phaseNumber === 1
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-sm shadow-emerald-500/30'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${phaseNumber === 1 ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`}></span>
            <span>1. Authentic Lock</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

          <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
            phaseNumber === 2
              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-500/30'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${phaseNumber === 2 ? 'bg-amber-400 animate-ping' : 'bg-slate-500'}`}></span>
            <span>2. RF Pull-Off</span>
          </div>

          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />

          <div className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
            phaseNumber === 3
              ? 'bg-red-500/20 border-red-500/50 text-red-300 shadow-sm shadow-red-500/30 animate-pulse'
              : 'bg-slate-800 border-slate-700 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${phaseNumber === 3 ? 'bg-red-400 animate-ping' : 'bg-slate-500'}`}></span>
            <span>3. Runway Collision</span>
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEnableEkf(!enableEkf)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-xs font-bold transition-all shadow-md ${
              enableEkf
                ? 'bg-cyan-500 text-slate-950 border border-cyan-400 shadow-cyan-500/40 animate-pulse'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-cyan-500/50'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>{enableEkf ? 'AEGIS EKF ACTIVE' : 'ACTIVATE EKF RESCUE'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Return to Main Command Center"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Center Body: Tactical Map & Narrative Sidebar */}
      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Left Map Viewport */}
        <div className="flex-1 relative h-full w-full">
          {/* Critical GIS Runway Alert Banner */}
          {isRunwayIncursion && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-2xl bg-red-950/90 border-2 border-red-500 rounded-xl p-3 backdrop-blur-md animate-alert-banner flex items-center justify-between gap-3 text-red-100 shadow-2xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-400 animate-bounce flex-shrink-0" />
                <div>
                  <h4 className="font-mono font-extrabold text-sm md:text-base text-red-200 tracking-wider">
                    🚨 CRITICAL GIS VIOLATION: MARITIME VESSEL ON AIRPORT RUNWAY 🚨
                  </h4>
                  <p className="text-xs text-red-300 font-mono mt-0.5">
                    Fix: Lat 54.890°N, Lon 20.592°E | Khrabrovo Airport Runway (Chkalovsk Airfield) | Distance: {separationKm} km inland!
                  </p>
                </div>
              </div>
              <div className="hidden sm:block text-right font-mono text-[11px] text-red-400 border-l border-red-800/80 pl-3">
                <div>SEVERITY: CRITICAL</div>
                <div>SEC 8.4 ALARM</div>
              </div>
            </div>
          )}

          {/* EKF Shield Restored Badge */}
          {enableEkf && isAttackActive && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[999] bg-cyan-950/90 border border-cyan-400/80 rounded-lg px-4 py-1.5 backdrop-blur-md shadow-lg flex items-center gap-2 text-cyan-200 font-mono text-xs">
              <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span>
                AEGIS EKF SENSOR FUSION ENGAGED: True Vessel Trajectory Retained (Error: {ekfErrorM}m vs {separationKm}km Spoof)
              </span>
            </div>
          )}

          {/* Floating Basemap Style Switcher */}
          <div className="absolute top-4 right-4 z-[500] flex items-center bg-slate-950/90 border border-slate-700/80 rounded-lg p-1 backdrop-blur shadow-xl text-[11px] font-mono gap-1">
            <button
              onClick={() => setMapStyle('voyager')}
              title="CARTO Voyager Basemap"
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                mapStyle === 'voyager'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🗺️ Voyager</span>
            </button>
            <button
              onClick={() => setMapStyle('dark')}
              title="CARTO Dark Matter Basemap"
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                mapStyle === 'dark'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🌓 Dark Matter</span>
            </button>
          </div>

          {/* Leaflet Map Canvas */}
          <MapContainer
            center={[54.78, 20.20]}
            zoom={10}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <AutoMapCenter center={[54.78, 20.20]} zoom={10} />

            {/* Authenticated CARTO Basemap Layer */}
            <TileLayer
              key={mapStyle}
              attribution={MAP_STYLES[mapStyle]?.attribution || MAP_STYLES.voyager.attribution}
              url={MAP_STYLES[mapStyle]?.url || MAP_STYLES.voyager.url}
              maxZoom={19}
            />

            {/* A. Shipping Corridor Polygon (Green) */}
            <Polygon
              positions={shippingCorridor}
              pathOptions={{
                color: '#10b981',
                fillColor: '#10b981',
                fillOpacity: 0.12,
                weight: 1.5,
                dashArray: '4, 4'
              }}
            >
              <Popup>
                <div className="text-xs font-mono">
                  <strong className="text-emerald-400">Designated Baltic Shipping Lane</strong><br />
                  IMO Traffic Separation Scheme
                </div>
              </Popup>
            </Polygon>

            {/* B. Khrabrovo Airport Runway (Red - Flashing on incursion) */}
            <Polygon
              positions={runwayPolygon}
              pathOptions={{
                color: isRunwayIncursion ? '#ef4444' : '#f87171',
                fillColor: '#ef4444',
                fillOpacity: isRunwayIncursion ? 0.65 : 0.25,
                weight: isRunwayIncursion ? 3 : 1.5,
                dashArray: isRunwayIncursion ? null : '3, 3'
              }}
            >
              <Popup>
                <div className="text-xs font-mono">
                  <strong className="text-red-400">Khrabrovo Airport Runway (Inland)</strong><br />
                  Coordinates: 54.890°N, 20.592°E<br />
                  <span className="text-amber-400">Prohibited Zone for Maritime Vessels</span>
                </div>
              </Popup>
            </Polygon>

            {/* C. Coastal Hostile SDR Spoofer Transmitter */}
            <Marker
              position={coastalSpooferLoc}
              icon={createRadarStationIcon(isAttackActive)}
            >
              <Popup>
                <div className="text-xs font-mono">
                  <strong className="text-red-400">Coastal SDR Spoofer Station</strong><br />
                  Kaliningrad Coastal Transmitter<br />
                  Status: {isAttackActive ? 'TRANSMITTING +3.0 dB SPOOFING SIGNAL' : 'IDLE / RECONNAISSANCE'}
                </div>
              </Popup>
            </Marker>

            {/* D. Satellite Constellations in Sky */}
            {satellites.map((sat, sIdx) => (
              <Marker
                key={`sat-${sIdx}`}
                position={sat.pos}
                icon={createSatelliteIcon(sat.name, isAttackActive)}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <strong className="text-emerald-400">{sat.name}</strong><br />
                    Elevation: 68° | Azimuth: 142°<br />
                    Frequency: L1 (1575.42 MHz)
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* E. Signal Beams */}
            {/* 1. Prior to attack (Epoch 0-14): Green lines from satellites to true ship */}
            {!isAttackActive && satellites.map((sat, sIdx) => (
              <Polyline
                key={`sat-beam-${sIdx}`}
                positions={[sat.pos, curTrue]}
                pathOptions={{
                  color: '#10b981',
                  weight: 1.5,
                  opacity: 0.6,
                  dashArray: '3, 6'
                }}
              />
            ))}

            {/* 2. Attack Active (Epoch 15+): Hostile Red beam from Coastal Spoofer to Spoofed Receiver */}
            {isAttackActive && (
              <Polyline
                positions={[coastalSpooferLoc, curSpoof]}
                pathOptions={{
                  color: '#ef4444',
                  weight: 3,
                  opacity: 0.85,
                  dashArray: '4, 4'
                }}
              />
            )}

            {/* 3. Trajectory Trails */}
            {/* Green True Path Trail */}
            <Polyline
              positions={truePath.slice(0, currentEpoch + 1)}
              pathOptions={{ color: '#10b981', weight: 2.5, opacity: 0.85 }}
            />

            {/* Red Spoofed Trail */}
            {isAttackActive && (
              <Polyline
                positions={spoofedPath.slice(attackStart, currentEpoch + 1)}
                pathOptions={{ color: '#ef4444', weight: 3, opacity: 0.9, dashArray: '4, 4' }}
              />
            )}

            {/* Cyan EKF Trail */}
            {enableEkf && isAttackActive && (
              <Polyline
                positions={ekfPath.slice(attackStart, currentEpoch + 1)}
                pathOptions={{ color: '#06b6d4', weight: 3.5, opacity: 0.95 }}
              />
            )}

            {/* Cyan EKF tether line from spoofed fix back to true track */}
            {enableEkf && isAttackActive && (
              <Polyline
                positions={[curSpoof, curEkf]}
                pathOptions={{
                  color: '#06b6d4',
                  weight: 2,
                  dashArray: '2, 4',
                  opacity: 0.8
                }}
              />
            )}

            {/* F. The Actors: True Ship vs Spoofed Ship vs EKF Ship */}
            {/* 1. True Physical Ship (Ghosted emerald/cyan) */}
            <Marker
              position={curTrue}
              icon={createShipIcon('#10b981', true, 'TRUE VESSEL (PHYSICAL)')}
            >
              <Popup>
                <div className="text-xs font-mono">
                  <strong className="text-emerald-400">Actual Tanker Position</strong><br />
                  Lat: {curTrue[0].toFixed(5)}°N<br />
                  Lon: {curTrue[1].toFixed(5)}°E<br />
                  Speed: 12.4 knots • Heading: 045°
                </div>
              </Popup>
            </Marker>

            {/* 2. Spoofed Receiver (Solid Red/Amber) */}
            <Marker
              position={curSpoof}
              icon={createShipIcon(
                isAttackActive ? '#ef4444' : '#10b981',
                false,
                isAttackActive ? '⚠️ SPOOFED GNSS REPORT' : 'GNSS NAV RECEIVER'
              )}
            >
              <Popup>
                <div className="text-xs font-mono space-y-1">
                  <strong className="text-red-400">Reported ECDIS Coordinates</strong><br />
                  Lat: {curSpoof[0].toFixed(5)}°N<br />
                  Lon: {curSpoof[1].toFixed(5)}°E<br />
                  Offset from True: <span className="text-amber-300 font-bold">{separationKm} km</span><br />
                  {isRunwayIncursion && (
                    <span className="text-red-400 font-bold">INSIDE AIRPORT RUNWAY PERIMETER</span>
                  )}
                </div>
              </Popup>
            </Marker>

            {/* 3. EKF Restored Vessel Marker */}
            {enableEkf && isAttackActive && (
              <Marker
                position={curEkf}
                icon={createShipIcon('#06b6d4', false, '🛡️ AEGIS EKF RESTORED')}
              >
                <Popup>
                  <div className="text-xs font-mono">
                    <strong className="text-cyan-400">AEGIS Sensor Fusion Fix</strong><br />
                    Lat: {curEkf[0].toFixed(5)}°N<br />
                    Lon: {curEkf[1].toFixed(5)}°E<br />
                    Error to True: <span className="text-emerald-300 font-bold">{ekfErrorM} meters</span><br />
                    Source: INS Strapdown Dead-Reckoning
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Floating Map Symbology Legend */}
          <div className="absolute bottom-4 left-4 z-[999] bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 backdrop-blur-md shadow-xl text-[11px] font-mono space-y-1">
            <div className="font-bold text-white text-[10px] uppercase tracking-wider pb-1 border-b border-slate-800 flex items-center justify-between gap-4">
              <span>Scenario Symbology</span>
              <span className="text-cyan-400">C4ADS 2019-2024</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center text-[8px] text-emerald-300">⚓</span>
              <span className="text-slate-300">True Vessel (Open Water)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500 flex items-center justify-center text-[8px] text-red-300">⚠️</span>
              <span className="text-slate-300">Spoofed Fix (Pulled Inland)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-600 border border-red-400"></span>
              <span className="text-slate-300">Hostile Coastal SDR Spoofer</span>
            </div>
            {enableEkf && (
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-500/30 border border-cyan-400 flex items-center justify-center text-[8px] text-cyan-300">🛡️</span>
                <span className="text-cyan-300">AEGIS EKF Restored Trajectory</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Narrative & Telemetry Sidebar */}
        <div className="w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            {/* Incident Phase Briefing Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 shadow-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 font-bold">
                  TACTICAL MISSION TIMELINE
                </span>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  phaseNumber === 3 ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                  phaseNumber === 2 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  EPOCH {currentEpoch} / 59
                </span>
              </div>
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <span className="text-cyan-400 font-mono">[{phaseNumber}/3]</span>
                {phaseTitle}
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                {phaseDescription}
              </p>
            </div>

            {/* Live Threat Telemetry Gauges */}
            <div className="space-y-2">
              <h4 className="text-[10px] uppercase font-mono tracking-wider text-slate-400 font-bold">
                PHYSICS & GIS TELEMETRY
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                {/* Distance Divergence */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Spatial Offset</span>
                  <span className={`text-base font-extrabold ${
                    parseFloat(separationKm) > 5 ? 'text-red-400 animate-pulse' :
                    parseFloat(separationKm) > 0.5 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {separationKm} km
                  </span>
                </div>

                {/* EKF Residual Error */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block mb-0.5">EKF State Error</span>
                  <span className="text-base font-extrabold text-cyan-400">
                    {enableEkf ? `${ekfErrorM} m` : 'UNFILTERED'}
                  </span>
                </div>

                {/* SQM Ratio Metric */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block mb-0.5">Correlator Ratio (L1)</span>
                  <span className={`text-sm font-bold ${isAttackActive ? 'text-red-400' : 'text-slate-200'}`}>
                    {isAttackActive ? '0.742 (ALERT)' : '0.504 (NOMINAL)'}
                  </span>
                </div>

                {/* DoA Spatial Variance */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                  <span className="text-[10px] text-slate-400 block mb-0.5">DoA Azimuth Var (L2)</span>
                  <span className={`text-sm font-bold ${isAttackActive ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isAttackActive ? '0.014 rad² (COLLAPSE)' : '1.420 rad²'}
                  </span>
                </div>
              </div>
            </div>

            {/* Defense Consensus Matrix Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                5-LAYER DEFENSE CONSENSUS (TABLE 2)
              </span>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Layer 1: SQM Multi-Tap Peak</span>
                <span className={isAttackActive ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {isAttackActive ? 'DISTORTION' : 'NOMINAL'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Layer 2: Multi-Antenna DoA</span>
                <span className={isAttackActive ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {isAttackActive ? 'COLLAPSED' : 'DISPERSED'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Layer 3: Galileo OS-NMA TESLA</span>
                <span className={isAttackActive ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {isAttackActive ? 'UNAUTHENTIC' : 'AUTHENTIC'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-300">Layer 4: Tightly-Coupled EKF</span>
                <span className={enableEkf ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
                  {enableEkf ? 'INNOVATION GATED' : 'BYPASS'}
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-300">Section 8: GIS Spatial Topology</span>
                <span className={isRunwayIncursion ? 'text-red-400 font-bold' : 'text-emerald-400'}>
                  {isRunwayIncursion ? 'RUNWAY VIOLATION' : 'IN CORRIDOR'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Interactive Playback Scrub Bar */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                    isPlaying
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentEpoch(0);
                  }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                  title="Reset to Start"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
                  className={`px-2 py-1.5 rounded-lg border font-mono text-xs transition-colors ${
                    playbackSpeed === 2
                      ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {playbackSpeed}x SPEED
                </button>
              </div>

              <span className="font-bold text-cyan-300 text-xs">
                T = {currentEpoch}s / 59s
              </span>
            </div>

            {/* Scrubber slider */}
            <input
              type="range"
              min="0"
              max="59"
              value={currentEpoch}
              onChange={(e) => setCurrentEpoch(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
