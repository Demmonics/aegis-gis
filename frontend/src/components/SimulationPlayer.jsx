import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Polyline,
  Polygon,
  CircleMarker,
  Marker,
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import { MAP_STYLES, DEFAULT_STYLE_ID } from '../services/mapConfig';
import {
  Play,
  Pause,
  RotateCcw,
  Shield,
  Radio,
  X
} from 'lucide-react';

// Auto-centering helper for Leaflet map when scenario changes
function AutoMapCenter({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Mouse coordinate tracker for live cursor readout
function CursorTracker({ onMove }) {
  useMapEvents({
    mousemove(e) {
      if (onMove) onMove(e.latlng);
    }
  });
  return null;
}

// Native scale bar
function MapScale() {
  const map = useMap();
  useEffect(() => {
    const sc = L.control.scale({ imperial: false, metric: true, position: 'bottomright' });
    sc.addTo(map);
    return () => sc.remove();
  }, [map]);
  return null;
}

function formatCoordinates(lat, lon) {
  if (lat == null || lon == null) return '—';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const aLat = Math.abs(lat);
  const aLon = Math.abs(lon);
  const latD = Math.floor(aLat);
  const latM = ((aLat - latD) * 60).toFixed(2);
  const lonD = Math.floor(aLon);
  const lonM = ((aLon - lonD) * 60).toFixed(2);
  return `${latD}° ${latM}' ${latDir}, ${lonD}° ${lonM}' ${lonDir}`;
}

// Crisp cartographic marker icon for vehicles
const createCartographicIcon = (color, label) => {
  return L.divIcon({
    className: 'survey-marker',
    html: `
      <div style="
        display: flex;
        align-items: center;
        gap: 4px;
        transform: translate(-50%, -50%);
        pointer-events: auto;
      ">
        <span style="
          display: inline-block;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: ${color};
          border: 1.5px solid #ffffff;
        "></span>
        <span style="
          background: rgba(255, 255, 255, 0.95);
          border: 1px solid #dfdbd1;
          color: #191c1d;
          font-size: 10px;
          font-family: inherit;
          padding: 1px 4px;
          border-radius: 2px;
          white-space: nowrap;
          font-weight: 500;
        ">${label}</span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [5, 5]
  });
};

function SimulationPlayerComponent({
  onClose = null
}) {
  const scenariosList = [
    {
      id: 'aviation_vilnius',
      title: 'Aviation: Ryanair Vilnius Approach (EASA Alert)',
      domain: 'Aviation',
      vehicle: 'Boeing 737-800'
    },
    {
      id: 'maritime_baltic',
      title: 'Maritime: Baltic Sea Tanker Runway Teleport (C4ADS)',
      domain: 'Maritime',
      vehicle: 'Chemical Tanker'
    },
    {
      id: 'uav_drift',
      title: 'UAV Drone: RL Drift-Evasive Survey Attack',
      domain: 'UAV/Drone',
      vehicle: 'Hexacopter Survey Drone'
    },
    {
      id: 'agri_tractor',
      title: 'Precision Ag: Nashik Vineyard RTK Tractor',
      domain: 'Agriculture',
      vehicle: 'Autonomous RTK Tractor'
    }
  ];

  const [selectedScenarioId, setSelectedScenarioId] = useState('aviation_vilnius');
  const [scenarioData, setScenarioData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState(DEFAULT_STYLE_ID);
  const [cursorCoord, setCursorCoord] = useState(null);

  // Playback state
  const [currentEpoch, setCurrentEpoch] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [enableEkf, setEnableEkf] = useState(true);

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

  const epochs = scenarioData?.epochs || [];

  // Memoize paths up to current epoch for fluid rendering (unconditionally to respect Hook rules)
  const truePath = useMemo(() => epochs.slice(0, currentEpoch + 1).map(e => e.true_pos), [epochs, currentEpoch]);
  const spoofedPath = useMemo(() => epochs.slice(0, currentEpoch + 1).map(e => e.spoofed_pos), [epochs, currentEpoch]);
  const ekfPath = useMemo(() => epochs.slice(0, currentEpoch + 1).map(e => e.ekf_pos), [epochs, currentEpoch]);

  if (loading || !scenarioData || !scenarioData.epochs) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-[#ffffff] border border-[#dfdbd1] rounded min-h-[460px]">
        <p className="text-sm font-medium text-[#191c1d]">Loading cartographic scenario data...</p>
        <p className="text-xs text-[#5e6265] mt-1">Retrieving 60-epoch telemetry records from research dataset</p>
      </div>
    );
  }

  const currentTelem = epochs[currentEpoch] || epochs[0] || {};
  const isAttackActive = Boolean(currentTelem.is_attack_active);

  // Current coordinates
  const currentTrue = currentTelem.true_pos || scenarioData.map_center || [0, 0];
  const currentSpoofed = currentTelem.spoofed_pos || scenarioData.map_center || [0, 0];
  const currentEkf = currentTelem.ekf_pos || scenarioData.map_center || [0, 0];

  const activeBasemap = MAP_STYLES[mapStyle] || MAP_STYLES.esri_topo;

  return (
    <div className="flex flex-col space-y-3 font-sans">
      {/* 1. Quiet Cartographic Toolbar: Scenario, Playback & Speed */}
      <div className="bg-[#ffffff] border border-[#dfdbd1] p-3 rounded flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Scenario Selector */}
        <div className="flex items-center gap-3">
          <div>
            <label className="text-[11px] text-[#5e6265] block mb-0.5 font-medium">
              Geospatial incident scenario (§5)
            </label>
            <select
              value={selectedScenarioId}
              onChange={e => setSelectedScenarioId(e.target.value)}
              className="bg-[#fcfbf9] border border-[#dfdbd1] text-[#191c1d] text-xs rounded px-2.5 py-1 focus:outline-none focus:border-[#16697a] cursor-pointer"
            >
              {scenariosList.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.domain}] {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Playback Controls Strip */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentEpoch(0)}
            title="Reset to epoch 0"
            className="p-1.5 bg-[#f0eee7] hover:bg-[#e6e3da] text-[#5e6265] hover:text-[#191c1d] rounded border border-[#dfdbd1] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#16697a] hover:bg-[#125866] text-white text-xs font-medium transition-colors"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Simulate</span>
              </>
            )}
          </button>

          <div className="flex items-center bg-[#f0eee7] border border-[#dfdbd1] rounded p-0.5">
            {[1, 2, 5].map(spd => (
              <button
                key={spd}
                onClick={() => setPlaybackSpeed(spd)}
                className={`px-2 py-0.5 text-xs rounded transition-colors tabular-nums ${
                  playbackSpeed === spd
                    ? 'bg-[#ffffff] text-[#191c1d] font-semibold border border-[#dfdbd1]'
                    : 'text-[#5e6265] hover:text-[#191c1d]'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* EKF Mitigation Toggle */}
          <button
            onClick={() => setEnableEkf(!enableEkf)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs border transition-colors ${
              enableEkf
                ? 'bg-[#f0eee7] border-[#16697a] text-[#16697a] font-medium'
                : 'bg-[#fcfbf9] border-[#dfdbd1] text-[#5e6265]'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>EKF mitigation: {enableEkf ? 'Active' : 'Off'}</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              title="Return to primary tactical view"
              className="p-1.5 bg-[#f0eee7] hover:bg-[#e6e3da] text-[#5e6265] rounded border border-[#dfdbd1] ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Timeline Progress Bar */}
      <div className="bg-[#ffffff] border border-[#dfdbd1] px-4 py-2.5 rounded flex items-center gap-4 text-xs">
        <span className="text-[#5e6265] whitespace-nowrap min-w-[75px] tabular-nums">
          Epoch {currentEpoch} / {epochs.length - 1}
        </span>
        <input
          type="range"
          min={0}
          max={epochs.length - 1}
          value={currentEpoch}
          onChange={e => setCurrentEpoch(Number(e.target.value))}
          className="w-full h-1.5 bg-[#dfdbd1] rounded appearance-none cursor-pointer accent-[#16697a]"
        />
        <div>
          {isAttackActive ? (
            <span className="px-2 py-0.5 rounded bg-[#fdf2f2] text-[#b82e2b] border border-[#e8b5b5] text-[11px] font-medium whitespace-nowrap">
              Spoofing attack active
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-[#f0eee7] text-[#1d4e3e] border border-[#dfdbd1] text-[11px] font-medium whitespace-nowrap">
              Authentic trajectory
            </span>
          )}
        </div>
      </div>

      {/* 3. Main Stage: Hero Map (~60% Width) & Dynamic Telemetry Panels (~40% Width) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[500px]">
        {/* Left: Cartographic Map Canvas (Hero ~60% Width) */}
        <div className="lg:col-span-7 bg-[#ffffff] border border-[#dfdbd1] rounded overflow-hidden flex flex-col h-[520px] relative">
          {/* Geographic Furniture: Style Switcher (Top Right) */}
          <div className="absolute top-2.5 right-2.5 z-[500] flex items-center bg-[#fcfbf9] border border-[#dfdbd1] rounded p-0.5 text-xs">
            <button
              onClick={() => setMapStyle('esri_topo')}
              className={`px-2 py-0.5 rounded transition-colors ${
                mapStyle === 'esri_topo' ? 'bg-[#16697a] text-white font-medium' : 'text-[#2d3133]'
              }`}
            >
              Survey Topo
            </button>
            <button
              onClick={() => setMapStyle('opentopo')}
              className={`px-2 py-0.5 rounded transition-colors ${
                mapStyle === 'opentopo' ? 'bg-[#16697a] text-white font-medium' : 'text-[#2d3133]'
              }`}
            >
              Contours
            </button>
            <button
              onClick={() => setMapStyle('esri_imagery')}
              className={`px-2 py-0.5 rounded transition-colors ${
                mapStyle === 'esri_imagery' ? 'bg-[#16697a] text-white font-medium' : 'text-[#2d3133]'
              }`}
            >
              Imagery
            </button>
          </div>

          {/* Geographic Furniture: North Arrow (Top Left) */}
          <div className="absolute top-2.5 left-2.5 z-[500] bg-[#fcfbf9]/95 border border-[#dfdbd1] rounded px-2 py-1 flex items-center gap-1.5">
            <svg width="14" height="18" viewBox="0 0 20 28" fill="none">
              <polygon points="10,2 17,24 10,18" fill="#c8c5bc" />
              <polygon points="10,2 3,24 10,18" fill="#191c1d" />
              <polygon points="10,2 10,18 17,24" fill="#b82e2b" />
            </svg>
            <span className="text-[11px] text-[#5e6265] font-medium border-l border-[#dfdbd1] pl-1.5">
              {scenarioData.location_name}
            </span>
          </div>

          {/* Geographic Furniture: Cursor Coordinate Readout (Bottom Left) */}
          <div className="absolute bottom-2.5 left-2.5 z-[500] bg-[#fcfbf9]/95 border border-[#dfdbd1] rounded px-2 py-0.5 text-[11px] text-[#2d3133] tabular-nums">
            <span className="text-[#707477] mr-1">Cursor:</span>
            <span>{cursorCoord ? formatCoordinates(cursorCoord.lat, cursorCoord.lng) : formatCoordinates(currentTrue[0], currentTrue[1])}</span>
          </div>

          {/* Interactive Leaflet Map View */}
          <MapContainer
            center={scenarioData.map_center}
            zoom={scenarioData.default_zoom || 11}
            className="w-full h-full"
            style={{ background: '#e5e3db' }}
          >
            <AutoMapCenter
              center={scenarioData.map_center}
              zoom={scenarioData.default_zoom || 11}
            />
            <CursorTracker onMove={setCursorCoord} />
            <MapScale />

            {/* Keyless Cartographic Basemap */}
            <TileLayer
              key={mapStyle}
              url={activeBasemap.url}
              attribution={activeBasemap.attribution}
              maxZoom={activeBasemap.maxZoom || 19}
            />

            {/* Reference GIS Zones & Polygons */}
            {scenarioData.gis_polygons && scenarioData.gis_polygons.map((poly, idx) => (
              <Polygon
                key={idx}
                positions={poly.coords}
                pathOptions={{
                  color: poly.type === 'RESTRICTED_ZONE' ? '#b82e2b' : '#16697a',
                  fillColor: poly.type === 'RESTRICTED_ZONE' ? '#b82e2b' : '#16697a',
                  fillOpacity: 0.12,
                  weight: 1.5,
                  dashArray: poly.type === 'CORRIDOR' ? '4, 4' : null
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong>{poly.name}</strong> ({poly.type})
                  </div>
                </Popup>
              </Polygon>
            ))}

            {/* Trajectory: True Physical Path (Dark Forest Green) */}
            {truePath.length > 1 && (
              <Polyline
                positions={truePath}
                pathOptions={{
                  color: '#1d4e3e',
                  weight: 3.5,
                  opacity: 0.95
                }}
              />
            )}

            {/* Trajectory: Spoofed Path (Signal Red Dashed) */}
            {spoofedPath.length > 1 && isAttackActive && (
              <Polyline
                positions={spoofedPath}
                pathOptions={{
                  color: '#b82e2b',
                  weight: 2.5,
                  dashArray: '5, 5',
                  opacity: 0.95
                }}
              />
            )}

            {/* Trajectory: EKF Sensor Fusion Path (Deep Ocean Teal) */}
            {enableEkf && ekfPath.length > 1 && (
              <Polyline
                positions={ekfPath}
                pathOptions={{
                  color: '#16697a',
                  weight: 3,
                  opacity: 0.95
                }}
              />
            )}

            {/* Spoofer Origin Marker */}
            {scenarioData.spoofer_location && (
              <CircleMarker
                center={scenarioData.spoofer_location}
                radius={6}
                pathOptions={{
                  color: isAttackActive ? '#b82e2b' : '#5e6265',
                  fillColor: isAttackActive ? '#b82e2b' : '#c8c5bc',
                  fillOpacity: 0.9,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="text-[#b82e2b]">Terrestrial RF Spoofer Origin</strong>
                    <p className="text-[#5e6265]">Status: {isAttackActive ? 'Transmitting false GNSS signals' : 'Standby'}</p>
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* True Position Marker */}
            <CircleMarker
              center={currentTrue}
              radius={6}
              pathOptions={{
                color: '#1d4e3e',
                fillColor: '#1d4e3e',
                fillOpacity: 1.0,
                weight: 2
              }}
            >
              <Popup>
                <div className="text-xs">
                  <strong className="text-[#1d4e3e]">True Vehicle Location</strong><br />
                  {currentTrue[0].toFixed(5)}°N, {currentTrue[1].toFixed(5)}°E
                </div>
              </Popup>
            </CircleMarker>

            {/* Spoofed Ghost Location */}
            {isAttackActive && currentTelem.position_drift_m > 1.0 && (
              <CircleMarker
                center={currentSpoofed}
                radius={5}
                pathOptions={{
                  color: '#b82e2b',
                  fillColor: '#b82e2b',
                  fillOpacity: 0.85,
                  weight: 1.5
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="text-[#b82e2b]">Reported Spoofed GNSS Location</strong><br />
                    {currentSpoofed[0].toFixed(5)}°N, {currentSpoofed[1].toFixed(5)}°E
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* EKF Restored Marker */}
            {enableEkf && isAttackActive && (
              <CircleMarker
                center={currentEkf}
                radius={5}
                pathOptions={{
                  color: '#16697a',
                  fillColor: '#ffffff',
                  fillOpacity: 1.0,
                  weight: 2
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <strong className="text-[#16697a]">AEGIS EKF Filtered State</strong><br />
                    {currentEkf[0].toFixed(5)}°N, {currentEkf[1].toFixed(5)}°E
                  </div>
                </Popup>
              </CircleMarker>
            )}
          </MapContainer>

          {/* Cartographic Map Legend (Bottom Right) */}
          <div className="absolute bottom-2.5 right-20 z-[500] bg-[#fcfbf9]/95 border border-[#dfdbd1] rounded p-2 text-xs">
            <div className="font-semibold text-[#191c1d] text-[11px] border-b border-[#dfdbd1] pb-1 mb-1">
              Trajectory legend
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div className="survey-legend-item">
                <span className="survey-legend-swatch bg-[#1d4e3e]" />
                <span>Ground truth</span>
              </div>
              <div className="survey-legend-item">
                <span className="survey-legend-swatch bg-[#b82e2b]" />
                <span>Spoofed track</span>
              </div>
              <div className="survey-legend-item">
                <span className="survey-legend-swatch bg-[#16697a]" />
                <span>EKF recovered</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Telemetry Findings & Physical Layer Observables (~40% Width) */}
        <div className="lg:col-span-5 flex flex-col space-y-3">
          {/* Kinematic State with One Stated Finding */}
          <div className="bg-[#ffffff] border border-[#dfdbd1] p-3 rounded">
            <div className="flex items-baseline justify-between border-b border-[#eae7de] pb-1.5 mb-2">
              <h3 className="text-xs font-semibold text-[#191c1d]">
                Kinematic telemetry observations
              </h3>
              <span className="text-[11px] text-[#5e6265] tabular-nums">
                10 Hz sampling
              </span>
            </div>

            {/* Stated Analytical Finding (per taste-skill requirement) */}
            <p className="text-xs text-[#5e6265] mb-2.5 bg-[#f0eee7] p-2 rounded border border-[#dfdbd1]">
              {isAttackActive
                ? `Spoofed track diverges ${(currentTelem.position_drift_m / 1000).toFixed(2)} km by T=${currentEpoch}s (reported altitude ${(currentTelem.altitude_m).toFixed(0)}m).`
                : 'Vehicle adheres strictly to planned corridor with sub-meter position drift.'}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#fcfbf9] p-2 rounded border border-[#eae7de]">
                <span className="text-[11px] text-[#5e6265] block">Ground speed</span>
                <span className="text-sm font-semibold text-[#191c1d] tabular-nums block mt-0.5">
                  {currentTelem.speed.toFixed(1)} {currentTelem.speed_unit}
                </span>
              </div>
              <div className="bg-[#fcfbf9] p-2 rounded border border-[#eae7de]">
                <span className="text-[11px] text-[#5e6265] block">MSL altitude</span>
                <span className="text-sm font-semibold text-[#191c1d] tabular-nums block mt-0.5">
                  {currentTelem.altitude_m.toFixed(1)} m
                </span>
              </div>
              <div className="bg-[#fcfbf9] p-2 rounded border border-[#eae7de]">
                <span className="text-[11px] text-[#5e6265] block">True heading</span>
                <span className="text-sm font-semibold text-[#191c1d] tabular-nums block mt-0.5">
                  {currentTelem.heading_deg.toFixed(1)}°
                </span>
              </div>
              <div className="bg-[#fcfbf9] p-2 rounded border border-[#eae7de]">
                <span className="text-[11px] text-[#5e6265] block">Position drift</span>
                <span className={`text-sm font-semibold tabular-nums block mt-0.5 ${
                  currentTelem.position_drift_m > 10 ? 'text-[#b82e2b]' : 'text-[#1d4e3e]'
                }`}>
                  {currentTelem.position_drift_m.toFixed(1)} m
                </span>
              </div>
            </div>
          </div>

          {/* Physical Layer RF Metrics (C/N0, AGC, DoA Spatial Variance) */}
          <div className="bg-[#ffffff] border border-[#dfdbd1] p-3 rounded flex-1">
            <div className="flex items-baseline justify-between border-b border-[#eae7de] pb-1.5 mb-2">
              <h3 className="text-xs font-semibold text-[#191c1d]">
                Physical layer RF signature metrics
              </h3>
              <span className={`text-[11px] font-medium ${
                isAttackActive ? 'text-[#b82e2b]' : 'text-[#1d4e3e]'
              }`}>
                {isAttackActive ? 'RF anomaly flagged' : 'Nominal carrier'}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-[#eae7de]">
                <span className="text-[#5e6265]">Carrier-to-noise (C/N₀)</span>
                <span className={`font-semibold tabular-nums ${
                  isAttackActive ? 'text-[#b82e2b]' : 'text-[#1d4e3e]'
                }`}>
                  {currentTelem.inferred_cn0.toFixed(1)} dB-Hz
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#eae7de]">
                <span className="text-[#5e6265]">AGC front-end attenuation</span>
                <span className="font-semibold tabular-nums text-[#191c1d]">
                  {currentTelem.agc_attenuation_db.toFixed(1)} dB
                </span>
              </div>

              <div className="flex justify-between items-center py-1 border-b border-[#eae7de]">
                <span className="text-[#5e6265]">DoA azimuth spatial variance</span>
                <span className={`font-semibold tabular-nums ${
                  currentTelem.doa_azimuth_var < 5.0 ? 'text-[#b82e2b]' : 'text-[#1d4e3e]'
                }`}>
                  {currentTelem.doa_azimuth_var.toFixed(2)} deg²
                </span>
              </div>

              <div className="p-2 bg-[#fcfbf9] rounded border border-[#eae7de] text-[11px] text-[#5e6265] mt-2">
                <span className="font-semibold text-[#191c1d] block mb-0.5">Section 5 incident narrative</span>
                {scenarioData.narrative_phases && scenarioData.narrative_phases.map(np => {
                  const [pStart, pEnd] = np.epochs.split('-').map(Number);
                  const isCurrentPhase = currentEpoch >= pStart && currentEpoch <= pEnd;
                  return (
                    <div
                      key={np.phase}
                      className={`py-0.5 ${
                        isCurrentPhase ? 'text-[#191c1d] font-medium' : 'text-[#707477]'
                      }`}
                    >
                      <span className="tabular-nums">[{np.epochs}]:</span> {np.title} — {np.desc}
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
