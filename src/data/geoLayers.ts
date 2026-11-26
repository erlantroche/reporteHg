/**
 * Capas geográficas preparadas en QGIS (qgis/preparar_capas.py).
 * Los archivos .json de src/data/geo/ son copias de assets/geo/*.geojson
 * (el script de QGIS las actualiza solo cada vez que se vuelve a ejecutar).
 * Fuente: © OpenStreetMap contributors (ODbL).
 */
import type { MapGeoLayer, MapGeoStyle } from '../components/map/mapBridge';

export interface GeoLayerDef {
  id: string;
  name: string;
  short: string;
  group: 'Agua' | 'Exposición' | 'Vulnerabilidad' | 'Minería' | 'Contexto';
  kind: MapGeoLayer['kind'];
  style: MapGeoStyle;
  defaultVisible: boolean;
  data: { features?: unknown[] };
}

/* eslint-disable @typescript-eslint/no-require-imports */
export const GEO_LAYER_DEFS: GeoLayerDef[] = [
  {
    id: 'cuerpos_agua',
    name: 'Cuerpos de agua',
    short: 'Agua',
    group: 'Agua',
    kind: 'polygon',
    style: { color: '#4A90D9', weight: 0.6, fillColor: '#6FB1F0', fillOpacity: 0.55 },
    defaultVisible: true,
    data: require('./geo/cuerpos_agua.json'),
  },
  {
    id: 'rios',
    name: 'Ríos principales',
    short: 'Ríos',
    group: 'Agua',
    kind: 'line',
    style: { color: '#1E78D2', weight: 2.6, opacity: 0.9 },
    defaultVisible: true,
    data: require('./geo/rios.json'),
  },
  {
    id: 'quebradas',
    name: 'Quebradas y arroyos',
    short: 'Quebradas',
    group: 'Agua',
    kind: 'line',
    style: { color: '#5DA4E8', weight: 1.1, opacity: 0.85 },
    defaultVisible: false,
    data: require('./geo/quebradas.json'),
  },
  {
    id: 'mineria_areas',
    name: 'Áreas mineras (OSM)',
    short: 'Áreas mineras',
    group: 'Minería',
    kind: 'polygon',
    style: { color: '#9333EA', weight: 1.2, fillColor: '#A855F7', fillOpacity: 0.3 },
    defaultVisible: true,
    data: require('./geo/mineria_areas.json'),
  },
  {
    id: 'mineria_puntos',
    name: 'Bocaminas y puntos mineros',
    short: 'Bocaminas',
    group: 'Minería',
    kind: 'point',
    style: { color: '#9333EA', radius: 5 },
    defaultVisible: true,
    data: require('./geo/mineria_puntos.json'),
  },
  {
    id: 'poblados',
    name: 'Poblados y comunidades',
    short: 'Poblados',
    group: 'Exposición',
    kind: 'point',
    style: { color: '#14261A', radius: 3.8 },
    defaultVisible: true,
    data: require('./geo/poblados.json'),
  },
  {
    id: 'escuelas_salud',
    name: 'Escuelas y centros de salud',
    short: 'Escuelas/Salud',
    group: 'Vulnerabilidad',
    kind: 'point',
    style: { color: '#D97706', radius: 4.5 },
    defaultVisible: false,
    data: require('./geo/escuelas_salud.json'),
  },
  {
    id: 'caminos',
    name: 'Caminos principales',
    short: 'Caminos',
    group: 'Contexto',
    kind: 'line',
    style: { color: '#7A6A58', weight: 1.4, opacity: 0.8, dash: '5 4' },
    defaultVisible: false,
    data: require('./geo/caminos.json'),
  },
];
/* eslint-enable @typescript-eslint/no-require-imports */

/** Capas listas para enviar al mapa (referencia estable: se crea una sola vez). */
export const MAP_GEO_LAYERS: MapGeoLayer[] = GEO_LAYER_DEFS.map((d) => ({
  id: d.id,
  name: d.name,
  kind: d.kind,
  data: d.data,
  style: d.style,
}));

export const DEFAULT_VISIBLE_LAYERS = GEO_LAYER_DEFS.filter((d) => d.defaultVisible).map((d) => d.id);

export function featureCount(def: GeoLayerDef): number {
  return Array.isArray(def.data?.features) ? def.data.features.length : 0;
}

export const GEO_ATTRIBUTION = '© OpenStreetMap contributors · capas preparadas en QGIS';
