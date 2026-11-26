/**
 * El río lo cuenta: ríos reales (OSM / QGIS) que se dibujan, sitios mineros como cuadros
 * y partículas de mercurio que bajan con la corriente hacia los poblados.
 * Es la única animación automática de la app; respeta "reducir movimiento".
 *
 * Se anima con un bucle de cuadros (~30 fps) y capas memorizadas: solo se vuelven a dibujar
 * las partículas, el resto del dibujo queda fijo después de la entrada.
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { FONT, palette } from '../constants/hg-theme';
import {
  MAIN_RIVERS,
  MERCURY_ROUTES,
  MINING_SITES,
  MINOR_RIVERS,
  RIVER_VIEWBOX,
  STREAMS,
  TOWNS,
  VILLAGES,
} from '../data/riverArt';

const DRAW_MS = 2600;
const FADE_DELAY = 900;
const FADE_MS = 1400;
const FRAME_MS = 33;
const KEY_TOWNS = new Set(['Guanay', 'Mapiri', 'Tipuani', 'Teoponte', 'Caranavi']);

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

type Route = { len: number; pts: [number, number][] };

/** Reloj compartido: devuelve los milisegundos desde que se montó, a ~30 fps. */
function useClock(enabled: boolean) {
  const [now, setNow] = useState(enabled ? 0 : DRAW_MS + FADE_DELAY + FADE_MS);
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    let last = 0;
    const tick = (ts: number) => {
      if (start.current == null) start.current = ts;
      if (ts - last >= FRAME_MS) {
        last = ts;
        setNow(ts - start.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [enabled]);
  return now;
}

export function RiverArt({
  style,
  compact,
  labels = true,
  particles = true,
  focus = 'none',
}: {
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
  labels?: boolean;
  particles?: boolean;
  /** 'guanay' acerca el encuadre a la confluencia de los ríos. */
  focus?: 'none' | 'guanay';
}) {
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => undefined);
  }, []);

  const animate = !reduceMotion;
  const now = useClock(animate);

  // Progreso de entrada (se congela al terminar para no redibujar capas fijas).
  const draw = animate ? easeInOut(clamp01(now / DRAW_MS)) : 1;
  const fade = animate ? clamp01((now - FADE_DELAY) / FADE_MS) : 1;
  const drawKey = Math.round(draw * 60) / 60;
  const fadeKey = Math.round(fade * 30) / 30;

  const { width: W, height: H } = RIVER_VIEWBOX;
  const viewBox = focus === 'guanay' ? `${W * 0.28} ${H * 0.22} ${W * 0.5} ${H * 0.5}` : `0 0 ${W} ${H}`;
  const routes = compact ? MERCURY_ROUTES.slice(0, 7) : MERCURY_ROUTES;

  return (
    <View
      style={style}
      pointerEvents="none"
      accessible
      accessibilityRole="image"
      accessibilityLabel="Dibujo de los ríos Kaka, Mapiri, Tipuani y Coroico con los sitios mineros y el mercurio bajando con la corriente"
    >
      <Svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid slice">
        <Background opacity={fadeKey} />
        <MainRivers progress={drawKey} />
        <Mines opacity={fadeKey} />
        {particles && animate && now > DRAW_MS * 0.7 ? <Particles routes={routes} time={now - DRAW_MS * 0.7} /> : null}
        {labels ? <Labels opacity={fadeKey} compact={!!compact} /> : null}
      </Svg>
    </View>
  );
}

const Background = memo(function Background({ opacity }: { opacity: number }) {
  return (
    <G opacity={opacity}>
      {STREAMS.map((d, i) => (
        <Path key={`s${i}`} d={d} stroke="#3B5A48" strokeWidth={0.8} fill="none" />
      ))}
      {MINOR_RIVERS.map((d, i) => (
        <Path key={`m${i}`} d={d} stroke="#6D8070" strokeWidth={1.3} fill="none" strokeLinecap="round" />
      ))}
      {VILLAGES.map(([x, y], i) => (
        <Circle key={`v${i}`} cx={x} cy={y} r={1.4} fill={palette.arena} opacity={0.45} />
      ))}
    </G>
  );
});

const MainRivers = memo(function MainRivers({ progress }: { progress: number }) {
  return (
    <G>
      {MAIN_RIVERS.map((r, i) => (
        <Path
          key={`r${i}`}
          d={r.d}
          stroke={palette.rioLight}
          strokeWidth={3.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={progress >= 1 ? undefined : `${r.len} ${r.len}`}
          strokeDashoffset={progress >= 1 ? undefined : r.len * (1 - progress)}
        />
      ))}
    </G>
  );
});

const Mines = memo(function Mines({ opacity }: { opacity: number }) {
  return (
    <G opacity={opacity}>
      {MINING_SITES.map(([x, y], i) => (
        <Rect key={`k${i}`} x={x - 2.6} y={y - 2.6} width={5.2} height={5.2} stroke={palette.mercurio} strokeWidth={1} fill="none" />
      ))}
    </G>
  );
});

const Labels = memo(function Labels({ opacity, compact }: { opacity: number; compact: boolean }) {
  return (
    <G opacity={opacity}>
      {TOWNS.filter((t) => !compact || KEY_TOWNS.has(t.name)).map((t) => (
        <G key={t.name}>
          <Circle cx={t.x} cy={t.y} r={3.6} fill={palette.arena} />
          <SvgText x={t.x + 8} y={t.y + 5} fontSize={compact ? 17 : 15} fontFamily={FONT.narrowSemi} fill={palette.arena}>
            {t.name}
          </SvgText>
        </G>
      ))}
    </G>
  );
});

/** Gotas de mercurio recorriendo cada río en el sentido de la corriente. */
function Particles({ routes, time }: { routes: Route[]; time: number }) {
  const prepared = useMemo(
    () =>
      routes.map((route, ri) => ({
        pts: route.pts,
        period: Math.max(7000, route.len * 22),
        offset: (ri * 0.37) % 1,
      })),
    [routes]
  );

  return (
    <G>
      {prepared.flatMap((r, ri) =>
        [0, 0.5].map((phase, pi) => {
          const n = r.pts.length;
          if (n < 2) return null;
          const t = (time / r.period + r.offset + phase) % 1;
          const f = t * (n - 1);
          const i = Math.floor(f);
          const u = f - i;
          const a = r.pts[i];
          const b = r.pts[Math.min(n - 1, i + 1)];
          const x = a[0] + (b[0] - a[0]) * u;
          const y = a[1] + (b[1] - a[1]) * u;
          const alpha = t < 0.06 ? t / 0.06 : t > 0.88 ? (1 - t) / 0.12 : 1;
          return (
            <G key={`p${ri}-${pi}`} opacity={alpha}>
              <Circle cx={x} cy={y} r={6} fill={palette.mercurio} opacity={0.22} />
              <Circle cx={x} cy={y} r={2.6} fill={palette.mercurioLight} />
            </G>
          );
        })
      )}
    </G>
  );
}
