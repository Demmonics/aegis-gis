import React, { useState, useEffect, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
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
  Plane,
  Crosshair,
  Layers,
  Sparkles,
  Tractor,
  WifiOff,
  Cpu
} from 'lucide-react';

// Auto-centering helper for Leaflet map when scenario or target changes
function AutoMapCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Canvas RF Wave & Particle Overlay for High-FPS Attack Visualization
function CanvasRfOverlay({ spooferPos, isAttacking, targetPos }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let waveRadius = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (isAttacking) {
        // Draw expanding concentric RF wave circles from spoofer center
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        waveRadius = (waveRadius + 1.2) % 120;

        for (let i = 0; i < 3; i++) {
          const r = (waveRadius + i * 40) % 120;
          const alpha = Math.max(0, 1 - r / 120);

          ctx.beginPath();
          ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
          ctx.strokeStyle = `rgba(239, 68, 68, ${alpha * 0.75})`;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Fill subtle pulse
          ctx.fillStyle = `rgba(239, 68, 68, ${alpha * 0.08})`;
          ctx.fill();
        }

        // Draw hostile jamming beam to target
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX + 80, centerY - 60);
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isAttacking]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={240}
      className="pointer-events-none absolute inset-0 z-20 m-auto"
      style={{ display: isAttacking ? 'block' : 'none' }}
    />
  );
}

// Vehicle SVG generators based on domain
const getVehicleSvg = (type, color) => {
  switch (type) {
    case 'airplane':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${color}" stroke="#020617" stroke-width="1.5">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
        </svg>
      `;
    case 'drone':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${color}" stroke="#020617" stroke-width="1.5">
          <path d="M12 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm14 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          <path d="M12 8v8M8 12h8" stroke="${color}" stroke-width="2"/>
        </svg>
      `;
    case 'tractor':
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${color}" stroke="#020617" stroke-width="1.5">
          <path d="M3 17a4 4 0 1 0 8 0 4 4 0 0 0-8 0zm14-1a3 3 0 1 0 6 0 3 3 0 0 0-6 0zM7 17h11m-7-5h5l2 4H9l1-4zm-4 0h3l1 3H6l-3-3zm1-3h5l1 3H4l1-3z"/>
        </svg>
      `;
    case 'ship':
    default:
      return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28" fill="${color}" stroke="#020617" stroke-width="1.5">
          <path d="M2 17l10 5 10-5M12 2v20M7 7l5-5 5 5"/>
        </svg>
      `;
  }
};

// Custom Leaflet DivIcon generator
const createVehicleIcon = (vehicleType, color, isGhost = false, label = '', heading = 0) => {
  const svg = getVehicleSvg(vehicleType, color);
  return L.divIcon({
    className: 'custom-vehicle-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        opacity: ${isGhost ? '0.6' : '1.0'};
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
          transform: rotate(${heading}deg);
          transition: transform 0.2s ease-out;
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

// Pulsing Attack Origin Spoofer Marker with Concentric RF Rings
const createSpooferStationIcon = (isAttacking, label = 'TERRESTRIAL SPOOFER') => {
  return L.divIcon({
    className: 'custom-spoofer-marker',
    html: `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -50%);
        position: relative;
      ">
        ${isAttacking ? `
          <div class="rf-ring-1" style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 48px;
            height: 48px;
            margin-top: -24px;
            margin-left: -24px;
            border-radius: 50%;
            border: 2px solid #ef4444;
            animation: rf-wave-expand 1.6s cubic-bezier(0, 0.2, 0.8, 1) infinite;
            pointer-events: none;
          "></div>
          <div class="rf-ring-2" style="
            position: absolute;
            top: 50%;
            left: 50%;
            width: 72px;
            height: 72px;
            margin-top: -36px;
            margin-left: -36px;
            border-radius: 50%;
            border: 1.5px solid #f87171;
            animation: rf-wave-expand 1.6s cubic-bezier(0, 0.2, 0.8, 1) infinite;
            animation-delay: 0.8s;
            pointer-events: none;
          "></div>
        ` : ''}
        <div style="
          background: ${isAttacking ? '#dc2626' : '#334155'};
          border: 2px solid ${isAttacking ? '#fca5a5' : '#64748b'};
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px ${isAttacking ? '#ef4444' : '#334155'};
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
          background: #020617;
          border: 1px solid ${isAttacking ? '#ef4444' : '#475569'};
          color: ${isAttacking ? '#fca5a5' : '#94a3b8'};
          font-size: 9px;
          font-family: monospace;
          padding: 1px 6px;
          border-radius: 4px;
          white-space: nowrap;
          margin-top: 4px;
          font-weight: bold;
          box-shadow: 0 2px 6px rgba(0,0,0,0.8);
        ">
          ${isAttacking ? '⚠️ ' + label : 'RF MONITORING STATION'}
        </div>
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 18]
  });
};

function SimulationPlayerComponent({
  onClose = null
}) {
  // Scenario catalogs available
  const scenariosList = [
    {
      id: 'aviation_vilnius',
      title: 'Aviation: Ryanair Vilnius Approach (EASA Alert 2025)',
      domain: 'Aviation',
      icon: Plane,
      vehicle: 'Boeing 737-800'
    },
    {
      id: 'maritime_baltic',
      title: 'Maritime: Baltic Sea Tanker Runway Teleport (C4ADS)',
      domain: 'Maritime',
      icon: Anchor,
      vehicle: 'Chemical Tanker'
    },
    {
      id: 'uav_drift',
      title: 'UAV Drone: RL Drift-Evasive Survey Attack',
      domain: 'UAV/Drone',
      icon: Navigation,
      vehicle: 'Hexacopter Survey Drone'
    },
    {
      id: 'agri_tractor',
      title: 'Precision Ag: Nashik Vineyard RTK Tractor',
      domain: 'Agriculture',
      icon: Tractor,
      vehicle: 'Autonomous RTK Tractor'
    }
  ];

  const [selectedScenarioId, setSelectedScenarioId] = useState('aviation_vilnius');
  const [scenarioData, setScenarioData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Playback state
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [enableEkf, setEnableEkf] = useState(false);

  // Fetch track when selected scenario changes
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsPlaying(false);
    setCurrentEpoch(0);

    fetch(`/api/simulations/${selectedScenarioId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (isMounted) {
          setScenarioData(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.warn('Backend fetch failed, attempting fallback to static generator:', err);
        // Fallback fetch from standard endpoint or local generator
        fetch(`/backend/simulations/data/${selectedScenarioId}.json`)
          .then(r => r.json())
          .then(fallbackData => {
            if (isMounted) {
              setScenarioData(fallbackData);
              setLoading(false);
            }
          })
          .catch(e => {
            console.error('All fetch attempts failed:', e);
            if (isMounted) setLoading(false);
          });
      });

    return () => { isMounted = false; };
  }, [selectedScenarioId]);

  // Animation ticker
  useEffect(() => {
    let interval = null;
    if (isPlaying && scenarioData && scenarioData.epochs) {
      interval = setInterval(() => {
        setCurrentEpoch(prev => {
          if (prev >= scenarioData.epochs.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackSpeed, scenarioData]);

  if (loading || !scenarioData || !scenarioData.epochs) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-slate-950 border border-slate-800 rounded-xl min-h-[500px]">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-mono text-cyan-400">Loading High-Fidelity Simulation Engine...</p>
        <p className="text-xs text-slate-500 mt-1">Retrieving 60-epoch Section 5 incident telemetry</p>
      </div>
    );
  }

  const epochs = scenarioData.epochs;
  const currentTelem = epochs[currentEpoch] || epochs[0];
  const isAttackActive = currentTelem.is_attack_active;

  // Memoize paths up to current epoch for 60FPS fluid rendering
  const truePath = useMemo(() => epochs.slice(0, currentEpoch + 1).map(e => e.true_pos), [epochs, currentEpoch]);
  const spoofedPath = useMemo(() => epochs.slice(0, currentEpoch + 1).map(e => e.spoofed_pos), [epochs, currentEpoch]);
  const ekfPath = useMemo(() => epochs.slice(0, currentEpoch + 1).map(e => e.ekf_pos), [epochs, currentEpoch]);

  // Current positions
  const currentTrue = currentTelem.true_pos;
  const currentSpoofed = currentTelem.spoofed_pos;
  const currentEkf = currentTelem.ekf_pos;
  const vehicleType = scenarioData.vehicle_type || 'ship';

  return (
    <div className="flex flex-col space-y-4">
      {/* 1. Header Toolbar: Scenario Dropdown & Playback Controls */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Scenario Selector Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-cyan-400 font-bold">
              Global Incident Simulation Engine
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <select
                value={selectedScenarioId}
                onChange={e => setSelectedScenarioId(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-white text-xs font-mono rounded px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                {scenariosList.map(s => (
                  <option key={s.id} value={s.id}>
                    [{s.domain}] {s.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Playback Controls Strip */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentEpoch(0)}
            title="Reset to Epoch 0"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition shadow ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>PAUSE</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>SIMULATE</span>
              </>
            )}
          </button>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            {[1, 2, 5].map(spd => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2.5 py-1 text-xs font-mono rounded transition ${
                  playbackSpeed === spd
                    ? 'bg-slate-800 text-cyan-400 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* EKF Rescue Switch */}
          <button
            onClick={() => setEnableEkf(!enableEkf)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition border ${
              enableEkf
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>EKF RESCUE: {enableEkf ? 'ACTIVE' : 'OFF'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Timeline Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl flex items-center gap-4">
        <span className="font-mono text-xs text-slate-400 whitespace-nowrap min-w-[70px]">
          Epoch {currentEpoch} / {epochs.length - 1}
        </span>
        <input
          type="range"
          min={0}
          max={epochs.length - 1}
          value={currentEpoch}
          onChange={e => setCurrentEpoch(Number(e.target.value))}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="flex items-center gap-2">
          {isAttackActive ? (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/40 text-[11px] font-mono font-bold animate-pulse whitespace-nowrap">
              <ShieldAlert className="w-3.5 h-3.5" />
              SPOOFING ACTIVE
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono whitespace-nowrap">
              <CheckCircle className="w-3.5 h-3.5" />
              AUTHENTIC FLIGHT/VOYAGE
            </span>
          )}
        </div>
      </div>

      {/* 3. Main Stage: Split Map & Live Telemetry Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Interactive Geospatial Tactical Canvas/Map (7 cols) */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[560px] relative">
          {/* Top Banner on Map */}
          <div className="absolute top-3 left-3 z-[400] bg-slate-950/90 border border-slate-800 backdrop-blur px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-mono text-xs text-slate-200 font-bold">
              {scenarioData.location_name}
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              ({scenarioData.target_vehicle})
            </span>
          </div>

          {/* Interactive Leaflet Map View */}
          <MapContainer
            center={scenarioData.map_center}
            zoom={scenarioData.default_zoom || 11}
            className="w-full h-full z-0"
            style={{ background: '#020617' }}
          >
            <AutoMapCenter
              center={scenarioData.map_center}
              zoom={scenarioData.default_zoom || 11}
            />

            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              maxZoom={19}
            />

            {/* Reference GIS Zones & Polygons */}
            {scenarioData.gis_polygons && scenarioData.gis_polygons.map((poly, idx) => (
              <Polygon
                key={idx}
                positions={poly.coords}
                pathOptions={{
                  color: poly.color || '#3b82f6',
                  fillColor: poly.color || '#3b82f6',
                  fillOpacity: 0.15,
                  weight: 1.5,
                  dashArray: poly.type === 'CORRIDOR' ? '4, 4' : null
                }}
              >
                <Popup>
                  <div className="text-slate-900 text-xs font-mono font-bold">
                    {poly.name} ({poly.type})
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Trajectory Polyline: True Physical Path (Cyan) */}
            {truePath.length > 1 && (
              <Polyline
                positions={truePath}
                pathOptions={{
                  color: '#06b6d4',
                  weight: 3,
                  opacity: 0.85
                }}
              />
            )}

            {/* Trajectory Polyline: Spoofed False Path (Red Dashed) */}
            {spoofedPath.length > 1 && isAttackActive && (
              <Polyline
                positions={spoofedPath}
                pathOptions={{
                  color: '#ef4444',
                  weight: 3,
                  dashArray: '6, 6',
                  opacity: 0.95
                }}
              />
            )}

            {/* Trajectory Polyline: EKF Sensor Fusion Path (Emerald) */}
            {enableEkf && ekfPath.length > 1 && (
              <Polyline
                positions={ekfPath}
                pathOptions={{
                  color: '#10b981',
                  weight: 3.5,
                  opacity: 0.9
                }}
              />
            )}

            {/* Ground Spoofer / Radar Transmitter Marker */}
            {scenarioData.spoofer_location && (
              <Marker
                position={scenarioData.spoofer_location}
                icon={createSpooferStationIcon(isAttackActive, 'ATTACK ORIGIN (SDR)')}
              >
                <Popup>
                  <div className="p-1 font-mono text-xs">
                    <p className="font-bold text-red-600">Terrestrial RF Spoofer Origin</p>
                    <p className="text-slate-600">Location: {scenarioData.spoofer_location[0].toFixed(4)}°N, {scenarioData.spoofer_location[1].toFixed(4)}°E</p>
                    <p className="text-slate-600">Status: {isAttackActive ? 'TRANSMITTING COHERENT RF FALSE SIGNALS' : 'STANDBY'}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* True Vehicle Position Marker */}
            <Marker
              position={currentTrue}
              icon={createVehicleIcon(
                vehicleType,
                '#06b6d4',
                false,
                'TRUE VEHICLE',
                currentTelem.heading_deg || 0
              )}
            >
              <Popup>
                <div className="font-mono text-xs">
                  <p className="font-bold text-cyan-600">Physical Target Truth</p>
                  <p>Lat: {currentTrue[0].toFixed(5)}°</p>
                  <p>Lon: {currentTrue[1].toFixed(5)}°</p>
                </div>
              </Popup>
            </Marker>

            {/* Spoofed Ghost Position Marker (Only shown if drifted) */}
            {isAttackActive && currentTelem.position_drift_m > 1.0 && (
              <Marker
                position={currentSpoofed}
                icon={createVehicleIcon(
                  vehicleType,
                  '#ef4444',
                  true,
                  'SPOOFED PHANTOM',
                  currentTelem.heading_deg || 0
                )}
              >
                <Popup>
                  <div className="font-mono text-xs text-red-600">
                    <p className="font-bold">Spoofed False Fix</p>
                    <p>Lat: {currentSpoofed[0].toFixed(5)}°</p>
                    <p>Lon: {currentSpoofed[1].toFixed(5)}°</p>
                    <p>Drift: {currentTelem.position_drift_m.toFixed(1)} m</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* EKF Recovered Position Marker */}
            {enableEkf && (
              <Marker
                position={currentEkf}
                icon={createVehicleIcon(
                  vehicleType,
                  '#10b981',
                  false,
                  'EKF RESTORED',
                  currentTelem.heading_deg || 0
                )}
              />
            )}
          </MapContainer>

          {/* Critical Alarm Banner Overlay */}
          {currentTelem.alert_message && (
            <div className="absolute bottom-4 left-4 right-4 z-[400] bg-red-950/90 border border-red-500/60 p-3 rounded-lg flex items-center justify-between shadow-2xl backdrop-blur animate-pulse">
              <div className="flex items-center gap-2 text-red-300 font-mono text-xs">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-red-200">
                    CRITICAL INTEGRITY ALARM:
                  </span>{' '}
                  {currentTelem.alert_message}
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900 border border-red-700 text-red-200 whitespace-nowrap">
                LAYER 5 TRIGGERED
              </span>
            </div>
          )}
        </div>

        {/* Right: Live Telemetry, RF Signals & Multi-Layer Defense HUD (4 cols) */}
        <div className="lg:col-span-4 flex flex-col space-y-4">
          {/* Real-time Kinematic Telemetry Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-slate-200 font-mono text-xs font-bold">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span>DYNAMIC TELEMETRY HUD</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                10 Hz SENSOR POLLING
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500">SPEED ({currentTelem.speed_unit})</div>
                <div className="text-lg font-bold text-white mt-0.5">
                  {currentTelem.speed.toFixed(1)}{' '}
                  <span className="text-xs text-slate-400 font-normal">{currentTelem.speed_unit}</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500">ALTITUDE (MSL)</div>
                <div className="text-lg font-bold text-cyan-300 mt-0.5">
                  {currentTelem.altitude_m.toFixed(1)}{' '}
                  <span className="text-xs text-slate-400 font-normal">m</span>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500">HEADING</div>
                <div className="text-base font-bold text-slate-200 mt-0.5 flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  {currentTelem.heading_deg.toFixed(1)}°
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                <div className="text-[10px] text-slate-500">POSITION DRIFT</div>
                <div className={`text-base font-bold mt-0.5 ${
                  currentTelem.position_drift_m > 10 ? 'text-red-400' : 'text-emerald-400'
                }`}>
                  {currentTelem.position_drift_m.toFixed(1)} m
                </div>
              </div>
            </div>

            {/* Coordinates Matrix */}
            <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between items-center text-slate-400">
                <span>True Pos:</span>
                <span className="text-cyan-400">
                  {currentTrue[0].toFixed(5)}°N, {currentTrue[1].toFixed(5)}°E
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Reported GNSS:</span>
                <span className={isAttackActive ? 'text-red-400 font-bold' : 'text-slate-300'}>
                  {currentSpoofed[0].toFixed(5)}°N, {currentSpoofed[1].toFixed(5)}°E
                </span>
              </div>
              {enableEkf && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>EKF Filtered:</span>
                  <span className="text-emerald-400">
                    {currentEkf[0].toFixed(5)}°N, {currentEkf[1].toFixed(5)}°E
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RF Physical Layer Signal Metrics (C/N0 & AGC) */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2 text-slate-200 font-mono text-xs font-bold">
                <Satellite className="w-4 h-4 text-purple-400" />
                <span>RF LAYER 1 & 2 PHYSICAL SIGNATURES</span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isAttackActive
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {isAttackActive ? 'RF ANOMALY DETECTED' : 'NOMINAL CARRIER'}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {/* C/N0 Metric Bar */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Carrier-to-Noise Ratio (C/N₀):</span>
                  <span className={`font-bold ${
                    isAttackActive ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {currentTelem.inferred_cn0.toFixed(1)} dB-Hz
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      currentTelem.inferred_cn0 > 50
                        ? 'bg-red-500'
                        : currentTelem.inferred_cn0 < 38
                        ? 'bg-amber-500'
                        : 'bg-cyan-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, (currentTelem.inferred_cn0 / 60) * 100))}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-slate-500 mt-0.5">
                  <span>30 dB-Hz (Jamming)</span>
                  <span>42 dB-Hz (Nominal)</span>
                  <span>56 dB-Hz (Spoof Surge)</span>
                </div>
              </div>

              {/* AGC Attenuation */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">AGC Front-End Attenuation:</span>
                  <span className={`font-bold ${
                    currentTelem.agc_attenuation_db < -80 ? 'text-red-400' : 'text-slate-300'
                  }`}>
                    {currentTelem.agc_attenuation_db.toFixed(1)} dB
                  </span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className={`h-full transition-all duration-300 ${
                      currentTelem.agc_attenuation_db < -80 ? 'bg-red-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(10, ((currentTelem.agc_attenuation_db + 100) / 100) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Multi-Antenna DoA Spatial Variance */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-400">DoA Azimuth Spatial Variance:</span>
                  <span className={`font-bold ${
                    currentTelem.doa_azimuth_var < 5.0 ? 'text-red-400' : 'text-emerald-400'
                  }`}>
                    {currentTelem.doa_azimuth_var.toFixed(2)} deg²
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {currentTelem.doa_azimuth_var < 5.0
                    ? '⚠️ Spatial Collapse: All satellite signals arriving from single terrestrial spoofer azimuth (< 12°).'
                    : '✓ Healthy Constellation: Signals arriving across multi-quadrant orbital sky.'}
                </p>
              </div>

              {/* Narrative Incident Phase Walkthrough */}
              <div className="bg-slate-950/80 p-2.5 rounded border border-slate-800">
                <div className="text-[10px] uppercase font-bold text-cyan-400 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Section 5 Incident Narrative</span>
                </div>
                {scenarioData.narrative_phases && scenarioData.narrative_phases.map(np => {
                  const [pStart, pEnd] = np.epochs.split('-').map(Number);
                  const isCurrentPhase = currentEpoch >= pStart && currentEpoch <= pEnd;
                  return (
                    <div
                      key={np.phase}
                      className={`text-[10px] py-1 border-b border-slate-800/60 last:border-0 ${
                        isCurrentPhase ? 'text-amber-300 font-semibold' : 'text-slate-500'
                      }`}
                    >
                      <span className="font-mono">[{np.epochs}]:</span> {np.title} — {np.desc}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const SimulationPlayer = React.memo(SimulationPlayerComponent);
export default SimulationPlayer;
