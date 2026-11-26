import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accent, ink, radius, shadow, space, type } from '../constants/hg-theme';

const LANDSCAPE = require('../../assets/images/intro-landscape.jpg');
const FOG_1 = require('../../assets/images/intro-fog-1.png');
const FOG_2 = require('../../assets/images/intro-fog-2.png');
const SHADE = require('../../assets/images/intro-shade.png');

type IonName = keyof typeof Ionicons.glyphMap;

const STEPS: { icon: IonName; title: string; text: string }[] = [
  { icon: 'map-outline', title: 'Mira el mapa', text: 'Verde, ámbar o rojo: el riesgo de mercurio en tu zona.' },
  { icon: 'camera-outline', title: 'Reporta lo que ves', text: 'Draga, agua turbia, quema o peces muertos. Con foto y GPS, sin tu nombre.' },
  { icon: 'paper-plane-outline', title: 'Se envía solo', text: 'Sin señal se guarda en tu celular y se envía cuando vuelva el internet.' },
];

const useNative = Platform.OS !== 'web';
const glass: ViewStyle =
  Platform.OS === 'web' ? ({ backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' } as unknown as ViewStyle) : {};

export type IntroTarget = 'map' | 'report';

/**
 * Pantalla de bienvenida animada (inspirada en el video de referencia):
 * 1) todo empieza en blanco/niebla, 2) la niebla se abre y revela el valle,
 * 3) aparece el título, 4) sube una tarjeta flotante con los pasos.
 */
export function IntroScreen({ onFinish }: { onFinish: (target: IntroTarget) => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;

  const whiteout = useRef(new Animated.Value(1)).current;
  const fogOpen = useRef(new Animated.Value(0)).current;
  const zoom = useRef(new Animated.Value(0)).current;
  const title = useRef(new Animated.Value(0)).current;
  const card = useRef(new Animated.Value(0)).current;
  const steps = useRef(STEPS.map(() => new Animated.Value(0))).current;
  const buttons = useRef(new Animated.Value(0)).current;
  const birds = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  useEffect(() => {
    Animated.timing(zoom, { toValue: 1, duration: 9000, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
    Animated.loop(
      Animated.timing(birds, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: useNative })
    ).start();

    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(whiteout, { toValue: 0, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: useNative }),
        Animated.timing(fogOpen, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.cubic), useNativeDriver: useNative }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(1300),
      Animated.timing(title, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }),
      Animated.spring(card, { toValue: 1, friction: 9, tension: 50, useNativeDriver: useNative }),
      Animated.stagger(
        140,
        steps.map((v) => Animated.timing(v, { toValue: 1, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }))
      ),
      Animated.timing(buttons, { toValue: 1, duration: 450, useNativeDriver: useNative }),
    ]).start();
  }, [birds, buttons, card, fogOpen, steps, title, whiteout, zoom]);

  const finish = (target: IntroTarget) => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(exit, { toValue: 1, duration: 520, easing: Easing.in(Easing.cubic), useNativeDriver: useNative }).start(() =>
      onFinish(target)
    );
  };

  const bgScale = zoom.interpolate({ inputRange: [0, 1], outputRange: [1.18, 1.02] });
  const bgShift = zoom.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const fogW = Math.max(width, height) * 1.5;
  const fogLeftX = fogOpen.interpolate({ inputRange: [0, 1], outputRange: [-fogW * 0.32, -fogW * 1.05] });
  const fogRightX = fogOpen.interpolate({ inputRange: [0, 1], outputRange: [-fogW * 0.18, fogW * 0.55] });
  const fogOpacity = fogOpen.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.55, 0] });
  const fogBottomY = fogOpen.interpolate({ inputRange: [0, 1], outputRange: [height * 0.2, height * 0.75] });

  const rise = (v: Animated.Value, distance = 28) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  });

  const birdX = birds.interpolate({ inputRange: [0, 1], outputRange: [-80, width + 80] });
  const birdY = birds.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, -10, 4, -8, 0] });

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        {
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [{ scale: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }],
        },
      ]}
    >
      {/* Paisaje con zoom lento (efecto Ken Burns) */}
      <Animated.Image
        source={LANDSCAPE}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { transform: [{ scale: bgScale }, { translateY: bgShift }] }]}
      />

      {/* Aves */}
      <Animated.View style={[styles.birds, { top: height * 0.14, transform: [{ translateX: birdX }, { translateY: birdY }] }]} pointerEvents="none">
        <MaterialCommunityIcons name="bird" size={16} color="rgba(20,30,25,0.65)" />
        <MaterialCommunityIcons name="bird" size={11} color="rgba(20,30,25,0.55)" style={styles.bird2} />
        <MaterialCommunityIcons name="bird" size={13} color="rgba(20,30,25,0.6)" style={styles.bird3} />
      </Animated.View>

      {/* Sombra inferior para leer el texto */}
      <Image source={SHADE} resizeMode="stretch" style={[StyleSheet.absoluteFill, styles.shade]} />

      {/* Niebla que se abre */}
      <Animated.Image
        source={FOG_1}
        resizeMode="cover"
        style={[styles.fog, { width: fogW, height: fogW, top: height / 2 - fogW / 2, opacity: fogOpacity, transform: [{ translateX: fogLeftX }] }]}
      />
      <Animated.Image
        source={FOG_2}
        resizeMode="cover"
        style={[styles.fog, { width: fogW, height: fogW, top: height / 2 - fogW / 2, opacity: fogOpacity, transform: [{ translateX: fogRightX }] }]}
      />
      <Animated.Image
        source={FOG_1}
        resizeMode="cover"
        style={[styles.fog, { width: fogW, height: fogW * 0.6, left: (width - fogW) / 2, top: 0, opacity: fogOpacity, transform: [{ translateY: fogBottomY }] }]}
      />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.white, { opacity: whiteout }]} />

      {/* Contenido */}
      <View style={[styles.content, { paddingTop: insets.top + space.s16, paddingBottom: insets.bottom + space.s24 }]}>
        <Animated.View style={[styles.topBar, { opacity: title }]}>
          <View style={styles.brand}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>Hg</Text>
            </View>
            <Text style={styles.brandText}>ReporteHg</Text>
          </View>
          <Pressable onPress={() => finish('map')} hitSlop={12} style={styles.skip}>
            <Text style={styles.skipText}>Saltar</Text>
          </Pressable>
        </Animated.View>

        <View style={[styles.main, wide && styles.mainWide]}>
          <Animated.View style={[styles.titleBlock, wide && styles.titleBlockWide, rise(title, 36)]}>
            <Text style={styles.eyebrow}>Monitoreo ciudadano del mercurio · Bolivia</Text>
            <Text style={[styles.title, wide && styles.titleWide]}>Cuidemos nuestros ríos</Text>
            <Text style={[styles.subtitle, wide && styles.subtitleWide]}>
              Mira el riesgo en tu zona y avisa lo que ves, aunque no tengas internet.
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.card,
              glass,
              wide && styles.cardWide,
              {
                opacity: card,
                transform: [
                  { translateY: card.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) },
                  { scale: card.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                ],
              },
            ]}
          >
            <Text style={styles.cardEyebrow}>Así funciona</Text>
            {STEPS.map((s, i) => (
              <Animated.View key={s.title} style={[styles.step, rise(steps[i], 14)]}>
                <View style={styles.stepIcon}>
                  <Ionicons name={s.icon} size={18} color="#FFFFFF" />
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{i + 1}</Text>
                  </View>
                </View>
                <View style={styles.stepBody}>
                  <Text style={styles.stepTitle}>{s.title}</Text>
                  <Text style={styles.stepText}>{s.text}</Text>
                </View>
              </Animated.View>
            ))}

            <Animated.View style={[styles.buttons, rise(buttons, 10)]}>
              <Pressable onPress={() => finish('map')} style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}>
                <Ionicons name="map" size={18} color="#FFFFFF" />
                <Text style={styles.primaryText}>Ver el mapa</Text>
              </Pressable>
              <Pressable onPress={() => finish('report')} style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
                <Ionicons name="megaphone-outline" size={18} color="#FFFFFF" />
                <Text style={styles.secondaryText}>Reportar ahora</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

const WHITE_SOFT = 'rgba(255,255,255,0.86)';

const styles = StyleSheet.create({
  root: { zIndex: 100, elevation: 100, backgroundColor: '#EEF0E6', overflow: 'hidden' },
  white: { backgroundColor: '#F7F8F2' },
  fog: { position: 'absolute', left: 0 },
  shade: { width: '100%', height: '100%' },
  birds: { position: 'absolute', left: 0, flexDirection: 'row', alignItems: 'center' },
  bird2: { marginLeft: 14, marginTop: -16 },
  bird3: { marginLeft: 10, marginTop: 10 },

  content: { flex: 1, paddingHorizontal: space.s20 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: radius.input,
    backgroundColor: 'rgba(14,16,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { ...type.data, color: '#FFFFFF', fontSize: 13 },
  brandText: { ...type.label, fontWeight: '700', color: '#FFFFFF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8 },
  skip: {
    paddingHorizontal: space.s12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(14,16,18,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  skipText: { ...type.label, fontSize: 12, color: '#FFFFFF' },

  main: { flex: 1, justifyContent: 'flex-end', gap: space.s20, width: '100%', maxWidth: 1180, alignSelf: 'center' },
  mainWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: space.s24 },
  titleBlock: { gap: space.s8 },
  titleBlockWide: { flex: 1, maxWidth: 620, paddingBottom: space.s24 },
  eyebrow: { ...type.eyebrow, color: WHITE_SOFT, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6 },
  title: {
    ...type.heading,
    fontSize: 38,
    lineHeight: 42,
    letterSpacing: -0.9,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowRadius: 12,
  },
  titleWide: { fontSize: 64, lineHeight: 66, letterSpacing: -1.3 },
  subtitle: { ...type.body, fontSize: 16, lineHeight: 23, color: WHITE_SOFT, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 },
  subtitleWide: { fontSize: 19, lineHeight: 28, maxWidth: 520 },

  card: {
    gap: space.s12,
    padding: space.s20,
    borderRadius: radius.card,
    backgroundColor: 'rgba(16, 36, 20, 0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  cardWide: { width: 420 },
  cardEyebrow: { ...type.caption, color: accent.lime },
  step: { flexDirection: 'row', gap: space.s12, alignItems: 'flex-start' },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46,125,50,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(227,243,91,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: accent.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { ...type.data, fontSize: 10, color: ink.onLime },
  stepBody: { flex: 1 },
  stepTitle: { ...type.label, fontWeight: '700', color: '#FFFFFF' },
  stepText: { ...type.bodySm, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.78)', marginTop: 1 },

  buttons: { gap: space.s8, marginTop: space.s8 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s8,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: accent.primary,
    ...shadow.glow,
  },
  primaryBtnPressed: { backgroundColor: accent.pressed },
  primaryText: { ...type.label, fontWeight: '700', color: '#FFFFFF' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s8,
    paddingVertical: 13,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  secondaryBtnPressed: { backgroundColor: 'rgba(255,255,255,0.12)' },
  secondaryText: { ...type.label, color: '#FFFFFF' },
});
