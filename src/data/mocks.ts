export type ReportType = 'draga' | 'agua_turbia' | 'quema_amalgama' | 'peces_muertos';
export type RiskLevel = 'bajo' | 'medio' | 'alto';

export interface RiskZone {
  id: string;
  name: string;
  riverOrArea: string;
  estimatedHgMgKg: number;
  uncertainty: number;
  exposureScore: number;
  vulnerabilityScore: number;
  riskLevel: RiskLevel;
}

export interface CitizenReport {
  id: string;
  type: ReportType;
  description: string;
  department: string;
  municipalityOrCommunity: string;
  machineryOrActor?: string;
  isAnonymous: boolean;
  optionalContact?: string;
  latitude: number;
  longitude: number;
  photoUri?: string;
  createdAt: string;
  status: 'pendiente' | 'sincronizado';
}

export const INITIAL_RISK_ZONES: RiskZone[] = [
  {
    id: 'z-1',
    name: 'Tramo Río Alto — Sector A',
    riverOrArea: 'Cuenca aluvial / Concesión Norte',
    estimatedHgMgKg: 0.65,
    uncertainty: 0.25,
    exposureScore: 0.8,
    vulnerabilityScore: 0.7,
    riskLevel: 'alto',
  },
  {
    id: 'z-2',
    name: 'Ribera Media — Toma comunal',
    riverOrArea: 'Red de ríos / Zona de pesca',
    estimatedHgMgKg: 0.28,
    uncertainty: 0.45,
    exposureScore: 0.6,
    vulnerabilityScore: 0.5,
    riskLevel: 'medio',
  },
  {
    id: 'z-3',
    name: 'Sector Aguas Arriba',
    riverOrArea: 'Referencia con baja intervención',
    estimatedHgMgKg: 0.08,
    uncertainty: 0.15,
    exposureScore: 0.2,
    vulnerabilityScore: 0.3,
    riskLevel: 'bajo',
  },
];

export const INITIAL_REPORTS: CitizenReport[] = [
  {
    id: 'rep-init-1',
    type: 'agua_turbia',
    description: 'Turbidez repentina y espuma cerca de zona de lavado.',
    department: 'La Paz',
    municipalityOrCommunity: 'Guanay / Ribera del río',
    machineryOrActor: 'Bomba y canaleta artesanal',
    isAnonymous: true,
    latitude: -16.5,
    longitude: -68.15,
    createdAt: '2026-11-25 10:15',
    status: 'sincronizado',
  },
];

export const RAG_MOCK_ANSWERS: Record<string, string> = {
  quema: 'Evita quemar amalgama en espacios cerrados o cerca de viviendas. Usa retorta o puntos ventilados alejados de niños y zonas de preparación de alimentos.',
  pescado: 'En zonas con alerta alta o agua turbia, prioriza especies de menor tamaño y consulta los avisos locales antes del consumo frecuente.',
  default: 'Consulta medidas de prevención, síntomas asociados a exposición y qué hacer ante un vertido o quema. (Modo demo conectado a base de conocimiento RAG).',
};
