import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Polygon, CircleMarker, Popup, useMap } from 'react-leaflet';

function ChangeView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.setView(center, zoom, { animate: true });
    }
  }, [center, zoom, map]);
  return null;
}

export default function TacticalMap({
  scenarioRun,
  currentEpoch = 0,
  selectedObservation = null,
  onSelectObservation = null
}) {
  if (!scenarioRun) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-950 text-slate-500 font-mono text-sm">
        Initializing Tactical Cartographic WebGIS...
      </div>
    );
  }

  const meta = scenarioRun.scenario_metadata;
  const centerLat = meta.center_coords[1];
  const centerLon = meta.center_coords[0];

  // Leaflet uses [lat, lon], paths are stored as [[lon, lat], ...]
  const truePath = (scenarioRun.ground_truth_path || []).map(p => [p[1], p[0]]);
  const spoofedPath = (scenarioRun.reported_spoofed_path || []).map(p => [p[1], p[0]]);
  const ekfPath = (scenarioRun.ekf_recovered_path || []).map(p => [p[1], p[0]]);

  // Current epoch points
  const curTrue = truePath[currentEpoch] || [centerLat, centerLon];
  const curSpoof = spoofedPath[currentEpoch] || [centerLat, centerLon];
  const curEkf = ekfPath[currentEpoch] || [centerLat, centerLon];

  // Parse reference GIS polygons
  const refFeatures = scenarioRun.gis_reference_geojson?.features || [];

  return (
    <div className="h-full w-full relative rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
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

        {/* High-Contrast CartoDB Dark Matter Basemap */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 1. Reference GIS Polygons */}
        {refFeatures.map((feat, idx) => {
          if (feat.geometry?.type === 'Polygon') {
            const coords = feat.geometry.coordinates[0].map(c => [c[1], c[0]]);
            const isDanger = feat.properties?.type === 'PROHIBITED_LAND_ZONE';
            return (
              <Polygon
                key={`ref-poly-${idx}`}
                positions={coords}
                pathOptions={{
                  color: isDanger ? '#ef4444' : '#06b6d4',
                  fillColor: isDanger ? '#ef4444' : '#06b6d4',
                  fillOpacity: isDanger ? 0.25 : 0.12,
                  weight: 2,
                  dashArray: isDanger ? '4, 4' : null
                }}
              >
                <Popup>
                  <div className="text-xs font-sans">
                    <p className="font-bold text-white">{feat.properties?.name}</p>
                    <p className="text-slate-400 text-[11px]">{feat.properties?.type}</p>
                  </div>
                </Popup>
              </Polygon>
            );
          }
          return null;
        })}

        {/* 2. Trajectory Polylines */}
        {/* Green: Ground Truth */}
        <Polyline
          positions={truePath}
          pathOptions={{ color: '#10b981', weight: 2.5, opacity: 0.8 }}
        />

        {/* Red Dashed: Reported Spoofed GNSS Track */}
        <Polyline
          positions={spoofedPath}
          pathOptions={{ color: '#ef4444', weight: 3, opacity: 0.85, dashArray: '6, 8' }}
        />

        {/* Cyan: AEGIS EKF Reconstructed Track */}
        <Polyline
          positions={ekfPath}
          pathOptions={{ color: '#06b6d4', weight: 3.5, opacity: 0.95 }}
        />

        {/* 3. Real-Time Scrubber Position Markers */}
        {/* Green dot: True Physical Position */}
        <CircleMarker
          center={curTrue}
          radius={5}
          pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 1 }}
        >
          <Popup>
            <div className="text-xs">
              <span className="font-bold text-emerald-400">Ground Truth Position</span><br />
              Lat: {curTrue[0].toFixed(6)}° | Lon: {curTrue[1].toFixed(6)}°
            </div>
          </Popup>
        </CircleMarker>

        {/* Red pulse: Spoofed GNSS Fix */}
        <CircleMarker
          center={curSpoof}
          radius={8}
          pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.8, weight: 2 }}
        >
          <Popup>
            <div className="text-xs font-mono space-y-1">
              <p className="font-bold text-red-400 flex items-center justify-between">
                <span>⚠️ Corrupted GNSS Fix</span>
                <span className="text-[10px] bg-red-500/20 px-1 py-0.5 rounded">Epoch {currentEpoch}</span>
              </p>
              <p className="text-slate-300">Lat: {curSpoof[0].toFixed(6)}°</p>
              <p className="text-slate-300">Lon: {curSpoof[1].toFixed(6)}°</p>
              <p className="text-amber-400 text-[11px] font-sans">
                {currentEpoch >= meta.attack_start_epoch
                  ? `Spoofing Active: Pull-off offset from true path!`
                  : `Authentic multi-constellation lock`}
              </p>
            </div>
          </Popup>
        </CircleMarker>

        {/* Cyan pulse: EKF Recovered Fix */}
        <CircleMarker
          center={curEkf}
          radius={7}
          pathOptions={{ color: '#06b6d4', fillColor: '#06b6d4', fillOpacity: 0.9, weight: 2 }}
        >
          <Popup>
            <div className="text-xs font-mono space-y-1">
              <p className="font-bold text-cyan-400 flex items-center justify-between">
                <span>🛡️ AEGIS EKF Restored Fix</span>
                <span className="text-[10px] bg-cyan-500/20 px-1 py-0.5 rounded">Sec 6.4 Sensor Fusion</span>
              </p>
              <p className="text-slate-300">Lat: {curEkf[0].toFixed(6)}°</p>
              <p className="text-slate-300">Lon: {curEkf[1].toFixed(6)}°</p>
              <p className="text-emerald-400 text-[11px] font-sans">
                INS strapdown dead-reckoning maintains true vessel/platform heading.
              </p>
            </div>
          </Popup>
        </CircleMarker>
      </MapContainer>

      {/* Floating Tactical Cartographic Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 border border-slate-800 rounded-lg p-3 backdrop-blur-md shadow-xl text-[11px] font-mono space-y-1.5">
        <div className="font-bold text-white uppercase tracking-wider text-[10px] border-b border-slate-800 pb-1 flex items-center justify-between gap-4">
          <span>Map Symbology</span>
          <span className="text-cyan-400">EPSG:4326</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-emerald-500 rounded"></span>
          <span className="text-slate-300">Ground Truth Trajectory</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-red-500 border-b border-dashed border-red-300"></span>
          <span className="text-slate-300">Reported Spoofed GNSS Track</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-1 bg-cyan-500 rounded shadow-sm shadow-cyan-500"></span>
          <span className="text-slate-300">AEGIS EKF Recovered Path</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-2 bg-red-500/30 border border-red-500 rounded-sm"></span>
          <span className="text-slate-300">Prohibited Land / Airport Runway</span>
        </div>
      </div>
    </div>
  );
}
