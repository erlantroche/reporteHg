import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, useWindowDimensions, View, ViewStyle } from 'react-native';
import { accent, FONT, ink, line, palette, radius, space, surface, type } from '../../constants/hg-theme';

type IonName = keyof typeof Ionicons.glyphMap;

/* ---------------- Degradado (franjas superpuestas, funciona en web y móvil) ---------------- */
export function Shade({
  direction = 'up',
  color = palette.selva,
  max = 0.95,
  steps = 24,
  style,
}: {
  /** 'up': opaco abajo y transparente arriba. 'right': opaco a la izquierda. */
  direction?: 'up' | 'right';
  color?: string;
  max?: number;
  steps?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const bands = Array.from({ length: steps }, (_, i) => {
    const t = (i + 1) / steps;
    return Math.pow(t, 0.75) * max;
  });
  const vertical = direction === 'up';
  return (
    <View pointerEvents="none" style={[{ flexDirection: vertical ? 'column' : 'row-reverse' }, style]}>
      {bands.map((a, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: color, opacity: a }} />
      ))}
    </View>
  );
}

/* ---------------- Botones ---------------- */
type Variant = 'primary' | 'rio' | 'outline' | 'light' | 'ghostLight' | 'lime' | 'white';

const VARIANTS: Record<Variant, { bg: string; pressed: string; fg: string; border: string }> = {
  primary: { bg: palette.selva, pressed: accent.pressed, fg: palette.arena, border: palette.selva },
  rio: { bg: palette.rio, pressed: accent.limePressed, fg: palette.white, border: palette.rio },
  lime: { bg: palette.rio, pressed: accent.limePressed, fg: palette.white, border: palette.rio },
  outline: { bg: 'transparent', pressed: accent.soft, fg: palette.selva, border: palette.selva },
  light: { bg: palette.arena, pressed: palette.arenaDark, fg: palette.selva, border: palette.arena },
  white: { bg: palette.arena, pressed: palette.arenaDark, fg: palette.selva, border: palette.arena },
  ghostLight: { bg: 'transparent', pressed: 'rgba(230,220,203,0.12)', fg: palette.arena, border: 'rgba(230,220,203,0.6)' },
};

export function Button({
  label,
  icon,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  style,
  compact,
}: {
  label: string;
  icon?: IonName;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ui.btn,
        compact && ui.btnCompact,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        disabled && ui.btnDisabled,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={compact ? 16 : 18} color={v.fg} /> : null}
      <Text style={[ui.btnText, compact && ui.btnTextCompact, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

/* ---------------- Título de sección (alineado a la izquierda) ---------------- */
export function SectionTitle({ title, lead, onDark, style }: { title: string; lead?: string; onDark?: boolean; style?: StyleProp<ViewStyle> }) {
  const { width } = useWindowDimensions();
  const big = width >= 900;
  return (
    <View style={[ui.sectionTitleWrap, style]}>
      <Text style={[ui.sectionTitle, big && ui.sectionTitleBig, onDark && { color: ink.onDark }]}>{title}</Text>
      {lead ? <Text style={[ui.sectionLead, big && ui.sectionLeadBig, onDark && { color: ink.onDarkSoft }]}>{lead}</Text> : null}
    </View>
  );
}

/* ---------------- Panel con borde fino (sin sombra) ---------------- */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[ui.card, style]}>{children}</View>;
}

/* ---------------- Pie de página ---------------- */
export function Footer() {
  const { width } = useWindowDimensions();
  const big = width >= 900;
  return (
    <View style={ui.footer}>
      <View style={[ui.footerInner, big && ui.footerInnerBig]}>
        <View style={ui.footerBrandCol}>
          <Text style={ui.footerBrand}>MercurIA</Text>
          <Text style={ui.footerText}>
            Monitoreo ciudadano del mercurio en los ríos auríferos del norte de La Paz y el Beni.
          </Text>
        </View>
        <View style={ui.footerCol}>
          <Text style={ui.footerHead}>Datos</Text>
          <Text style={ui.footerLink}>Ríos, poblados y minería: OpenStreetMap, preparados en QGIS</Text>
          <Text style={ui.footerLink}>Mapa base: Esri</Text>
          <Text style={ui.footerLink}>Preguntas frecuentes: OMS, UMSA, ATSDR y guías de pequeña minería</Text>
        </View>
      </View>
      <Text style={ui.footerNote}>Las zonas y los valores de mercurio del mapa son de demostración y no sustituyen análisis de laboratorio.</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s8,
    paddingVertical: 14,
    paddingHorizontal: space.s20,
    borderRadius: radius.input,
    borderWidth: 1.5,
  },
  btnCompact: { paddingVertical: 9, paddingHorizontal: space.s16 },
  btnText: { fontFamily: FONT.textSemi, fontSize: 16, lineHeight: 20 },
  btnTextCompact: { fontSize: 14 },
  btnDisabled: { opacity: 0.45 },

  sectionTitleWrap: { gap: space.s8, maxWidth: 680 },
  sectionTitle: { ...type.heading, fontSize: 34, lineHeight: 36, color: ink.heading },
  sectionTitleBig: { fontSize: 48, lineHeight: 50 },
  sectionLead: { ...type.body, color: ink.secondary },
  sectionLeadBig: { fontSize: 18, lineHeight: 28 },

  card: {
    backgroundColor: surface.panel,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: line.subtle,
    padding: space.s20,
    gap: space.s16,
  },

  footer: { backgroundColor: palette.selva, paddingVertical: space.s40, paddingHorizontal: space.s24, gap: space.s24 },
  footerInner: { gap: space.s24, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  footerInnerBig: { flexDirection: 'row', gap: space.s64 },
  footerBrandCol: { gap: space.s8, maxWidth: 360 },
  footerBrand: { fontFamily: FONT.narrowBold, fontSize: 28, color: palette.arena },
  footerText: { ...type.bodySm, color: ink.onDarkSoft },
  footerCol: { gap: 6, flex: 1, maxWidth: 520 },
  footerHead: { fontFamily: FONT.textSemi, fontSize: 14, color: palette.arena, marginBottom: 2 },
  footerLink: { ...type.bodySm, fontSize: 13, color: ink.onDarkSoft },
  footerNote: { ...type.bodySm, fontSize: 12, color: 'rgba(230,220,203,0.5)', width: '100%', maxWidth: 1180, alignSelf: 'center' },
});
