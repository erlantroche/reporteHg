import AsyncStorage from '@react-native-async-storage/async-storage';
import { CitizenReport, INITIAL_REPORTS, ReportType } from '../data/mocks';

const STORAGE_KEY = '@reportehg_reports_v1';

export async function loadReports(): Promise<CitizenReport[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_REPORTS));
      return INITIAL_REPORTS;
    }
    return JSON.parse(raw) as CitizenReport[];
  } catch {
    return INITIAL_REPORTS;
  }
}

export async function addOfflineReport(input: {
  type: ReportType;
  description: string;
  department?: string;
  municipalityOrCommunity?: string;
  machineryOrActor?: string;
  isAnonymous?: boolean;
  optionalContact?: string;
  latitude?: number;
  longitude?: number;
  photoUri?: string;
}): Promise<CitizenReport[]> {
  const current = await loadReports();
  const newReport: CitizenReport = {
    id: `rep-${Date.now()}`,
    type: input.type,
    description: input.description.trim() || 'Aviso registrado en campo sin detalle adicional.',
    department: input.department ?? 'La Paz',
    municipalityOrCommunity: input.municipalityOrCommunity ?? 'Por confirmar en campo',
    machineryOrActor: input.machineryOrActor,
    isAnonymous: input.isAnonymous ?? true,
    optionalContact: input.optionalContact,
    latitude: input.latitude ?? -16.5,
    longitude: input.longitude ?? -68.15,
    photoUri: input.photoUri,
    createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    status: 'pendiente',
  };
  const updated = [newReport, ...current];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function syncPendingReports(): Promise<CitizenReport[]> {
  const current = await loadReports();
  const synced = current.map((r) => ({ ...r, status: 'sincronizado' as const }));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
  return synced;
}
