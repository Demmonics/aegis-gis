import React, { useEffect, useMemo, useState, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MAP_STYLES, DEFAULT_STYLE_ID } from '../services/mapConfig';

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

// Mouse coordinate tracker for live cursor readout
function CursorCoordinateTracker({ onMouseMove }) {
  useMapEvents({
    mousemove(e) {
      if (onMouseMove) {
        onMouseMove(e.latlng);
      }
    }
  });
  return null;
}

// Add native cartographic scale control
function ScaleControl() {
  const map = useMap();
  useEffect(() => {
    const scale = L.control.scale({
      position: 'bottomright',
      imperial: false,
      metric: true,
      maxWidth: 120
    });
    scale.addTo(map);
    return () => {
      scale.remove();
    };
  }, [map]);
  return null;
}

function formatCoords(lat, lon) {
  if (lat == null || lon == null) return '—';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  const absLat = Math.abs(lat);
  const absLon = Math.abs(lon);
  const latDeg = Math.floor(absLat);
  const latMin = ((absLat - latDeg) * 60).toFixed(2);
  const lonDeg = Math.floor(absLon);
  const lonMin = ((absLon - lonDeg) * 60).toFixed(2);
  return `${latDeg}° ${latMin}' ${latDir}, ${lonDeg}° ${lonMin}' ${lonDir}`;
}

function TacticalMapComponent({
  scenarioRun,
  currentEpoch = 0,
  selectedObservation = null,
  onSelectObservation = null
}) {
  const [mapStyle, setMapStyle] = useState(DEFAULT_STYLE_ID);
  const [cursorPos, setCursorPos] = useState(null);

  const meta = scenarioRun?.scenario_metadata;
  const centerLat = meta?.center_coords?.[1] || 54.68;
  const centerLon = meta?.center_coords?.[0] || 19.85;

  // Memoize path transformations unconditionally to respect React Hook rules
  const truePath = useMemo(() => (scenarioRun?.ground_truth_path || []).map(p => [p[1], p[0]]), [scenarioRun?.ground_truth_path]);
  const spoofedPath = useMemo(() => (scenarioRun?.reported_spoofed_path || []).map(p => [p[1], p[0]]), [scenarioRun?.reported_spoofed_path]);
  const ekfPath = useMemo(() => (scenarioRun?.ekf_recovered_path || []).map(p => [p[1], p[0]]), [scenarioRun?.ekf_recovered_path]);

  // Current epoch coordinates
  const curTrue = truePath[currentEpoch] || [centerLat, centerLon];
  const curSpoof = spoofedPath[currentEpoch] || [centerLat, centerLon];
  const curEkf = ekfPath[currentEpoch] || [centerLat, centerLon];

  // Parse reference GIS polygons
  const refFeatures = useMemo(() => scenarioRun?.gis_reference_geojson?.features || [], [scenarioRun?.gis_reference_geojson]);

  if (!scenarioRun) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#f0eee7] text-[#5e6265] text-sm">
        Initializing cartographic survey sheet...
      </div>
    );
  }

  const activeBasemap = MAP_STYLES[mapStyle] || MAP_STYLES.esri_topo;

  return (
    <div className="h-full w-full relative overflow-hidden border border-[#dfdbd1] bg-[#e5e3db]">
      {/* 1. Geographic Furniture: Map Style Switcher (Top Right) */}
      <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center bg-[#fcfbf9] border border-[#dfdbd1] rounded p-0.5 text-xs">
        <button
          onClick={() => setMapStyle('esri_topo')}
          className={`px-2.5 py-1 rounded transition-colors ${
            mapStyle === 'esri_topo'
              ? 'bg-[#16697a] text-white font-medium'
              : 'text-[#2d3133] hover:bg-[#f0eee7]'
          }`}
        >
          Survey Topo
        </button>
        <button
          onClick={() => setMapStyle('opentopo')}
          className={`px-2.5 py-1 rounded transition-colors ${
            mapStyle === 'opentopo'
              ? 'bg-[#16697a] text-white font-medium'
              : 'text-[#2d3133] hover:bg-[#f0eee7]'
          }`}
        >
          Contours
        </button>
        <button
          onClick={() => setMapStyle('esri_imagery')}
          className={`px-2.5 py-1 rounded transition-colors ${
            mapStyle === 'esri_imagery'
              ? 'bg-[#16697a] text-white font-medium'
              : 'text-[#2d3133] hover:bg-[#f0eee7]'
          }`}
        >
          Aerial Imagery
        </button>
      </div>

      {/* 2. Geographic Furniture: Cartographic North Arrow (Top Left) */}
      <div className="absolute top-2.5 left-2.5 z-[1000] bg-[#fcfbf9]/95 border border-[#dfdbd1] rounded px-2.5 py-1.5 flex items-center gap-2">
        <div className="flex flex-col items-center">
          <svg width="14" height="18" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="10,2 17,22 10,17" fill="#c8c5bc" />
            <polygon points="10,2 3,22 10,17" fill="#191c1d" />
            <polygon points="10,2 10,17 17,22" fill="#b82e2b" />
          </svg>
          <span className="text-[11px] font-bold text-[#191c1d] leading-none mt-0.5">N</span>
        </div>
        <div className="text-[11px] text-[#5e6265] leading-tight pl-1.5 border-l border-[#dfdbd1]">
          <span className="block text-[#191c1d] font-medium">WGS-84</span>
          <span>EPSG:4326</span>
        </div>
      </div>

      {/* 3. Geographic Furniture: Live Cursor Coordinate Readout (Bottom Left) */}
      <div className="absolute bottom-2.5 left-2.5 z-[1000] bg-[#fcfbf9]/95 border border-[#dfdbd1] rounded px-2.5 py-1 text-[11px] text-[#2d3133] tabular-nums">
        <span className="text-[#707477] mr-1.5">Cursor:</span>
        <span>{cursorPos ? formatCoords(cursorPos.lat, cursorPos.lng) : formatCoords(curTrue[0], curTrue[1])}</span>
      </div>

      <MapContainer
        center={[centerLat, centerLon]}
        zoom={meta.scenario_id === 'precision_ag_tractor' ? 18 : meta.scenario_id === 'uav_lidar_survey' ? 15 : 11}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <ChangeView
          center={[centerLat, centerLon]}
          zoom={meta.scenario_id === 'precision_ag_tractor' ? 18 : meta.scenario_id === 'uav_lidar_survey' ? 15 : 11}
        />
        <CursorCoordinateTracker onMouseMove={setCursorPos} />
        <ScaleControl />

        {/* Keyless Cartographic Basemap Layer */}
        <TileLayer
          key={activeBasemap.id}
          attribution={activeBasemap.attribution}
          url={activeBasemap.url}
          maxZoom={activeBasemap.maxZoom || 19}
        />

        {/* Reference GIS Polygons / Prohibited Zones */}
        {refFeatures.map((feat, idx) => {
          if (feat.geometry?.type === 'Polygon') {
            const coords = feat.geometry.coordinates[0].map(c => [c[1], c[0]]);
            const isDanger = feat.properties?.type === 'PROHIBITED_LAND_ZONE';
            return (
              <Polygon
                key={`ref-poly-${idx}`}
                positions={coords}
                pathOptions={{
                  color: isDanger ? '#b82e2b' : '#16697a',
                  fillColor: isDanger ? '#b82e2b' : '#16697a',
                  fillOpacity: isDanger ? 0.20 : 0.08,
                  weight: 1.5,
                  dashArray: isDanger ? '4, 4' : null
                }}
              >
                <Popup>
                  <div className="text-xs">
                    <p className="font-semibold text-[#191c1d]">{feat.properties?.name}</p>
                    <p className="text-[#5e6265] text-[11px]">{feat.properties?.type}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          }
          return null;
        })}

        {/* 1. Ground Truth Authentic Path (Dark Forest Green) */}
        <Polyline
          positions={truePath.slice(0, currentEpoch + 1)}
          pathOptions={{
            color: '#1d4e3e',
            weight: 3.5,
            opacity: 0.95
          }}
        />

        {/* 2. Reported Spoofed GNSS Track (Signal Survey Red) */}
        <Polyline
          positions={spoofedPath.slice(0, currentEpoch + 1)}
          pathOptions={{
            color: '#b82e2b',
            weight: 2.5,
            dashArray: '6, 5',
            opacity: 0.95
          }}
        />

        {/* 3. AEGIS EKF Recovered Path (Deep Ocean Teal) */}
        <Polyline
          positions={ekfPath.slice(0, currentEpoch + 1)}
          pathOptions={{
            color: '#16697a',
            weight: 3,
            opacity: 0.95
          }}
        />

        {/* Current Position Markers */}
        <CircleMarker
          center={curTrue}
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
              <strong className="text-[#1d4e3e]">True Vessel / Vehicle Position</strong><br />
              Lat: {curTrue[0].toFixed(5)}, Lon: {curTrue[1].toFixed(5)}
            </div>
          </Popup>
        </CircleMarker>

        <CircleMarker
          center={curSpoof}
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
              Lat: {curSpoof[0].toFixed(5)}, Lon: {curSpoof[1].toFixed(5)}
            </div>
          </Popup>
        </CircleMarker>

        <CircleMarker
          center={curEkf}
          radius={5}
          pathOptions={{
            color: '#16697a',
            fillColor: '#ffffff',
            fillOpacity: 1.0,
            weight: 2.5
          }}
        >
          <Popup>
            <div className="text-xs">
              <strong className="text-[#16697a]">AEGIS EKF Corrected Position</strong><br />
              Lat: {curEkf[0].toFixed(5)}, Lon: {curEkf[1].toFixed(5)}
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>

      {/* 4. Geographic Furniture: Formal Survey Map Legend */}
      <div className="absolute bottom-2.5 right-24 z-[990] bg-[#fcfbf9]/95 border border-[#dfdbd1] rounded p-2 text-xs">
        <div className="font-semibold text-[#191c1d] text-[11px] border-b border-[#dfdbd1] pb-1 mb-1.5">
          Cartographic legend
        </div>
        <div className="space-y-1">
          <div className="survey-legend-item">
            <span className="survey-legend-swatch bg-[#1d4e3e]" />
            <span>Ground truth trajectory</span>
          </div>
          <div className="survey-legend-item">
            <span className="survey-legend-swatch bg-[#b82e2b] border-b border-dashed border-[#b82e2b]" />
            <span>Reported spoofed track</span>
          </div>
          <div className="survey-legend-item">
            <span className="survey-legend-swatch bg-[#16697a]" />
            <span>AEGIS EKF recovered path</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const TacticalMap = React.memo(TacticalMapComponent);
export default TacticalMap;
