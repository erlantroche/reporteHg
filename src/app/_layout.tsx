import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import { ColorValue, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { ConnectivityBadge } from '../components/ConnectivityBadge';
import { IntroScreen, IntroTarget } from '../components/IntroScreen';
import { accent, ink, line, palette, radius, surface, type } from '../constants/hg-theme';
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
      <View style={styles.logo}>
        <Text style={styles.logoText}>Hg</Text>
      </View>
      <View>
        <Text style={styles.brand}>ReporteHg</Text>
        <Text style={styles.section} numberOfLines={1}>
          {children}
        </Text>
      </View>
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
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleIntroFinish = (target: IntroTarget) => {
    setShowIntro(false);
    if (target === 'report') router.navigate('/report');
  };

  if (!mounted) return <View style={styles.root} />;

  return (
    <ReportsProvider>
      <StatusBar style={showIntro ? 'light' : 'dark'} />
      <View style={styles.root}>
        <Tabs
          screenOptions={{
            headerTitleAlign: wide ? 'left' : 'center',
            headerTitle: ({ children }) => <HeaderTitle>{children}</HeaderTitle>,
            headerRight: () => <ConnectivityBadge compact={width < 380} />,
            headerStyle: styles.header,
            headerShadowVisible: false,
            headerTintColor: ink.heading,
            sceneStyle: { backgroundColor: surface.floor },
            tabBarActiveTintColor: accent.primary,
            tabBarInactiveTintColor: ink.tertiary,
            tabBarHideOnKeyboard: true,
            tabBarPosition: wide ? 'left' : 'bottom',
            tabBarVariant: wide ? 'material' : 'uikit',
            tabBarLabelPosition: wide ? 'beside-icon' : 'below-icon',
            tabBarLabelStyle: wide ? styles.tabLabelWide : styles.tabLabel,
            tabBarActiveBackgroundColor: wide ? accent.soft : undefined,
            tabBarItemStyle: wide ? styles.tabItemWide : undefined,
            tabBarStyle: wide ? styles.tabBarWide : styles.tabBar,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{ title: 'Mapa de Riesgo', tabBarLabel: 'Mapa', tabBarIcon: tabIcon('map', 'map-outline') }}
          />
          <Tabs.Screen
            name="report"
            options={{ title: 'Reportar (Offline)', tabBarLabel: 'Reportar', tabBarIcon: tabIcon('megaphone', 'megaphone-outline') }}
          />
          <Tabs.Screen
            name="chat"
            options={{ title: 'Asistente RAG', tabBarLabel: 'Asistente', tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline') }}
          />
        </Tabs>

        {showIntro ? <IntroScreen onFinish={handleIntroFinish} /> : null}
      </View>
    </ReportsProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surface.floor },
  header: {
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: line.subtle,
  },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { ...type.data, color: ink.onSolid, fontSize: 13 },
  brand: { ...type.caption, color: accent.primary },
  section: { ...type.label, fontWeight: '800', color: ink.heading },
  tabLabel: { ...type.caption, fontSize: 10, letterSpacing: 0.4 },
  tabLabelWide: { ...type.label, fontSize: 14, marginLeft: 12 },
  tabBar: {
    backgroundColor: palette.white,
    borderTopColor: line.subtle,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...(Platform.OS === 'web' ? { height: 62, paddingBottom: 8, paddingTop: 8 } : null),
  },
  tabBarWide: {
    width: 220,
    backgroundColor: palette.white,
    borderRightColor: line.subtle,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
    paddingHorizontal: 10,
  },
  tabItemWide: { borderRadius: radius.chip, marginVertical: 2, paddingHorizontal: 8 },
});
