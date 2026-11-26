/**
 * Georreferencia y cuadrícula de interpolación para el mapa.
 *
 * - No modifica src/data/mocks.ts: las coordenadas de cada zona viven aquí, por id.
 * - La cuadrícula usa IDW (ponderación por inverso de la distancia, w = 1 / d²),
 *   el mismo método de los apuntes del equipo. Es una DEMO visual: cuando el motor
 *   estadístico (Héctor / Erwin) entregue su cuadrícula, se reemplaza buildRiskGrid
 *   por esos valores y el mapa sigue funcionando igual.
 */
import { riskTone } from '../constants/hg-theme';
import { RiskLevel, RiskZone } from './mocks';

export type MapLayer = 'peligro' | 'riesgo' | 'incertidumbre';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Umbral de referencia para la capa de peligro (mg/kg). Ajustable por el equipo. */
export const HG_THRESHOLD_MG_KG = 0.5;

/** Ubicaciones demo (referenciales) en la zona aurífera de Guanay, norte de La Paz. */
export const ZONE_COORDS: Record<string, LatLng> = {
  'z-1': { lat: -15.462, lng: -67.905 },
  'z-2': { lat: -15.505, lng: -67.872 },
  'z-3': { lat: -15.585, lng: -67.985 },
};

export const DEFAULT_CENTER: LatLng = { lat: -15.515, lng: -67.92 };

export function zoneCoord(zone: RiskZone, index: number): LatLng {
  return (
    ZONE_COORDS[zone.id] ?? {
      lat: DEFAULT_CENTER.lat + 0.03 * Math.cos(index * 2.1),
      lng: DEFAULT_CENTER.lng + 0.03 * Math.sin(index * 2.1),
    }
  );
}

const RISK_INDEX: Record<RiskLevel, number> = { alto: 1, medio: 0.55, bajo: 0.1 };

/** Distancia aproximada en km entre dos puntos (haversine). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

function erf(x: number): number {
  // Aproximación de Abramowitz-Stegun (error < 1.5e-7).
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const y =
    1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return sign * y;
}

/** Probabilidad (0–1) de que el Hg real supere el umbral, con incertidumbre relativa. */
export function probabilityAboveThreshold(meanMgKg: number, relUncertainty: number, threshold = HG_THRESHOLD_MG_KG) {
  const sd = Math.max(1e-6, meanMgKg * Math.max(relUncertainty, 0.02));
  const z = (threshold - meanMgKg) / (sd * Math.SQRT2);
  return Math.min(1, Math.max(0, 0.5 * (1 - erf(z))));
}

export interface PointEstimate {
  hgMgKg: number;
  uncertainty: number;
  probability: number;
  riskIndex: number;
  riskLevel: RiskLevel;
  nearestKm: number;
}

export function classifyRisk(index: number): RiskLevel {
  if (index >= 0.66) return 'alto';
  if (index >= 0.33) return 'medio';
  return 'bajo';
}

/** Estimación IDW en un punto a partir de las zonas medidas. */
export function estimateAt(point: LatLng, zones: RiskZone[]): PointEstimate {
  let wSum = 0;
  let hg = 0;
  let unc = 0;
  let risk = 0;
  let nearest = Infinity;

  zones.forEach((zone, i) => {
    const d = Math.max(0.15, distanceKm(point, zoneCoord(zone, i)));
    nearest = Math.min(nearest, d);
    const w = 1 / (d * d);
    wSum += w;
    hg += w * zone.estimatedHgMgKg;
    unc += w * zone.uncertainty;
    risk += w * RISK_INDEX[zone.riskLevel];
  });

  const hgMgKg = wSum ? hg / wSum : 0;
  // Más lejos de las muestras ⇒ más incertidumbre (hasta +0.6 a ~12 km).
  const uncertainty = Math.min(1, (wSum ? unc / wSum : 1) + 0.6 * Math.min(1, nearest / 12));
  const riskIndex = wSum ? risk / wSum : 0;

  return {
    hgMgKg,
    uncertainty,
    probability: probabilityAboveThreshold(hgMgKg, uncertainty),
    riskIndex,
    riskLevel: classifyRisk(riskIndex),
    nearestKm: nearest,
  };
}

export interface GridCell {
  lat0: number;
  lng0: number;
  lat1: number;
  lng1: number;
  color: string;
  opacity: number;
}

/** Escala de mercurio: de plata clara (poco probable) a pizarra oscura (muy probable). */
const HAZARD_RAMP = ['#D5DADE', '#A3ACB4', '#6B7785', '#36414E'];
const UNCERTAIN_COLOR = '#8B8F87';

export function hazardColor(probability: number): string {
  if (probability >= 0.75) return HAZARD_RAMP[3];
  if (probability >= 0.5) return HAZARD_RAMP[2];
  if (probability >= 0.25) return HAZARD_RAMP[1];
  return HAZARD_RAMP[0];
}

export const HAZARD_LEGEND = HAZARD_RAMP;

/** Cuadrícula de colores para la capa elegida ("cuadro por cuadro", como en los apuntes). */
export function buildRiskGrid(zones: RiskZone[], layer: MapLayer, cellsAcross = 30, maxDistanceKm = 16): GridCell[] {
  if (!zones.length) return [];
  const coords = zones.map(zoneCoord);
  const pad = 0.09;
  const minLat = Math.min(...coords.map((c) => c.lat)) - pad;
  const maxLat = Math.max(...coords.map((c) => c.lat)) + pad;
  const minLng = Math.min(...coords.map((c) => c.lng)) - pad;
  const maxLng = Math.max(...coords.map((c) => c.lng)) + pad;
  const step = Math.max(maxLat - minLat, maxLng - minLng) / cellsAcross;

  const cells: GridCell[] = [];
  for (let lat = minLat; lat < maxLat; lat += step) {
    for (let lng = minLng; lng < maxLng; lng += step) {
      const center = { lat: lat + step / 2, lng: lng + step / 2 };
      const est = estimateAt(center, zones);
      if (est.nearestKm > maxDistanceKm) continue;
      const fade = 1 - Math.min(1, est.nearestKm / maxDistanceKm) * 0.6;

      let color: string;
      let opacity: number;
      if (layer === 'riesgo') {
        color = riskTone[est.riskLevel].solid;
        opacity = 0.42 * fade;
      } else if (layer === 'peligro') {
        color = hazardColor(est.probability);
        opacity = (0.3 + 0.45 * est.probability) * fade;
      } else {
        color = UNCERTAIN_COLOR;
        opacity = 0.08 + 0.55 * est.uncertainty;
      }
      cells.push({ lat0: lat, lng0: lng, lat1: lat + step, lng1: lng + step, color, opacity });
    }
  }
  return cells;
}

/** Puntos para encuadrar el mapa en las zonas. */
export function zonesBounds(zones: RiskZone[]): LatLng[] {
  return zones.map(zoneCoord);
}
