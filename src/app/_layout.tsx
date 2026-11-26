import { Ionicons } from '@expo/vector-icons';
import { Archivo_400Regular, Archivo_600SemiBold, Archivo_700Bold } from '@expo-google-fonts/archivo';
import { ArchivoNarrow_500Medium, ArchivoNarrow_600SemiBold, ArchivoNarrow_700Bold } from '@expo-google-fonts/archivo-narrow';
import { useFonts } from 'expo-font';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ColorValue, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ConnectivityBadge } from '../components/ConnectivityBadge';
import { IntroScreen, IntroTarget } from '../components/IntroScreen';
import { FONT, ink, palette, radius, surface } from '../constants/hg-theme';
import { ReportsProvider } from '../context/ReportsContext';

type IconName = keyof typeof Ionicons.glyphMap;

/** A partir de este ancho (laptops) la navegación pasa a una barra lateral. */
const WIDE_BREAKPOINT = 1024;

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <Ionicons name={focused ? active : inactive} size={size - 2} color={color as string} />
  );
}

function HeaderTitle({ children }: { children: string }) {
  return (
    <View style={styles.headerTitle}>
      <Text style={styles.brand}>MercurIA</Text>
      <Text style={styles.section} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

export default function RootLayout() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const [showIntro, setShowIntro] = useState(true);
  // En web la página se pre-renderiza en el servidor (ancho 0). Dibujamos el diseño recién en el navegador
  // para que coincidan el tamaño de pantalla y la posición de la barra de navegación (evita errores de hidratación).
  const [mounted, setMounted] = useState(Platform.OS !== 'web');
  const [fontsLoaded, fontError] = useFonts({
    Archivo_400Regular,
    Archivo_600SemiBold,
    Archivo_700Bold,
    ArchivoNarrow_500Medium,
    ArchivoNarrow_600SemiBold,
    ArchivoNarrow_700Bold,
  });
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleIntroFinish = (target: IntroTarget) => {
    setShowIntro(false);
    if (target === 'report') router.navigate('/report');
  };

  if (!mounted || (!fontsLoaded && !fontError)) return <View style={styles.root} />;

  return (
    <ReportsProvider>
      <StatusBar style="light" />
      <View style={styles.root}>
        <Tabs
          screenOptions={{
            headerTitleAlign: wide ? 'left' : 'center',
            headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle>,
            headerRight: () => <ConnectivityBadge compact={width < 380} />,
            headerStyle: styles.header,
            headerShadowVisible: false,
            headerTintColor: palette.arena,
            sceneStyle: { backgroundColor: surface.floor },
            tabBarActiveTintColor: palette.arena,
            tabBarInactiveTintColor: 'rgba(230,220,203,0.55)',
            tabBarHideOnKeyboard: true,
            tabBarPosition: wide ? 'left' : 'bottom',
            tabBarVariant: wide ? 'material' : 'uikit',
            tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
            tabBarLabelStyle: wide ? styles.tabLabelWide : styles.tabLabel,
            tabBarActiveBackgroundColor: wide ? 'rgba(230,220,203,0.12)' : undefined,
            tabBarItemStyle: wide ? styles.tabItemWide : undefined,
            tabBarStyle: wide ? styles.tabBarWide : styles.tabBar,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{ title: 'Mapa de riesgo', tabBarLabel: 'Mapa', tabBarIcon: tabIcon('map', 'map-outline') }}
          />
          <Tabs.Screen
            name="report"
            options={{ title: 'Reportar', tabBarLabel: 'Reportar', tabBarIcon: tabIcon('megaphone', 'megaphone-outline') }}
          />
          <Tabs.Screen
            name="chat"
            options={{ title: 'Asistente', tabBarLabel: 'Asistente', tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline') }}
          />
        </Tabs>

        {showIntro ? <IntroScreen onFinish={handleIntroFinish} /> : null}
      </View>
    </ReportsProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.selva },
  header: { backgroundColor: palette.selva },
  headerTitle: { flexDirection: 'row', alignItems: 'baseline', gap: 10 },
  brand: { fontFamily: FONT.narrowBold, fontSize: 20, color: palette.arena },
  section: { fontFamily: FONT.text, fontSize: 14, color: ink.onDarkSoft },
  tabLabel: { fontFamily: FONT.textSemi, fontSize: 11 },
  tabLabelWide: { fontFamily: FONT.textSemi, fontSize: 15, marginLeft: 12 },
  tabBar: {
    backgroundColor: palette.selva,
    borderTopColor: 'rgba(230,220,203,0.15)',
    borderTopWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? { height: 62, paddingBottom: 8, paddingTop: 8 } : null),
  },
  tabBarWide: {
    width: 220,
    backgroundColor: palette.selva,
    borderRightWidth: 0,
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  tabItemWide: { borderRadius: radius.input, marginVertical: 2, paddingHorizontal: 8 },
});
