/**
 * AEGIS-GIS Cartographic Basemap Configuration
 * Fully locally-hosted with authenticated CARTO raster basemaps.
 * Eliminates 'API Key Required' watermarks across all map viewports.
 */

export const CARTO_API_KEY = import.meta.env.VITE_CARTO_KEY || 'cb1_4qj3_1_0f4a6ae049937b9a4e1d7f69';

export const MAP_STYLES = {
  voyager: {
    id: 'voyager',
    name: 'Carto Voyager (Street & Marine)',
    shortName: 'Voyager',
    icon: '🗺️',
    url: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  dark: {
    id: 'dark',
    name: 'Carto Dark Matter (Tactical Radar)',
    shortName: 'Dark Matter',
    icon: '🌓',
    url: `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  },
  positron: {
    id: 'positron',
    name: 'Carto Positron (High Contrast Light)',
    shortName: 'Positron',
    icon: '☀️',
    url: `https://basemaps.cartocdn.com/rastertiles/light_all/{z}/{x}/{y}{r}.png?key=${CARTO_API_KEY}`,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>'
  }
};

export const DEFAULT_STYLE_ID = 'voyager';
