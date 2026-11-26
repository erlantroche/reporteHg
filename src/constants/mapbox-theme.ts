/**
 * MercurIA — tokens de diseño basados en la referencia "Mapbox" (Refero).
 * Estética: consola cartográfica oscura, un solo acento azul (Signal Blue)
 * para acciones y estados activos. Los colores de semáforo de riesgo y de
 * estado de sincronización son colores de DATO (no decorativos) y se
 * mantienen por requerimiento del producto.
 */
import { Platform, TextStyle } from 'react-native';

export const palette = {
  voidBlack: '#0e1012',
  deepCharcoal: '#15171b',
  gunmetal: '#1c1f24',
  graphite: '#23262d',
  steel: '#333943',
  pewter: '#444d5a',
  slate: '#566171',
  ash: '#8b96aa',
  fog: '#a0aaba',
  silver: '#bbc2ce',
  cloud: '#d5dae2',
  white: '#ffffff',
  signalBlue: '#007afc',
  deepSignal: '#0062ca',
  mapGreen: '#228a56',
} as const;

/** Niveles de superficie: profundidad por capas de oscuridad, sin sombras. */
export const surface = {
  floor: palette.voidBlack, // 0 — fondo de página, header, tab bar
  panel: palette.deepCharcoal, // 1 — tarjetas
  raised: palette.gunmetal, // 2 — paneles anidados, inputs
  overlay: palette.graphite, // 3 — hover / pressed
} as const;

/** Texto: blanco solo para títulos y etiquetas interactivas. */
export const ink = {
  heading: palette.white,
  body: palette.fog,
  secondary: palette.ash,
  tertiary: palette.slate,
  disabled: palette.steel,
} as const;

export const line = {
  subtle: palette.gunmetal,
  muted: palette.steel,
  ghost: palette.pewter,
  pill: palette.silver,
} as const;

export const accent = {
  primary: palette.signalBlue,
  pressed: palette.deepSignal,
  soft: 'rgba(0, 122, 252, 0.14)',
  border: 'rgba(0, 122, 252, 0.55)',
} as const;

export type Tone = { solid: string; text: string; soft: string; border: string };

/** Semáforo de riesgo ajustado para alto contraste sobre fondo oscuro. */
export const riskTone: Record<'bajo' | 'medio' | 'alto', Tone> = {
  alto: { solid: '#FF4D4F', text: '#FF8A8C', soft: 'rgba(255, 77, 79, 0.14)', border: 'rgba(255, 77, 79, 0.55)' },
  medio: { solid: '#F5A524', text: '#FFC35C', soft: 'rgba(245, 165, 36, 0.14)', border: 'rgba(245, 165, 36, 0.55)' },
  bajo: { solid: '#2FBF71', text: '#5EDC97', soft: 'rgba(47, 191, 113, 0.14)', border: 'rgba(47, 191, 113, 0.55)' },
};

/** Estados de cola offline. Sincronizado usa Map Green del sistema. */
export const statusTone: Record<'pendiente' | 'sincronizado', Tone> = {
  pendiente: { solid: '#F5A524', text: '#FFC35C', soft: 'rgba(245, 165, 36, 0.14)', border: 'rgba(245, 165, 36, 0.6)' },
  sincronizado: { solid: palette.mapGreen, text: '#5EDC97', soft: 'rgba(34, 138, 86, 0.22)', border: 'rgba(34, 138, 86, 0.65)' },
};

/** Radios: pill (botones/filtros), card 24, chip 12, input 6, badge 4. */
export const radius = { badge: 4, input: 6, chip: 12, panel: 16, card: 24, pill: 100 } as const;

/** Escala de espaciado (unidad base 4px). */
export const space = { s4: 4, s8: 8, s12: 12, s16: 16, s20: 20, s24: 24, s32: 32, s40: 40 } as const;

/** Ancho máximo de contenido en web (app, no landing). */
export const layout = { maxWidth: 760 } as const;

/** Cera Pro no es libre: en web se usa DM Sans / Plus Jakarta Sans si existen; en nativo, la fuente del sistema. */
export const fontFamily = Platform.select<string | undefined>({
  web: '"DM Sans", "Plus Jakarta Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  default: undefined,
});

export const type = {
  caption: { fontFamily, fontSize: 10, lineHeight: 16, letterSpacing: 1, fontWeight: '700', textTransform: 'uppercase' },
  eyebrow: { fontFamily, fontSize: 11, lineHeight: 16, letterSpacing: 1.4, fontWeight: '500', textTransform: 'uppercase' },
  bodySm: { fontFamily, fontSize: 14, lineHeight: 20, fontWeight: '400' },
  body: { fontFamily, fontSize: 16, lineHeight: 24, fontWeight: '400' },
  label: { fontFamily, fontSize: 15, lineHeight: 20, fontWeight: '500' },
  subheading: { fontFamily, fontSize: 18, lineHeight: 25, fontWeight: '500' },
  headingSm: { fontFamily, fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.24 },
  heading: { fontFamily, fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.64 },
  data: { fontFamily, fontWeight: '700', fontVariant: ['tabular-nums'] },
} satisfies Record<string, TextStyle>;
