/**
 * AEGIS-GIS Cartographic Basemap Configuration
 * Keyless, reliable cartographic basemaps for survey-agency & national-atlas aesthetic.
 * 100% keyless: Esri World Topo, OpenTopoMap, OpenStreetMap, Esri Imagery & OpenSeaMap.
 */

export const MAP_STYLES = {
  esri_topo: {
    id: 'esri_topo',
    name: 'National Topographic Survey (Esri)',
    shortName: 'Survey Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; USGS, NOAA, Esri, DeLorme, NAVTEQ',
    maxZoom: 19
  },
  opentopo: {
    id: 'opentopo',
    name: 'Topographic Contours (OpenTopoMap)',
    shortName: 'Contours',
    url: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA), &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 17
  },
  osm_standard: {
    id: 'osm_standard',
    name: 'OpenStreetMap Cartographic',
    shortName: 'Cartographic',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  },
  esri_imagery: {
    id: 'esri_imagery',
    name: 'Aerial Survey Imagery (Esri World)',
    shortName: 'Aerial Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; USDA, USGS, AEX, GeoEye, Getmapping',
    maxZoom: 19
  }
};

export const DEFAULT_STYLE_ID = 'esri_topo';
export const OPENSEAMAP_OVERLAY_URL = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';
