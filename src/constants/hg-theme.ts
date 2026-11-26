/**
 * MercurIA — dirección visual "El río lo cuenta".
 * Colores tomados del territorio: agua café del río, selva, mercurio plateado y arena de playa.
 * Tipografía: Archivo Narrow (títulos y cifras, carácter de señalética) + Archivo (texto).
 * El rojo de alerta se usa solo para riesgo alto.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const palette = {
  selva: '#173326',
  selvaSoft: '#24473A',
  rio: '#8A6A43',
  rioLight: '#B08A5A',
  mercurio: '#C3C9CE',
  mercurioLight: '#DDE2E6',
  arena: '#E6DCCB',
  arenaDark: '#D3C4AA',
  white: '#FFFFFF',
  alerta: '#C8321E',
  /* compatibilidad con componentes anteriores */
  page: '#E6DCCB',
  green: '#173326',
  steel: '#BDAF95',
  mapGreen: '#3E7A46',
} as const;

/** Nombres de las fuentes cargadas en _layout (expo-google-fonts). */
export const FONT = {
  text: 'Archivo_400Regular',
  textSemi: 'Archivo_600SemiBold',
  textBold: 'Archivo_700Bold',
  narrow: 'ArchivoNarrow_500Medium',
  narrowSemi: 'ArchivoNarrow_600SemiBold',
  narrowBold: 'ArchivoNarrow_700Bold',
} as const;

export const surface = {
  floor: palette.arena,
  panel: palette.white,
  raised: '#F1EBDF',
  overlay: '#E9E0CF',
  dark: palette.selva,
} as const;

export const ink = {
  heading: palette.selva,
  body: '#33443A',
  secondary: '#5A6459',
  tertiary: '#857D6B',
  disabled: '#B5AA95',
  onSolid: '#FFFFFF',
  onLime: '#FFFFFF',
  onImage: palette.arena,
  onImageSoft: 'rgba(230, 220, 203, 0.78)',
  onDark: palette.arena,
  onDarkSoft: 'rgba(230, 220, 203, 0.72)',
} as const;

export const line = {
  subtle: '#DDD2BF',
  muted: '#CDBFA6',
  ghost: '#B9AA8E',
  pill: palette.selva,
} as const;

export const accent = {
  primary: palette.selva,
  pressed: '#0F241A',
  soft: 'rgba(23, 51, 38, 0.07)',
  border: 'rgba(23, 51, 38, 0.28)',
  /** Acción secundaria: color del río. */
  lime: palette.rio,
  limePressed: '#6F5434',
  rio: palette.rio,
} as const;

export type Tone = { solid: string; text: string; soft: string; border: string };

/** Semáforo de riesgo. */
export const riskTone: Record<'bajo' | 'medio' | 'alto', Tone> = {
  alto: { solid: palette.alerta, text: '#A3260F', soft: '#F6DDD5', border: '#E3A08F' },
  medio: { solid: '#C98A1B', text: '#8A5B07', soft: '#F5E6C6', border: '#E0BE79' },
  bajo: { solid: '#3E7A46', text: '#2C5C33', soft: '#DCE9D6', border: '#9DC39F' },
};

export const statusTone: Record<'pendiente' | 'sincronizado', Tone> = {
  pendiente: { solid: '#C98A1B', text: '#8A5B07', soft: '#F5E6C6', border: '#D9AE59' },
  sincronizado: { solid: '#3E7A46', text: '#2C5C33', soft: '#DCE9D6', border: '#7FAE83' },
};

/** Radios pequeños y con jerarquía: mapa/foto 4, botones y campos 6, chips de estado redondos. */
export const radius = { badge: 4, input: 6, chip: 6, panel: 6, card: 8, pill: 999 } as const;

export const space = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40, s48: 48, s64: 64, s96: 96 } as const;

export const layout = { maxWidth: 760, pageMaxWidth: 1180 } as const;

/** Sin sombras decorativas: la profundidad viene del color de fondo y de líneas finas. */
export const shadow = {
  card: {},
  float: {},
  glow: {},
} satisfies Record<string, ViewStyle>;

export const fontFamily = Platform.select<string | undefined>({ default: FONT.text });

export const type = {
  caption: { fontFamily: FONT.textSemi, fontSize: 12, lineHeight: 16 },
  eyebrow: { fontFamily: FONT.textSemi, fontSize: 13, lineHeight: 18 },
  bodySm: { fontFamily: FONT.text, fontSize: 14, lineHeight: 21 },
  body: { fontFamily: FONT.text, fontSize: 16, lineHeight: 25 },
  label: { fontFamily: FONT.textSemi, fontSize: 15, lineHeight: 20 },
  subheading: { fontFamily: FONT.narrowSemi, fontSize: 21, lineHeight: 25 },
  headingSm: { fontFamily: FONT.narrowBold, fontSize: 28, lineHeight: 31 },
  heading: { fontFamily: FONT.narrowBold, fontSize: 40, lineHeight: 42, letterSpacing: -0.4 },
  display: { fontFamily: FONT.narrowBold, fontSize: 56, lineHeight: 56, letterSpacing: -0.8 },
  data: { fontFamily: FONT.narrowSemi, fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;
