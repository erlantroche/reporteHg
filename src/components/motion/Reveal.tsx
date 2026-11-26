/**
 * Animaciones de aparición "tipo Apple":
 *  - <Reveal>: cada bloque aparece (sube / se desvanece / crece) cuando entra en pantalla al hacer scroll.
 *  - <CountUp>: números que cuentan desde 0 cuando se ven.
 *  - <ParallaxImage>: imagen de fondo que se mueve más lento que el scroll.
 *  - <Float>: flotación suave e infinita para elementos decorativos.
 *
 * Uso: const reveal = useRevealScroll();
 *      <RevealProvider value={reveal.ctx}>
 *        <Animated.ScrollView onScroll={reveal.onScroll} scrollEventThrottle={16}> … </Animated.ScrollView>
 *      </RevealProvider>
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  ImageSourcePropType,
  ImageStyle,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

const NATIVE = Platform.OS !== 'web';
/** Curva suave de salida (similar a la de apple.com). */
export const APPLE_EASE = Easing.bezier(0.16, 1, 0.3, 1);

type Measurable = { measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void } | null;

interface RevealContextValue {
  scrollY: Animated.Value;
  subscribe: (fn: () => void) => () => void;
}

const RevealContext = createContext<RevealContextValue | null>(null);

export function RevealProvider({ value, children }: { value: RevealContextValue; children: React.ReactNode }) {
  return <RevealContext.Provider value={value}>{children}</RevealContext.Provider>;
}

export function useRevealContext() {
  return useContext(RevealContext);
}

/** Crea el contexto de scroll y el manejador onScroll para Animated.ScrollView. */
export function useRevealScroll() {
  const scrollY = useRef(new Animated.Value(0)).current;
  const subs = useRef(new Set<() => void>()).current;
  const frame = useRef<number | null>(null);

  const notify = useCallback(() => {
    if (frame.current != null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      subs.forEach((fn) => fn());
    });
  }, [subs]);

  const onScroll = useMemo(
    () =>
      Animated.event<NativeSyntheticEvent<NativeScrollEvent>>([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: NATIVE,
        listener: () => notify(),
      }),
    [scrollY, notify]
  );

  /** Para ScrollViews secundarios (p. ej. panel lateral en web) que solo deben disparar apariciones. */
  const onSecondaryScroll = useCallback(() => notify(), [notify]);

  const ctx = useMemo<RevealContextValue>(
    () => ({
      scrollY,
      subscribe: (fn) => {
        subs.add(fn);
        return () => {
          subs.delete(fn);
        };
      },
    }),
    [scrollY, subs]
  );

  useEffect(() => () => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
  }, []);

  return { ctx, onScroll, onSecondaryScroll, scrollY, notify };
}

/** Devuelve true (una sola vez) cuando el elemento entra en pantalla. */
function useInView(ref: React.RefObject<Measurable>, threshold = 0.9) {
  const ctx = useContext(RevealContext);
  const { height } = useWindowDimensions();
  const [visible, setVisible] = useState(false);
  const done = useRef(false);

  const check = useCallback(() => {
    if (done.current) return;
    const node = ref.current;
    if (!node || !node.measureInWindow) {
      done.current = true;
      setVisible(true);
      return;
    }
    node.measureInWindow((_x, y, _w, h) => {
      if (done.current) return;
      if ((h > 0 || y > 0) && y < height * threshold && y + h > 0) {
        done.current = true;
        setVisible(true);
      }
    });
  }, [height, ref, threshold]);

  useEffect(() => {
    if (!ctx) {
      // Sin ScrollView animado: aparece al montarse.
      done.current = true;
      setVisible(true);
      return;
    }
    const unsubscribe = ctx.subscribe(check);
    const t1 = setTimeout(check, 50);
    const t2 = setTimeout(check, 400);
    return () => {
      unsubscribe();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [ctx, check]);

  return { visible, check };
}

export type RevealFrom = 'up' | 'down' | 'left' | 'right' | 'scale' | 'fade' | 'blur';

export function Reveal({
  children,
  from = 'up',
  delay = 0,
  duration = 900,
  distance = 32,
  style,
}: {
  children: React.ReactNode;
  from?: RevealFrom;
  delay?: number;
  duration?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const ref = useRef<Measurable>(null);
  const progress = useRef(new Animated.Value(0)).current;
  const { visible, check } = useInView(ref);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(progress, { toValue: 1, duration, delay, easing: APPLE_EASE, useNativeDriver: NATIVE }).start();
  }, [visible, progress, duration, delay]);

  const range = (a: number, b: number) => progress.interpolate({ inputRange: [0, 1], outputRange: [a, b] });
  const transform =
    from === 'up'
      ? [{ translateY: range(distance, 0) }]
      : from === 'down'
      ? [{ translateY: range(-distance, 0) }]
      : from === 'left'
      ? [{ translateX: range(-distance, 0) }]
      : from === 'right'
      ? [{ translateX: range(distance, 0) }]
      : from === 'scale'
      ? [{ scale: range(0.92, 1) }]
      : from === 'blur'
      ? [{ scale: range(1.06, 1) }]
      : [];

  return (
    <Animated.View
      ref={ref as never}
      onLayout={check}
      style={[style, { opacity: progress, transform }]}
    >
      {children}
    </Animated.View>
  );
}

/** Número que cuenta desde 0 hasta `value` al aparecer. */
export function CountUp({
  value,
  duration = 1600,
  suffix = '',
  style,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}) {
  const ref = useRef<Measurable>(null);
  const { visible, check } = useInView(ref, 0.95);
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(anim, { toValue: value, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [visible, anim, value, duration]);

  return (
    <View ref={ref as never} onLayout={check}>
      <Text style={style}>
        {display.toLocaleString('es-BO')}
        {suffix}
      </Text>
    </View>
  );
}

/** Imagen de fondo con parallax (se mueve más lento que el scroll y hace zoom al tirar hacia abajo). */
export function ParallaxImage({
  source,
  height,
  speed = 0.45,
  style,
}: {
  source: ImageSourcePropType;
  height: number;
  speed?: number;
  style?: StyleProp<ImageStyle>;
}) {
  const ctx = useContext(RevealContext);
  const intro = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(intro, { toValue: 1, duration: 2200, easing: APPLE_EASE, useNativeDriver: NATIVE }).start();
  }, [intro]);

  const scrollY = ctx?.scrollY;
  const translateY = scrollY
    ? scrollY.interpolate({ inputRange: [-height, 0, height], outputRange: [-height * 0.25, 0, height * speed], extrapolate: 'clamp' })
    : 0;
  const pullScale = scrollY ? scrollY.interpolate({ inputRange: [-height, 0], outputRange: [1.5, 1], extrapolate: 'clamp' }) : 1;
  const introScale = intro.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] });

  return (
    <Animated.Image
      source={source}
      resizeMode="cover"
      style={[
        StyleSheet.absoluteFill,
        style,
        { height: height * 1.15, transform: [{ translateY }, { scale: pullScale }, { scale: introScale }] },
      ]}
    />
  );
}

/** Opacidad que baja a medida que se hace scroll (para el contenido del hero). */
export function useScrollFade(range: number) {
  const ctx = useContext(RevealContext);
  if (!ctx) return { opacity: 1, translateY: 0 };
  return {
    opacity: ctx.scrollY.interpolate({ inputRange: [0, range], outputRange: [1, 0], extrapolate: 'clamp' }),
    translateY: ctx.scrollY.interpolate({ inputRange: [0, range], outputRange: [0, range * 0.35], extrapolate: 'clamp' }),
  };
}

/** Flotación suave infinita (decoración). */
export function Float({
  children,
  amplitude = 8,
  period = 3600,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  amplitude?: number;
  period?: number;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: period / 2, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
        Animated.timing(v, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: NATIVE }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, period, delay]);
  return (
    <Animated.View style={[style, { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amplitude] }) }] }]}>
      {children}
    </Animated.View>
  );
}
