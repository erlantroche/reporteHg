/**
 * ReporteHg — tema "Eco" (verde claro, inspirado en el video de referencia).
 * Fondos claros, verdes de naturaleza, fotos de bosque, acento lima en botones secundarios.
 * El semáforo de riesgo y los estados Pendiente / Sincronizado se mantienen con alto contraste.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const palette = {
  page: '#F4F7F1',
  white: '#FFFFFF',
  mist: '#EEF4EA',
  sage: '#E2ECDD',
  leaf: '#C9DCC0',
  moss: '#8FB386',
  green: '#2E7D32',
  greenDark: '#1F5E24',
  forest: '#14261A',
  bark: '#3F5245',
  stone: '#66796B',
  pebble: '#8FA093',
  lime: '#E3F35B',
  limeDark: '#C9DB34',
  night: '#1E2420',
  /* compatibilidad con pantallas anteriores */
  steel: '#C9D6C3',
  mapGreen: '#2E7D32',
} as const;

export const surface = {
  floor: palette.page, // fondo de página
  panel: palette.white, // tarjetas
  raised: palette.mist, // paneles anidados / inputs
  overlay: palette.sage, // presionado / hover
  dark: palette.night, // footer / bandas oscuras
} as const;

export const ink = {
  heading: palette.forest,
  body: palette.bark,
  secondary: palette.stone,
  tertiary: palette.pebble,
  disabled: '#B5C2B8',
  /** Texto sobre colores sólidos (botón verde, badges de riesgo). */
  onSolid: '#FFFFFF',
  /** Texto sobre el acento lima. */
  onLime: '#1B2A10',
  /** Texto claro sobre fotos o bandas oscuras. */
  onImage: '#FFFFFF',
  onImageSoft: 'rgba(255,255,255,0.86)',
} as const;

export const line = {
  subtle: '#E3EADF',
  muted: '#D2DDCC',
  ghost: '#BFCDB8',
  pill: palette.green,
} as const;

export const accent = {
  primary: palette.green,
  pressed: palette.greenDark,
  soft: 'rgba(46, 125, 50, 0.10)',
  border: 'rgba(46, 125, 50, 0.35)',
  lime: palette.lime,
  limePressed: palette.limeDark,
} as const;

export type Tone = { solid: string; text: string; soft: string; border: string };

export const riskTone: Record<'bajo' | 'medio' | 'alto', Tone> = {
  alto: { solid: '#DC2626', text: '#B91C1C', soft: '#FEE2E2', border: '#FCA5A5' },
  medio: { solid: '#D97706', text: '#B45309', soft: '#FEF3C7', border: '#FCD34D' },
  bajo: { solid: '#16A34A', text: '#15803D', soft: '#DCFCE7', border: '#86EFAC' },
};

export const statusTone: Record<'pendiente' | 'sincronizado', Tone> = {
  pendiente: { solid: '#D97706', text: '#B45309', soft: '#FEF3C7', border: '#FBBF24' },
  sincronizado: { solid: '#15803D', text: '#166534', soft: '#DCFCE7', border: '#4ADE80' },
};

export const radius = { badge: 6, input: 12, chip: 14, panel: 18, card: 24, pill: 100 } as const;

export const space = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48, s64: 64, s96: 96 } as const;

export const layout = { maxWidth: 760, pageMaxWidth: 1200 } as const;

/** Sombras suaves (boxShadow funciona en web y en la nueva arquitectura de React Native). */
export const shadow = {
  card: { boxShadow: '0px 10px 30px rgba(20, 38, 26, 0.08)' },
  float: { boxShadow: '0px 24px 60px rgba(20, 38, 26, 0.18)' },
  glow: { boxShadow: '0px 8px 24px rgba(46, 125, 50, 0.35)' },
} satisfies Record<string, ViewStyle>;

export const fontFamily = Platform.select<string | undefined>({
  web: 'Inter, "DM Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

export const type = {
  caption: { fontFamily, fontSize: 10, lineHeight: 14, letterSpacing: 0.8, fontWeight: '700', textTransform: 'uppercase' },
  eyebrow: { fontFamily, fontSize: 12, lineHeight: 16, letterSpacing: 0.2, fontWeight: '600' },
  bodySm: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  body: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontFamily, fontSize: 15, lineHeight: 20, fontWeight: '600' },
  subheading: { fontFamily, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  headingSm: { fontFamily, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.4 },
  heading: { fontFamily, fontSize: 32, lineHeight: 38, fontWeight: '800', letterSpacing: -0.8 },
  display: { fontFamily, fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1.2 },
  data: { fontFamily, fontWeight: '800', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;
