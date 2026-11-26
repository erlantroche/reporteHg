import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  ImageSourcePropType,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { accent, ink, line, palette, radius, shadow, space, surface, type } from '../../constants/hg-theme';
import { CountUp, Float, ParallaxImage, Reveal, useScrollFade } from '../motion/Reveal';

type IonName = keyof typeof Ionicons.glyphMap;

const FILL = { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 } as const;

export const IMAGES = {
  heroForest: require('../../../assets/images/hero-forest.jpg') as ImageSourcePropType,
  forestCard: require('../../../assets/images/forest-card.jpg') as ImageSourcePropType,
  river: require('../../../assets/images/intro-landscape.jpg') as ImageSourcePropType,
  fade: require('../../../assets/images/fade-bottom.png') as ImageSourcePropType,
};

/* ---------------- Pastilla superior ("🌿 Sustainable Living") ---------------- */
export function EyebrowPill({ icon = 'leaf', text, onImage }: { icon?: IonName; text: string; onImage?: boolean }) {
  return (
    <View style={[ui.pill, onImage && ui.pillOnImage]}>
      <Ionicons name={icon} size={12} color={onImage ? ink.onImage : accent.primary} />
      <Text style={[ui.pillText, onImage && ui.pillTextOnImage]}>{text}</Text>
    </View>
  );
}

/* ---------------- Encabezado de sección (título + segunda línea en verde) ---------------- */
export function SectionHeader({
  eyebrow,
  icon,
  title,
  highlight,
  description,
  align = 'center',
}: {
  eyebrow?: string;
  icon?: IonName;
  title: string;
  highlight?: string;
  description?: string;
  align?: 'center' | 'left';
}) {
  const { width } = useWindowDimensions();
  const big = width >= 900;
  const center = align === 'center';
  return (
    <View style={[ui.sectionHeader, center && ui.center]}>
      {eyebrow ? (
        <Reveal from="fade">
          <EyebrowPill icon={icon} text={eyebrow} />
        </Reveal>
      ) : null}
      <Reveal delay={80}>
        <Text style={[ui.sectionTitle, big && ui.sectionTitleBig, center && ui.textCenter]}>
          {title}
          {highlight ? (
            <>
              {'\n'}
              <Text style={ui.highlight}>{highlight}</Text>
            </>
          ) : null}
        </Text>
      </Reveal>
      {description ? (
        <Reveal delay={160}>
          <Text style={[ui.sectionDesc, center && ui.textCenter, big && ui.sectionDescBig]}>{description}</Text>
        </Reveal>
      ) : null}
    </View>
  );
}

/* ---------------- Botones ---------------- */
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
  variant?: 'primary' | 'lime' | 'outline' | 'white' | 'ghostLight';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
}) {
  const v = BUTTON_VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ui.btn,
        compact && ui.btnCompact,
        { backgroundColor: pressed ? v.pressed : v.bg, borderColor: v.border },
        variant === 'primary' && !disabled && shadow.glow,
        disabled && ui.btnDisabled,
        pressed && ui.btnPressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : icon ? <Ionicons name={icon} size={compact ? 15 : 18} color={v.fg} /> : null}
      <Text style={[ui.btnText, compact && ui.btnTextCompact, { color: v.fg }]}>{label}</Text>
    </Pressable>
  );
}

const BUTTON_VARIANTS = {
  primary: { bg: accent.primary, pressed: accent.pressed, fg: ink.onSolid, border: accent.primary },
  lime: { bg: accent.lime, pressed: accent.limePressed, fg: ink.onLime, border: accent.lime },
  outline: { bg: 'transparent', pressed: accent.soft, fg: accent.primary, border: accent.primary },
  white: { bg: palette.white, pressed: palette.mist, fg: accent.primary, border: palette.white },
  ghostLight: { bg: 'rgba(255,255,255,0.12)', pressed: 'rgba(255,255,255,0.22)', fg: ink.onImage, border: 'rgba(255,255,255,0.65)' },
};

/* ---------------- Hero con imagen de fondo + parallax ---------------- */
export function PageHero({
  source,
  eyebrow,
  eyebrowIcon,
  title,
  highlight,
  subtitle,
  height,
  children,
  dark,
}: {
  source: ImageSourcePropType;
  eyebrow?: string;
  eyebrowIcon?: IonName;
  title: string;
  highlight?: string;
  subtitle?: string;
  height?: number;
  children?: React.ReactNode;
  /** Texto blanco (para imágenes oscuras). */
  dark?: boolean;
}) {
  const { width } = useWindowDimensions();
  const big = width >= 900;
  const h = height ?? (big ? 560 : 420);
  const fade = useScrollFade(h * 0.7);

  return (
    <View style={[ui.hero, { height: h }]}>
      <ParallaxImage source={source} height={h} />
      {dark ? <View style={ui.heroDim} /> : <View style={ui.heroMist} />}
      <Image source={IMAGES.fade} resizeMode="stretch" style={ui.heroFade} />
      <Animated.View style={[ui.heroContent, { opacity: fade.opacity, transform: [{ translateY: fade.translateY }] }]}>
        {eyebrow ? (
          <Reveal from="fade" delay={200}>
            <EyebrowPill icon={eyebrowIcon} text={eyebrow} onImage={dark} />
          </Reveal>
        ) : null}
        <Reveal from="blur" delay={350} duration={1200}>
          <Text style={[ui.heroTitle, big && ui.heroTitleBig, dark && ui.heroTitleDark]}>
            {title}
            {highlight ? (
              <>
                {'\n'}
                <Text style={[ui.highlight, dark && ui.highlightOnDark]}>{highlight}</Text>
              </>
            ) : null}
          </Text>
        </Reveal>
        {subtitle ? (
          <Reveal delay={550}>
            <Text style={[ui.heroSubtitle, big && ui.heroSubtitleBig, dark && ui.heroSubtitleDark]}>{subtitle}</Text>
          </Reveal>
        ) : null}
        {children ? (
          <Reveal delay={750}>
            <View style={ui.heroActions}>{children}</View>
          </Reveal>
        ) : null}
      </Animated.View>
      <Float style={[ui.decoCircle, { right: big ? 80 : -30, top: big ? 70 : 40 }]} amplitude={10} period={5200}>
        <View style={[ui.decoDisc, { width: big ? 140 : 90, height: big ? 140 : 90 }]} />
      </Float>
    </View>
  );
}

/* ---------------- Tarjeta de característica (ícono + título + texto) ---------------- */
export function FeatureCard({ icon, title, text, style }: { icon: IonName; title: string; text: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[ui.feature, style]}>
      <View style={ui.featureIcon}>
        <Ionicons name={icon} size={20} color={accent.primary} />
      </View>
      <Text style={ui.featureTitle}>{title}</Text>
      <Text style={ui.featureText}>{text}</Text>
    </View>
  );
}

/* ---------------- Tarjeta con imagen y número grande ("2M+ Trees Saved") ---------------- */
export function ImageStatCard({
  source,
  value,
  suffix,
  label,
  height = 240,
  style,
}: {
  source: ImageSourcePropType;
  value: number;
  suffix?: string;
  label: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[ui.imageCard, { height }, shadow.float, style]}>
      <Image source={source} resizeMode="cover" style={StyleSheet.absoluteFill} />
      <View style={ui.imageCardDim} />
      <Float style={ui.imageCardCircle} amplitude={6} period={4200}>
        <View style={ui.imageCardDisc} />
      </Float>
      <View style={ui.imageCardContent}>
        <CountUp value={value} suffix={suffix} style={ui.imageCardValue} />
        <Text style={ui.imageCardLabel}>{label}</Text>
      </View>
    </View>
  );
}

/* ---------------- Banda verde con estadísticas ("Ready to make a difference?") ---------------- */
export function StatBand({
  eyebrow,
  title,
  subtitle,
  stats,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  stats: { value: number; suffix?: string; label: string }[];
  children?: React.ReactNode;
}) {
  const { width } = useWindowDimensions();
  const big = width >= 900;
  return (
    <View style={ui.band}>
      <Float style={[ui.bandCircle, { left: -40, top: -30 }]} amplitude={10} period={6000}>
        <View style={[ui.bandDisc, { width: 160, height: 160 }]} />
      </Float>
      <Float style={[ui.bandCircle, { right: -30, bottom: -40 }]} amplitude={12} period={5200} delay={600}>
        <View style={[ui.bandDisc, { width: 200, height: 200 }]} />
      </Float>
      <View style={[ui.bandInner, ui.center]}>
        {eyebrow ? (
          <Reveal from="fade">
            <EyebrowPill icon="people" text={eyebrow} onImage />
          </Reveal>
        ) : null}
        <Reveal delay={100}>
          <Text style={[ui.bandTitle, big && ui.bandTitleBig]}>{title}</Text>
        </Reveal>
        {subtitle ? (
          <Reveal delay={200}>
            <Text style={ui.bandSubtitle}>{subtitle}</Text>
          </Reveal>
        ) : null}
        {children ? (
          <Reveal delay={300}>
            <View style={ui.heroActions}>{children}</View>
          </Reveal>
        ) : null}
        <View style={ui.bandStats}>
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={350 + i * 120} from="scale" style={ui.bandStat}>
              <CountUp value={s.value} suffix={s.suffix} style={ui.bandStatValue} />
              <Text style={ui.bandStatLabel}>{s.label}</Text>
            </Reveal>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ---------------- Pie de página oscuro ---------------- */
export function Footer() {
  const { width } = useWindowDimensions();
  const big = width >= 900;
  return (
    <View style={ui.footer}>
      <View style={[ui.footerInner, big && ui.footerInnerBig]}>
        <View style={ui.footerBrandCol}>
          <View style={ui.footerBrand}>
            <View style={ui.footerLogo}>
              <Text style={ui.footerLogoText}>Hg</Text>
            </View>
            <Text style={ui.footerBrandText}>ReporteHg</Text>
          </View>
          <Text style={ui.footerText}>Monitoreo ciudadano del riesgo por mercurio en zonas mineras de Bolivia.</Text>
        </View>
        <View style={ui.footerCol}>
          <Text style={ui.footerHead}>Herramientas</Text>
          <Text style={ui.footerLink}>Mapa de riesgo</Text>
          <Text style={ui.footerLink}>Reporte anónimo offline</Text>
          <Text style={ui.footerLink}>Asistente RAG</Text>
        </View>
        <View style={ui.footerCol}>
          <Text style={ui.footerHead}>Datos</Text>
          <Text style={ui.footerLink}>© OpenStreetMap contributors</Text>
          <Text style={ui.footerLink}>Capas preparadas en QGIS</Text>
          <Text style={ui.footerLink}>Mapa base © Esri</Text>
        </View>
      </View>
      <Text style={ui.footerNote}>Valores demo: no sustituyen análisis de laboratorio.</Text>
    </View>
  );
}

/* ---------------- Contenedor de tarjeta ---------------- */
export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[ui.card, shadow.card, style]}>{children}</View>;
}

export const ui = StyleSheet.create({
  center: { alignItems: 'center' },
  textCenter: { textAlign: 'center' },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: accent.soft,
    borderWidth: 1,
    borderColor: accent.border,
  },
  pillOnImage: { backgroundColor: 'rgba(255,255,255,0.16)', borderColor: 'rgba(255,255,255,0.45)' },
  pillText: { ...type.eyebrow, color: accent.primary },
  pillTextOnImage: { color: ink.onImage },

  sectionHeader: { gap: space.s12, paddingVertical: space.s8 },
  sectionTitle: { ...type.heading, fontSize: 28, lineHeight: 34, color: ink.heading },
  sectionTitleBig: { fontSize: 40, lineHeight: 46, letterSpacing: -1.1 },
  highlight: { color: accent.primary },
  highlightOnDark: { color: accent.lime },
  sectionDesc: { ...type.body, fontSize: 15, lineHeight: 23, color: ink.secondary, maxWidth: 620 },
  sectionDescBig: { fontSize: 17, lineHeight: 26 },

  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s8,
    paddingVertical: 14,
    paddingHorizontal: space.s24,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  btnCompact: { paddingVertical: 9, paddingHorizontal: space.s16 },
  btnText: { ...type.label, fontWeight: '700' },
  btnTextCompact: { fontSize: 13 },
  btnDisabled: { opacity: 0.5 },
  btnPressed: { transform: [{ scale: 0.98 }] },

  hero: { width: '100%', overflow: 'hidden', backgroundColor: palette.sage },
  heroMist: { ...FILL, backgroundColor: 'rgba(244, 247, 241, 0.18)' },
  heroDim: { ...FILL, backgroundColor: 'rgba(14, 30, 18, 0.35)' },
  heroFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '55%', width: '100%' },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: space.s24,
    gap: space.s16,
    paddingBottom: space.s40,
  },
  heroTitle: { ...type.display, fontSize: 38, lineHeight: 42, color: ink.heading, textAlign: 'center' },
  heroTitleBig: { fontSize: 68, lineHeight: 70, letterSpacing: -2 },
  heroTitleDark: { color: ink.onImage, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 12 },
  heroSubtitle: { ...type.body, fontSize: 15, lineHeight: 23, color: ink.body, textAlign: 'center', maxWidth: 560 },
  heroSubtitleBig: { fontSize: 18, lineHeight: 28 },
  heroSubtitleDark: { color: ink.onImageSoft },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s12 },
  decoCircle: { position: 'absolute' },
  decoDisc: { borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.28)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },

  feature: {
    flex: 1,
    minWidth: 150,
    gap: space.s8,
    padding: space.s20,
    borderRadius: radius.card,
    backgroundColor: surface.panel,
    borderWidth: 1,
    borderColor: line.subtle,
    ...shadow.card,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.input,
    backgroundColor: accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  featureTitle: { ...type.label, fontWeight: '700', color: ink.heading },
  featureText: { ...type.bodySm, fontSize: 13, lineHeight: 19, color: ink.secondary },

  imageCard: { borderRadius: radius.card, overflow: 'hidden', backgroundColor: palette.forest },
  imageCardDim: { ...FILL, backgroundColor: 'rgba(10, 30, 14, 0.25)' },
  imageCardCircle: { position: 'absolute', left: 22, bottom: 22 },
  imageCardDisc: { width: 54, height: 54, borderRadius: 27, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  imageCardContent: { ...FILL, alignItems: 'center', justifyContent: 'center', gap: 2 },
  imageCardValue: { ...type.data, fontSize: 52, lineHeight: 56, color: ink.onImage, letterSpacing: -1.5 },
  imageCardLabel: { ...type.label, color: ink.onImageSoft },

  band: { backgroundColor: palette.green, overflow: 'hidden', borderRadius: radius.card },
  bandCircle: { position: 'absolute' },
  bandDisc: { borderRadius: 200, backgroundColor: 'rgba(255,255,255,0.08)' },
  bandInner: { paddingVertical: space.s48, paddingHorizontal: space.s24, gap: space.s16 },
  bandTitle: { ...type.heading, fontSize: 28, lineHeight: 34, color: ink.onImage, textAlign: 'center' },
  bandTitleBig: { fontSize: 40, lineHeight: 46 },
  bandSubtitle: { ...type.body, fontSize: 15, lineHeight: 23, color: ink.onImageSoft, textAlign: 'center', maxWidth: 560 },
  bandStats: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s32, marginTop: space.s16 },
  bandStat: { alignItems: 'center', minWidth: 90 },
  bandStatValue: { ...type.data, fontSize: 30, lineHeight: 34, color: ink.onImage },
  bandStatLabel: { ...type.bodySm, fontSize: 12, color: ink.onImageSoft },

  footer: { backgroundColor: surface.dark, paddingVertical: space.s40, paddingHorizontal: space.s24, gap: space.s24 },
  footerInner: { gap: space.s24, width: '100%', maxWidth: 1200, alignSelf: 'center' },
  footerInnerBig: { flexDirection: 'row', justifyContent: 'space-between' },
  footerBrandCol: { gap: space.s8, maxWidth: 320 },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerLogo: { width: 30, height: 30, borderRadius: 8, backgroundColor: palette.green, alignItems: 'center', justifyContent: 'center' },
  footerLogoText: { ...type.data, fontSize: 12, color: ink.onSolid },
  footerBrandText: { ...type.label, fontWeight: '800', color: ink.onImage },
  footerText: { ...type.bodySm, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  footerCol: { gap: 6 },
  footerHead: { ...type.label, fontSize: 13, fontWeight: '700', color: ink.onImage, marginBottom: 4 },
  footerLink: { ...type.bodySm, fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  footerNote: { ...type.bodySm, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'center' },

  card: {
    backgroundColor: surface.panel,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: line.subtle,
    padding: space.s20,
    gap: space.s16,
  },
});
