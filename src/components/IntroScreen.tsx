import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FONT, ink, palette, space, type } from '../constants/hg-theme';
import { Button, Shade } from './eco/ui';
import { RiverArt } from './RiverArt';

const useNative = Platform.OS !== 'web';

export type IntroTarget = 'map' | 'report';

const STEPS = [
  'Mira el riesgo de mercurio en tu tramo del río.',
  'Avisa si ves una draga, agua turbia, una quema o peces muertos.',
  'Sin señal, el aviso se guarda y se envía solo después.',
];

/**
 * Bienvenida: el río se dibuja (la misma pieza de identidad de la portada)
 * y, al terminar, aparece el texto. Es la única secuencia de entrada de la app.
 */
export function IntroScreen({ onFinish }: { onFinish: (target: IntroTarget) => void }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  const text = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;
  const finished = useRef(false);

  useEffect(() => {
    Animated.timing(text, { toValue: 1, duration: 900, delay: 1900, easing: Easing.out(Easing.cubic), useNativeDriver: useNative }).start();
  }, [text]);

  const finish = (target: IntroTarget) => {
    if (finished.current) return;
    finished.current = true;
    Animated.timing(exit, { toValue: 1, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: useNative }).start(() => onFinish(target));
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
      <RiverArt style={StyleSheet.absoluteFill} compact={!wide} />
      <Shade direction="up" max={0.97} style={[styles.shade, { height: wide ? '62%' : '78%' }]} />

      <View style={[styles.top, { paddingTop: insets.top + space.s16 }]}>
        <Text style={styles.brand}>ReporteHg</Text>
        <Pressable onPress={() => finish('map')} hitSlop={12} accessibilityRole="button">
          <Text style={styles.skip}>Saltar</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.content,
          wide && styles.contentWide,
          { paddingBottom: insets.bottom + space.s32 },
          { opacity: text, transform: [{ translateY: text.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
        ]}
      >
        <Text style={[styles.title, wide && styles.titleWide]}>El mercurio viaja con el río.</Text>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.step}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>
        <View style={styles.buttons}>
          <Button label="Ver el mapa" icon="map" variant="light" onPress={() => finish('map')} />
          <Button label="Reportar algo" icon="megaphone-outline" variant="ghostLight" onPress={() => finish('report')} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 100, elevation: 100, backgroundColor: palette.selva, overflow: 'hidden' },
  shade: { position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.s20 },
  brand: { fontFamily: FONT.narrowBold, fontSize: 22, color: palette.arena },
  skip: { fontFamily: FONT.textSemi, fontSize: 14, color: ink.onDarkSoft, textDecorationLine: 'underline' },
  content: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.s20, gap: space.s20 },
  contentWide: { paddingHorizontal: space.s48, maxWidth: 760 },
  title: { fontFamily: FONT.narrowBold, fontSize: 48, lineHeight: 46, color: palette.arena },
  titleWide: { fontSize: 80, lineHeight: 76, letterSpacing: -1.4 },
  steps: { gap: space.s12, maxWidth: 520 },
  step: { flexDirection: 'row', gap: space.s12, alignItems: 'baseline' },
  stepNumber: { fontFamily: FONT.narrowBold, fontSize: 22, color: palette.rioLight, width: 18 },
  stepText: { ...type.body, flex: 1, color: ink.onDarkSoft },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
});
