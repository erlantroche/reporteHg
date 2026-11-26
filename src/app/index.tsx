import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  Button,
  Card,
  FeatureCard,
  Footer,
  IMAGES,
  ImageStatCard,
  PageHero,
  SectionHeader,
  StatBand,
} from '../components/eco/ui';
import { FaqList } from '../components/eco/FaqList';
import { HgMap } from '../components/map/HgMap';
import type { MapReport, MapZone } from '../components/map/mapBridge';
import { Reveal, RevealProvider, useRevealScroll } from '../components/motion/Reveal';
import { accent, ink, layout, line, palette, radius, riskTone, shadow, space, statusTone, surface, type } from '../constants/hg-theme';
import { reportTypeLabel } from '../constants/reportTypes';
import { useReports } from '../context/ReportsContext';
import { DEFAULT_VISIBLE_LAYERS, featureCount, GEO_ATTRIBUTION, GEO_LAYER_DEFS, GeoLayerDef, MAP_GEO_LAYERS } from '../data/geoLayers';
import { faqById } from '../data/faq';
import { CitizenReport, INITIAL_RISK_ZONES, RiskLevel, RiskZone } from '../data/mocks';
import {
  buildRiskGrid,
  DEFAULT_CENTER,
  HAZARD_LEGEND,
  HG_THRESHOLD_MG_KG,
  MapLayer,
  probabilityAboveThreshold,
  zoneCoord,
  zonesBounds,
} from '../data/zoneGeo';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

type LayerMode = MapLayer;
type IconName = keyof typeof Ionicons.glyphMap;
type Scrollable = { scrollTo: (o: { y: number; animated?: boolean }) => void } | null;

const WIDE = 1024;

const RISK_META: Record<RiskLevel, { label: string; icon: IconName; hint: string }> = {
  alto: { label: 'Alto', icon: 'warning', hint: 'Zona prioritaria: sigue los avisos locales sobre uso del agua y consumo de pescado.' },
  medio: { label: 'Medio', icon: 'alert-circle', hint: 'Precaución: confirma con el monitoreo local antes del uso continuo del agua.' },
  bajo: { label: 'Bajo', icon: 'checkmark-circle', hint: 'Sin señales fuertes por ahora. Mantén la vigilancia y reporta cualquier cambio.' },
};

const LAYERS: Record<LayerMode, { label: string; icon: IconName; description: string }> = {
  peligro: { label: 'Peligro', icon: 'flask-outline', description: `Probabilidad de que el mercurio supere ${HG_THRESHOLD_MG_KG} mg/kg en cada cuadro.` },
  riesgo: { label: 'Riesgo', icon: 'pulse-outline', description: 'Dónde el mercurio puede dañar a personas: peligro × exposición × vulnerabilidad.' },
  incertidumbre: { label: 'Incertidumbre', icon: 'help-circle-outline', description: 'Más gris = menos seguro. Crece lejos de los puntos con muestras.' },
};

const LAYER_ORDER: LayerMode[] = ['peligro', 'riesgo', 'incertidumbre'];
const LEVEL_ORDER: RiskLevel[] = ['alto', 'medio', 'bajo'];
const UNCERTAIN = '#8B96AA';

const HOW_IT_WORKS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'flask-outline', title: 'Peligro', text: 'Interpolamos las muestras: lo que está cerca se parece más que lo que está lejos.' },
  { icon: 'people-outline', title: 'Exposición', text: 'Poblados, tomas de agua y zonas de pesca cerca de cada cuadro.' },
  { icon: 'body-outline', title: 'Vulnerabilidad', text: 'Cuántos niños hay y cuánto pescado se consume en la zona.' },
  { icon: 'help-buoy-outline', title: 'Incertidumbre', text: 'Mostramos con transparencia dónde faltan datos.' },
  { icon: 'megaphone-outline', title: 'Avisos ciudadanos', text: 'Dragas, agua turbia, quemas o peces muertos, con foto y GPS.' },
  { icon: 'cloud-offline-outline', title: 'Sin internet', text: 'Todo se guarda en el celular y se envía solo cuando hay señal.' },
];

const confidenceLabel = (u: number) => (u <= 0.2 ? 'Confianza alta' : u <= 0.35 ? 'Confianza media' : 'Confianza baja');

export default function MapScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  /** Mapa y panel lado a lado solo en pantallas anchas; si no, uno debajo del otro. */
  const sideBySide = width >= 1280;
  const reveal = useRevealScroll();
  const scrollRef = useRef<Scrollable>(null);
  const mapY = useRef(0);
  const containerY = useRef(0);

  const { reports } = useReports();
  const location = useCurrentLocation();

  const [layer, setLayer] = useState<LayerMode>('riesgo');
  const [selected, setSelected] = useState<RiskZone>(INITIAL_RISK_ZONES[0]);
  const [showReports, setShowReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<CitizenReport | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);
  const [fitKey, setFitKey] = useState(0);
  const [visibleLayers, setVisibleLayers] = useState<string[]>(DEFAULT_VISIBLE_LAYERS);

  const toggleLayer = (id: string) => setVisibleLayers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const cells = useMemo(() => buildRiskGrid(INITIAL_RISK_ZONES, layer), [layer]);
  const bounds = useMemo(() => zonesBounds(INITIAL_RISK_ZONES), []);
  const counts = useMemo(
    () => INITIAL_RISK_ZONES.reduce<Record<RiskLevel, number>>((acc, z) => ({ ...acc, [z.riskLevel]: acc[z.riskLevel] + 1 }), { alto: 0, medio: 0, bajo: 0 }),
    []
  );
  const geoCount = (id: string) => {
    const def = GEO_LAYER_DEFS.find((d) => d.id === id);
    return def ? featureCount(def) : 0;
  };

  const zoneColor = (zone: RiskZone) => {
    if (layer === 'riesgo') return riskTone[zone.riskLevel].solid;
    if (layer === 'peligro') return HAZARD_LEGEND[Math.min(3, Math.floor(probabilityAboveThreshold(zone.estimatedHgMgKg, zone.uncertainty) * 4))];
    return UNCERTAIN;
  };

  const mapZones = useMemo<MapZone[]>(
    () =>
      INITIAL_RISK_ZONES.map((zone, i) => ({
        id: zone.id,
        ...zoneCoord(zone, i),
        label: String(i + 1),
        color: zoneColor(zone),
        selected: zone.id === selected.id,
        title: zone.name,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layer, selected.id]
  );

  const mapReports = useMemo<MapReport[]>(
    () =>
      showReports
        ? reports.map((r) => ({
            id: r.id,
            lat: Number(r.latitude),
            lng: Number(r.longitude),
            color: statusTone[r.status === 'sincronizado' ? 'sincronizado' : 'pendiente'].solid,
            title: reportTypeLabel(r),
            subtitle: `${r.createdAt} · ${r.status === 'sincronizado' ? 'Sincronizado' : 'Pendiente'}`,
          }))
        : [],
    [reports, showReports]
  );

  const scrollToMap = () => scrollRef.current?.scrollTo({ y: Math.max(0, containerY.current + mapY.current - 12), animated: true });

  const selectZone = (zone: RiskZone) => {
    setSelected(zone);
    setSelectedReport(null);
    const index = INITIAL_RISK_ZONES.findIndex((z) => z.id === zone.id);
    setFocus({ ...zoneCoord(zone, index), zoom: 13, key: Date.now() });
    scrollToMap();
  };

  const askAssistant = (faqId: number) => router.navigate({ pathname: '/chat', params: { faq: String(faqId) } });

  const locateMe = async () => {
    const fix = await location.request();
    if (fix) setFocus({ lat: fix.lat, lng: fix.lng, zoom: 14, key: Date.now() });
  };

  const meta = RISK_META[selected.riskLevel];
  const tone = riskTone[selected.riskLevel];
  const low = Math.max(0, selected.estimatedHgMgKg * (1 - selected.uncertainty));
  const high = selected.estimatedHgMgKg * (1 + selected.uncertainty);
  const prob = probabilityAboveThreshold(selected.estimatedHgMgKg, selected.uncertainty);

  /* ---------------- Bloques ---------------- */

  const mapCard = (
    <View style={[styles.mapCard, shadow.float, { height: wide ? 600 : 440 }]}>
      <HgMap
        center={DEFAULT_CENTER}
        zoom={11}
        cells={cells}
        zones={mapZones}
        reports={mapReports}
        me={location.fix ? { lat: location.fix.lat, lng: location.fix.lng, accuracy: location.fix.accuracy } : null}
        fitTo={bounds}
        fitKey={fitKey}
        focus={focus}
        geoLayers={MAP_GEO_LAYERS}
        visibleLayers={visibleLayers}
        onZoneSelect={(id) => {
          const z = INITIAL_RISK_ZONES.find((zone) => zone.id === id);
          if (z) {
            setSelected(z);
            setSelectedReport(null);
          }
        }}
        onReportSelect={(id) => setSelectedReport(reports.find((r) => r.id === id) ?? null)}
        style={styles.map}
      />
      <View style={styles.mapControls} pointerEvents="box-none">
        <MapButton icon={location.status === 'loading' ? 'hourglass-outline' : 'locate'} label="Mi ubicación" onPress={locateMe} active={!!location.fix} />
        <MapButton icon="scan-outline" label="Ver zonas" onPress={() => setFitKey((k) => k + 1)} />
        <MapButton icon={showReports ? 'flag' : 'flag-outline'} label={`Avisos (${reports.length})`} onPress={() => setShowReports((v) => !v)} active={showReports} />
      </View>
      <View style={styles.legendOverlay} pointerEvents="none">
        <Legend layer={layer} showReports={showReports} />
      </View>
      {location.status === 'denied' ? (
        <View style={styles.mapToast} pointerEvents="none">
          <Text style={styles.mapToastText}>Permiso de ubicación denegado</Text>
        </View>
      ) : null}
    </View>
  );

  const layerPills = (
    <View style={styles.filterRow}>
      {LAYER_ORDER.map((item) => {
        const active = layer === item;
        return (
          <Pressable
            key={item}
            onPress={() => setLayer(item)}
            style={({ pressed }) => [styles.filterPill, active && styles.filterPillActive, pressed && !active && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Ionicons name={LAYERS[item].icon} size={15} color={active ? ink.onSolid : accent.primary} />
            <Text style={[styles.filterText, active && styles.filterTextActive]} numberOfLines={1}>
              {LAYERS[item].label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const detailCard = (
    <Card style={[styles.detail, { borderColor: tone.border }]}>
      {selectedReport ? (
        <View style={styles.reportBox}>
          <View style={styles.rowBetween}>
            <Text style={styles.eyebrowSmall}>Aviso ciudadano</Text>
            <Pressable onPress={() => setSelectedReport(null)} hitSlop={10}>
              <Ionicons name="close" size={18} color={ink.secondary} />
            </Pressable>
          </View>
          <View style={styles.row}>
            {selectedReport.photoUri ? (
              <Image source={{ uri: selectedReport.photoUri }} style={styles.reportThumb} contentFit="cover" />
            ) : (
              <View style={[styles.reportThumb, styles.reportThumbEmpty]}>
                <Ionicons name="image-outline" size={20} color={ink.tertiary} />
              </View>
            )}
            <View style={styles.flex}>
              <Text style={styles.zoneName}>{reportTypeLabel(selectedReport)}</Text>
              <Text style={styles.subtext} numberOfLines={2}>
                {selectedReport.description}
              </Text>
              <Text style={styles.mono}>
                {selectedReport.createdAt} · {Number(selectedReport.latitude).toFixed(4)}, {Number(selectedReport.longitude).toFixed(4)}
              </Text>
            </View>
          </View>
        </View>
      ) : null}

      <View style={[styles.riskBanner, { backgroundColor: tone.soft }]}>
        <View style={[styles.riskIcon, { backgroundColor: tone.solid }]}>
          <Ionicons name={meta.icon} size={24} color={ink.onSolid} />
        </View>
        <View style={styles.flex}>
          <Text style={[styles.riskLabel, { color: tone.text }]}>Riesgo {meta.label}</Text>
          <Text style={styles.detailName}>{selected.name}</Text>
          <Text style={styles.subtext}>{selected.riverOrArea}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricBox, layer === 'peligro' && styles.metricBoxActive]}>
          <Text style={styles.metricLabel}>Hg estimado</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>{selected.estimatedHgMgKg.toFixed(2)}</Text>
            <Text style={styles.metricUnit}>mg/kg</Text>
          </View>
          <Text style={styles.metricFoot}>Valor interpolado</Text>
        </View>
        <View style={[styles.metricBox, layer === 'incertidumbre' && styles.metricBoxActive]}>
          <Text style={styles.metricLabel}>Incertidumbre</Text>
          <View style={styles.metricValueRow}>
            <Text style={styles.metricValue}>±{Math.round(selected.uncertainty * 100)}</Text>
            <Text style={styles.metricUnit}>%</Text>
          </View>
          <Text style={styles.metricFoot}>{confidenceLabel(selected.uncertainty)}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Rango aproximado</Text>
        <Text style={styles.infoValue}>
          {low.toFixed(2)} – {high.toFixed(2)} mg/kg
        </Text>
      </View>
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>Prob. de superar {HG_THRESHOLD_MG_KG} mg/kg</Text>
        <Text style={styles.infoValue}>{Math.round(prob * 100)}%</Text>
      </View>

      <ScoreBar label="Exposición" value={selected.exposureScore} />
      <ScoreBar label="Vulnerabilidad" value={selected.vulnerabilityScore} />
      <ScoreBar label="Incertidumbre" value={selected.uncertainty} muted />

      <View style={[styles.hintBox, { borderLeftColor: tone.solid }]}>
        <Ionicons name="information-circle" size={16} color={tone.text} />
        <Text style={styles.hintText}>{meta.hint}</Text>
      </View>

      {[1, 25].map((id) => {
        const f = faqById(id);
        return f ? (
          <Pressable key={id} onPress={() => askAssistant(id)} style={({ pressed }) => [styles.faqLink, pressed && styles.pressed]}>
            <Ionicons name="help-circle" size={16} color={accent.primary} />
            <Text style={styles.faqLinkText}>{f.pregunta}</Text>
            <Ionicons name="arrow-forward" size={14} color={accent.primary} />
          </Pressable>
        ) : null;
      })}

      <Button label="¿Viste algo aquí? Reportar" icon="megaphone-outline" variant="outline" onPress={() => router.navigate('/report')} />
    </Card>
  );

  const geoCard = (
    <Card>
      <View style={styles.rowBetween}>
        <View style={styles.row}>
          <Ionicons name="git-network-outline" size={18} color={accent.primary} />
          <Text style={styles.cardTitle}>Capas del territorio</Text>
        </View>
        <View style={styles.qgisTag}>
          <Text style={styles.qgisTagText}>QGIS</Text>
        </View>
      </View>
      <View style={styles.geoChips}>
        {GEO_LAYER_DEFS.map((def, i) => (
          <Reveal key={def.id} from="scale" delay={i * 60}>
            <GeoChip def={def} active={visibleLayers.includes(def.id)} onPress={() => toggleLayer(def.id)} />
          </Reveal>
        ))}
      </View>
      <Text style={styles.footnote}>{GEO_ATTRIBUTION}. Toca un río, poblado o área minera para ver su nombre.</Text>
    </Card>
  );

  const zonesList = (
    <View style={styles.zonesGrid}>
      {INITIAL_RISK_ZONES.map((zone, i) => {
        const isSelected = selected.id === zone.id;
        const t = riskTone[zone.riskLevel];
        return (
          <Reveal key={zone.id} delay={i * 120} style={wide ? styles.zoneCol : undefined}>
            <Pressable
              onPress={() => selectZone(zone)}
              style={({ pressed }) => [styles.zoneCard, shadow.card, isSelected && { borderColor: accent.primary, borderWidth: 2 }, pressed && styles.pressed]}
            >
              <View style={styles.rowBetween}>
                <View style={[styles.zoneIndex, { backgroundColor: zoneColor(zone) }]}>
                  <Text style={styles.zoneIndexText}>{i + 1}</Text>
                </View>
                <View style={[styles.levelBadge, { backgroundColor: t.soft, borderColor: t.border }]}>
                  <Text style={[styles.levelBadgeText, { color: t.text }]}>Riesgo {RISK_META[zone.riskLevel].label}</Text>
                </View>
              </View>
              <Text style={styles.zoneName}>{zone.name}</Text>
              <Text style={styles.subtext}>{zone.riverOrArea}</Text>
              <View style={styles.zoneStats}>
                <View>
                  <Text style={styles.zoneStatValue}>{zone.estimatedHgMgKg.toFixed(2)}</Text>
                  <Text style={styles.zoneStatLabel}>mg/kg Hg</Text>
                </View>
                <View>
                  <Text style={styles.zoneStatValue}>±{Math.round(zone.uncertainty * 100)}%</Text>
                  <Text style={styles.zoneStatLabel}>incertidumbre</Text>
                </View>
                <View>
                  <Text style={styles.zoneStatValue}>{Math.round(probabilityAboveThreshold(zone.estimatedHgMgKg, zone.uncertainty) * 100)}%</Text>
                  <Text style={styles.zoneStatLabel}>prob. &gt; {HG_THRESHOLD_MG_KG}</Text>
                </View>
              </View>
              <View style={styles.zoneLink}>
                <Text style={styles.zoneLinkText}>Ver en el mapa</Text>
                <Ionicons name="arrow-forward" size={14} color={accent.primary} />
              </View>
            </Pressable>
          </Reveal>
        );
      })}
    </View>
  );

  return (
    <RevealProvider value={reveal.ctx}>
      <Animated.ScrollView
        ref={scrollRef as never}
        style={styles.screen}
        onScroll={reveal.onScroll}
        scrollEventThrottle={16}
      >
        {/* HERO */}
        <PageHero
          source={IMAGES.heroForest}
          eyebrow="Monitoreo ciudadano · Bolivia"
          eyebrowIcon="leaf"
          title="Cuidemos el río."
          highlight="Cuidemos la vida."
          subtitle="Mira el riesgo por mercurio en tu zona y avisa lo que ves, aunque no tengas internet."
        >
          <Button label="Explorar el mapa" icon="map" onPress={scrollToMap} />
          <Button label="Reportar ahora" icon="megaphone" variant="lime" onPress={() => router.navigate('/report')} />
        </PageHero>

        <View
          style={[styles.container, wide && styles.containerWide]}
          onLayout={(e) => {
            containerY.current = e.nativeEvent.layout.y;
          }}
        >
          {/* MISIÓN */}
          <View style={[styles.mission, wide && styles.missionWide]}>
            <View style={[styles.missionText, wide && styles.flex]}>
              <SectionHeader
                align="left"
                eyebrow="Nuestra misión"
                icon="shield-checkmark"
                title="Saber dónde está el mercurio,"
                highlight="antes de que nos dañe."
                description="Unimos estudios, imágenes satelitales, datos de campo y avisos de la comunidad para estimar el riesgo en cada tramo del río."
              />
              <View style={styles.checks}>
                {[
                  { icon: 'eye-off-outline' as IconName, title: 'Anónimo', text: 'No pedimos tu nombre' },
                  { icon: 'cloud-offline-outline' as IconName, title: 'Sin internet', text: 'Se envía solo después' },
                ].map((c, i) => (
                  <Reveal key={c.title} delay={200 + i * 120} from="left" style={styles.check}>
                    <View style={styles.checkIcon}>
                      <Ionicons name={c.icon} size={18} color={accent.primary} />
                    </View>
                    <View>
                      <Text style={styles.checkTitle}>{c.title}</Text>
                      <Text style={styles.subtext}>{c.text}</Text>
                    </View>
                  </Reveal>
                ))}
              </View>
            </View>
            <Reveal from="scale" delay={150} style={wide ? styles.flex : undefined}>
              <ImageStatCard source={IMAGES.forestCard} value={geoCount('poblados')} suffix="" label="poblados en la zona de estudio" height={wide ? 340 : 230} />
            </Reveal>
          </View>

          {/* MAPA */}
          <View
            onLayout={(e) => {
              mapY.current = e.nativeEvent.layout.y;
            }}
            style={styles.section}
          >
            <SectionHeader
              eyebrow="Mapa de riesgo"
              icon="map"
              title="Explora tu zona"
              highlight="capa por capa"
              description={LAYERS[layer].description}
            />
            <Reveal delay={100}>{layerPills}</Reveal>
            <View style={styles.countRow}>
              {LEVEL_ORDER.map((level, i) => (
                <Reveal key={level} from="scale" delay={150 + i * 80}>
                  <View style={[styles.countPill, { backgroundColor: riskTone[level].soft, borderColor: riskTone[level].border }]}>
                    <View style={[styles.dot, { backgroundColor: riskTone[level].solid }]} />
                    <Text style={[styles.countText, { color: riskTone[level].text }]}>
                      {counts[level]} zona{counts[level] === 1 ? '' : 's'} {RISK_META[level].label.toLowerCase()}
                    </Text>
                  </View>
                </Reveal>
              ))}
            </View>

            {sideBySide ? (
              <View style={styles.explorerWide}>
                <Reveal from="blur" duration={1100} style={styles.explorerMap}>
                  {mapCard}
                </Reveal>
                <View style={styles.explorerSide}>
                  <Reveal from="right" delay={150}>
                    {detailCard}
                  </Reveal>
                </View>
              </View>
            ) : (
              <>
                <Reveal from="blur" duration={1100}>
                  {mapCard}
                </Reveal>
                <Reveal>{detailCard}</Reveal>
              </>
            )}
            <Reveal>{geoCard}</Reveal>
          </View>

          {/* ZONAS */}
          <View style={styles.section}>
            <SectionHeader eyebrow="Zonas monitoreadas" icon="location" title="Tramos del río" highlight="bajo vigilancia" />
            {zonesList}
          </View>

          {/* CÓMO FUNCIONA */}
          <View style={styles.section}>
            <SectionHeader
              eyebrow="Cómo se calcula"
              icon="sparkles"
              title="Un mapa de riesgo"
              highlight="hecho con la comunidad"
              description="Combinamos capas cuadro por cuadro y las clasificamos en bajo, medio y alto."
            />
            <View style={styles.featuresGrid}>
              {HOW_IT_WORKS.map((f, i) => (
                <Reveal key={f.title} delay={(i % 3) * 110} style={[styles.featureCell, wide && styles.featureCellWide]}>
                  <FeatureCard icon={f.icon} title={f.title} text={f.text} />
                </Reveal>
              ))}
            </View>
          </View>

          {/* PREGUNTAS FRECUENTES */}
          <View style={styles.section}>
            <SectionHeader
              eyebrow="Preguntas frecuentes"
              icon="help-circle"
              title="Lo que más nos preguntan,"
              highlight="con respuestas verificadas"
              description="Basadas en estudios del río Beni, la OMS y guías para la pequeña minería. Están guardadas en la app y funcionan sin internet."
            />
            <View style={wide ? styles.faqWide : undefined}>
              <FaqList onAsk={(item) => askAssistant(item.id)} />
            </View>
          </View>

          {/* BANDA VERDE */}
          <Reveal from="scale">
            <StatBand
              eyebrow="Súmate al monitoreo"
              title="¿Viste algo en el río?"
              subtitle="Cada aviso ayuda a proteger a las familias que viven, pescan y toman agua del río."
              stats={[
                { value: geoCount('rios') + geoCount('quebradas'), label: 'ríos y quebradas mapeados' },
                { value: geoCount('mineria_areas') + geoCount('mineria_puntos'), label: 'sitios mineros' },
                { value: geoCount('escuelas_salud'), label: 'escuelas y centros de salud' },
                { value: reports.length, label: 'avisos ciudadanos' },
              ]}
            >
              <Button label="Reportar ahora" icon="megaphone" variant="white" onPress={() => router.navigate('/report')} />
              <Button label="Preguntar al asistente" icon="chatbubbles" variant="lime" onPress={() => router.navigate('/chat')} />
            </StatBand>
          </Reveal>
        </View>

        <Footer />
      </Animated.ScrollView>
    </RevealProvider>
  );
}

/* ---------------- Subcomponentes ---------------- */

function MapButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.mapBtn, active && styles.mapBtnActive, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={15} color={active ? ink.onSolid : accent.primary} />
      <Text style={[styles.mapBtnText, active && styles.mapBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function GeoChip({ def, active, onPress }: { def: GeoLayerDef; active: boolean; onPress: () => void }) {
  const swatch =
    def.kind === 'line' ? (
      <View style={[styles.swLine, { backgroundColor: def.style.color }]} />
    ) : def.kind === 'point' ? (
      <View style={[styles.swPoint, { backgroundColor: def.style.color }]} />
    ) : (
      <View style={[styles.swPoly, { backgroundColor: def.style.fillColor ?? def.style.color, borderColor: def.style.color }]} />
    );
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.geoChip, active && styles.geoChipActive, pressed && styles.pressed]}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
      accessibilityLabel={def.name}
    >
      <View style={[styles.swWrap, !active && styles.swOff]}>{swatch}</View>
      <Text style={[styles.geoChipText, active && styles.geoChipTextActive]}>{def.short}</Text>
      <Text style={styles.geoChipCount}>{featureCount(def)}</Text>
    </Pressable>
  );
}

function ScoreBar({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <View style={styles.scoreRow}>
      <View style={styles.rowBetween}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.scoreValue}>{Math.round(v * 100)}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(v * 100)}%` as const, backgroundColor: muted ? UNCERTAIN : accent.primary }]} />
      </View>
    </View>
  );
}

function Legend({ layer, showReports }: { layer: LayerMode; showReports: boolean }) {
  return (
    <View style={styles.legend}>
      {layer === 'riesgo'
        ? (['bajo', 'medio', 'alto'] as RiskLevel[]).map((level) => (
            <View key={level} style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: riskTone[level].solid }]} />
              <Text style={styles.legendText}>{RISK_META[level].label}</Text>
            </View>
          ))
        : null}
      {layer === 'peligro' ? (
        <View style={styles.legendItem}>
          <Text style={styles.legendText}>0%</Text>
          <View style={styles.scaleBar}>
            {HAZARD_LEGEND.map((c) => (
              <View key={c} style={[styles.scaleStep, { backgroundColor: c }]} />
            ))}
          </View>
          <Text style={styles.legendText}>100%</Text>
        </View>
      ) : null}
      {layer === 'incertidumbre' ? (
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: UNCERTAIN, opacity: 0.25 }]} />
          <Text style={styles.legendText}>Seguro</Text>
          <View style={[styles.legendSwatch, { backgroundColor: UNCERTAIN, opacity: 0.85 }]} />
          <Text style={styles.legendText}>Incierto</Text>
        </View>
      ) : null}
      {showReports ? (
        <>
          <View style={styles.legendItem}>
            <View style={[styles.legendDiamond, { backgroundColor: statusTone.pendiente.solid }]} />
            <Text style={styles.legendText}>Aviso pendiente</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDiamond, { backgroundColor: statusTone.sincronizado.solid }]} />
            <Text style={styles.legendText}>Aviso enviado</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

/* ---------------- Estilos ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.floor },
  container: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingHorizontal: space.s16, gap: space.s48, paddingBottom: space.s48 },
  containerWide: { maxWidth: layout.pageMaxWidth, paddingHorizontal: space.s32, gap: space.s96 },
  section: { gap: space.s20 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8 },
  pressed: { opacity: 0.8 },
  subtext: { ...type.bodySm, fontSize: 13, lineHeight: 18, color: ink.secondary },
  mono: { ...type.data, fontWeight: '500', fontSize: 11, color: ink.body, marginTop: 4 },
  footnote: { ...type.bodySm, fontSize: 11, lineHeight: 16, color: ink.tertiary },
  cardTitle: { ...type.subheading, color: ink.heading },
  eyebrowSmall: { ...type.caption, color: accent.primary },

  mission: { gap: space.s24, marginTop: -space.s24 },
  missionWide: { flexDirection: 'row', alignItems: 'center', gap: space.s48, marginTop: 0 },
  missionText: { gap: space.s16 },
  checks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s20 },
  check: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  checkIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: accent.soft, alignItems: 'center', justifyContent: 'center' },
  checkTitle: { ...type.label, fontSize: 14, fontWeight: '700', color: ink.heading },

  filterRow: { flexDirection: 'row', gap: space.s8, alignSelf: 'center', width: '100%', maxWidth: 520 },
  filterPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: space.s8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: accent.border,
    backgroundColor: surface.panel,
  },
  filterPillActive: { backgroundColor: accent.primary, borderColor: accent.primary, ...shadow.glow },
  filterText: { ...type.label, fontSize: 13, color: accent.primary, flexShrink: 1 },
  filterTextActive: { color: ink.onSolid },
  countRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: space.s8 },
  countPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.s12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  countText: { ...type.label, fontSize: 12 },

  explorerWide: { flexDirection: 'row', gap: space.s24, alignItems: 'flex-start' },
  explorerMap: { flex: 1.6 },
  explorerSide: { flex: 1, maxWidth: 460 },

  mapCard: { borderRadius: radius.card, borderWidth: 1, borderColor: line.subtle, backgroundColor: surface.panel, padding: 6 },
  map: { flex: 1 },
  mapControls: { position: 'absolute', left: 16, bottom: 16, right: 16, flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.s12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: line.muted,
    ...shadow.card,
  },
  mapBtnActive: { backgroundColor: accent.primary, borderColor: accent.primary },
  mapBtnText: { ...type.label, fontSize: 12, color: accent.primary },
  mapBtnTextActive: { color: ink.onSolid },
  legendOverlay: {
    position: 'absolute',
    left: 16,
    top: 92,
    maxWidth: 180,
    padding: 10,
    borderRadius: radius.chip,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: line.subtle,
    ...shadow.card,
  },
  mapToast: { position: 'absolute', alignSelf: 'center', top: 16, paddingHorizontal: space.s12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: statusTone.pendiente.solid },
  mapToastText: { ...type.caption, color: ink.onSolid },
  legend: { gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  legendDiamond: { width: 9, height: 9, borderRadius: 2, transform: [{ rotate: '45deg' }], marginHorizontal: 1.5 },
  legendText: { ...type.bodySm, fontSize: 11, lineHeight: 14, color: ink.body },
  scaleBar: { flexDirection: 'row', borderRadius: 3, overflow: 'hidden' },
  scaleStep: { width: 16, height: 8 },

  detail: { borderWidth: 1.5 },
  reportBox: { gap: space.s8, paddingBottom: space.s12, borderBottomWidth: 1, borderBottomColor: line.subtle },
  reportThumb: { width: 60, height: 60, borderRadius: radius.chip, backgroundColor: surface.raised },
  reportThumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  riskBanner: { flexDirection: 'row', alignItems: 'center', gap: space.s12, padding: space.s12, borderRadius: radius.panel },
  riskIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  riskLabel: { ...type.caption, fontSize: 11 },
  detailName: { ...type.subheading, color: ink.heading, marginTop: 2 },
  metricsRow: { flexDirection: 'row', gap: space.s12 },
  metricBox: { flex: 1, backgroundColor: surface.raised, borderRadius: radius.panel, padding: space.s16, gap: 2, borderWidth: 1.5, borderColor: 'transparent' },
  metricBoxActive: { borderColor: accent.primary, backgroundColor: palette.white },
  metricLabel: { ...type.caption, color: ink.secondary },
  metricValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  metricValue: { ...type.data, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: ink.heading },
  metricUnit: { ...type.label, fontSize: 13, color: ink.secondary, marginBottom: 5 },
  metricFoot: { ...type.bodySm, fontSize: 12, color: accent.primary, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.s8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: line.subtle },
  infoLabel: { ...type.bodySm, fontSize: 13, color: ink.secondary, flexShrink: 1 },
  infoValue: { ...type.data, fontSize: 14, color: ink.heading },
  scoreRow: { gap: 6 },
  scoreLabel: { ...type.label, fontSize: 13, color: ink.body },
  scoreValue: { ...type.data, fontSize: 13, color: ink.heading },
  track: { height: 8, borderRadius: 4, backgroundColor: surface.raised, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  hintBox: { flexDirection: 'row', gap: space.s8, padding: space.s12, borderRadius: radius.input, borderLeftWidth: 4, backgroundColor: surface.raised },
  hintText: { ...type.bodySm, flex: 1, fontSize: 13, lineHeight: 19, color: ink.body },

  qgisTag: { backgroundColor: accent.soft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.badge },
  qgisTagText: { ...type.caption, color: accent.primary },
  geoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  geoChip: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: space.s12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: line.muted, backgroundColor: surface.panel },
  geoChipActive: { borderColor: accent.primary, backgroundColor: accent.soft },
  geoChipText: { ...type.label, fontSize: 12, color: ink.secondary },
  geoChipTextActive: { color: ink.heading },
  geoChipCount: { ...type.data, fontWeight: '600', fontSize: 10, color: ink.tertiary },
  swWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center' },
  swOff: { opacity: 0.35 },
  swLine: { width: 14, height: 3, borderRadius: 2 },
  swPoint: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: palette.white },
  swPoly: { width: 13, height: 11, borderRadius: 2, borderWidth: 1, opacity: 0.9 },

  zonesGrid: { gap: space.s16, flexDirection: 'row', flexWrap: 'wrap' },
  zoneCol: { flex: 1, minWidth: 280 },
  zoneCard: { width: '100%', gap: space.s8, padding: space.s20, borderRadius: radius.card, backgroundColor: surface.panel, borderWidth: 1, borderColor: line.subtle },
  zoneIndex: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: palette.white },
  zoneIndexText: { ...type.data, color: ink.onSolid, fontSize: 13 },
  levelBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  levelBadgeText: { ...type.caption, fontSize: 10 },
  zoneName: { ...type.subheading, fontSize: 16, color: ink.heading },
  zoneStats: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.s8, paddingTop: space.s12, borderTopWidth: 1, borderTopColor: line.subtle },
  zoneStatValue: { ...type.data, fontSize: 18, color: ink.heading },
  zoneStatLabel: { ...type.bodySm, fontSize: 11, color: ink.tertiary },
  zoneLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: space.s4 },
  zoneLinkText: { ...type.label, fontSize: 13, color: accent.primary },

  faqWide: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  faqLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: space.s12, borderRadius: radius.input, backgroundColor: accent.soft },
  faqLinkText: { ...type.label, flex: 1, fontSize: 13, color: accent.primary },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12 },
  featureCell: { width: '47%', flexGrow: 1 },
  featureCellWide: { width: '31%' },
});
