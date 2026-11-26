import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CitizenReport, ReportType } from '../data/mocks';

type MciName = keyof typeof MaterialCommunityIcons.glyphMap;

export const REPORT_TYPES: { id: ReportType; label: string; icon: MciName; hint: string }[] = [
  { id: 'draga', label: 'Draga', icon: 'ferry', hint: 'Balsa o draga sacando material del río' },
  { id: 'agua_turbia', label: 'Agua turbia', icon: 'water-alert', hint: 'Agua café, espuma o mancha extraña' },
  { id: 'quema_amalgama', label: 'Quema de amalgama', icon: 'fire', hint: 'Humo al quemar mercurio con oro' },
  { id: 'peces_muertos', label: 'Peces muertos', icon: 'fish-off', hint: 'Peces flotando o muertos en la orilla' },
];

export function reportTypeInfo(type: ReportType) {
  return REPORT_TYPES.find((t) => t.id === type);
}

export function reportTypeLabel(report: Pick<CitizenReport, 'type'>): string {
  return reportTypeInfo(report.type)?.label ?? report.type;
}
