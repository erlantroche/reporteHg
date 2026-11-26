import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { FaqList } from '../components/eco/FaqList';
import { Button, Footer, SectionTitle, Shade } from '../components/eco/ui';
import { HgMap } from '../components/map/HgMap';
import type { MapReport, MapZone } from '../components/map/mapBridge';
import { RiverArt } from '../components/RiverArt';
import { FONT, ink, layout, line, palette, radius, riskTone, space, statusTone, surface, type } from '../constants/hg-theme';
import { reportTypeLabel } from '../constants/reportTypes';
import { useReports } from '../context/ReportsContext';
import { faqById } from '../data/faq';
import { DEFAULT_VISIBLE_LAYERS, featureCount, GEO_LAYER_DEFS, GeoLayerDef, MAP_GEO_LAYERS } from '../data/geoLayers';
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


const RISK_LABEL: Record<RiskLevel, string> = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo' };
const RISK_HINT: Record<RiskLevel, string> = {
  alto: 'Sigue los avisos locales sobre el agua y prefiere pacú, tambaquí o paiche antes que peces grandes que cazan a otros.',
  medio: 'Consulta el monitoreo local antes de usar el agua todos los días y elige con cuidado el pescado.',
  bajo: 'Sin señales fuertes por ahora. Si ves algo raro en el río, repórtalo.',
};

const LAYERS: Record<LayerMode, { label: string; description: string }> = {
  riesgo: { label: 'Riesgo', description: 'Dónde el mercurio puede dañar a personas: se combina cuánto mercurio hay, quién vive cerca y quién es más vulnerable.' },
  peligro: { label: 'Mercurio', description: `Probabilidad de que el mercurio supere ${HG_THRESHOLD_MG_KG} mg/kg en cada cuadro del mapa.` },
  incertidumbre: { label: 'Confianza', description: 'Qué tan seguros estamos. Más gris significa que faltan muestras cerca.' },
};
const LAYER_ORDER: LayerMode[] = ['riesgo', 'peligro', 'incertidumbre'];
const UNCERTAIN = '#8B8F87';

const JOURNEY: { title: string; text: string; faq: number }[] = [
  { title: 'La mina', text: 'Al quemar la amalgama sin retorta, el mercurio se vuelve vapor y cae cerca: en el suelo, las casas y el agua.', faq: 17 },
  { title: 'El río', text: 'Las colas mineras se echan al río o se escurren con la lluvia. En época de lluvias baja más mercurio.', faq: 27 },
  { title: 'Los peces', text: 'En el agua, unas bacterias lo convierten en metilmercurio. Se acumula más en los peces grandes que cazan a otros.', faq: 2 },
  { title: 'Las personas', text: 'Llega a nosotros al comer ese pescado. Los bebés en el vientre y los niños pequeños son los más afectados.', faq: 9 },
];

const confidenceLabel = (u: number) => (u <= 0.2 ? 'alta' : u <= 0.35 ? 'media' : 'baja');

export default function MapScreen() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const wide = width >= 1024;
  const sideBySide = width >= 1280;
  const scrollRef = useRef<Scrollable>(null);
  const mapY = useRef(0);

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
  const askAssistant = (faqId: number) => router.navigate({ pathname: '/chat', params: { faq: String(faqId) } });
  const scrollToMap = () => scrollRef.current?.scrollTo({ y: Math.max(0, mapY.current - 8), animated: true });

  const cells = useMemo(() => buildRiskGrid(INITIAL_RISK_ZONES, layer), [layer]);
  const bounds = useMemo(() => zonesBounds(INITIAL_RISK_ZONES), []);

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
            subtitle: `${r.createdAt}, ${r.status === 'sincronizado' ? 'enviado' : 'pendiente de envío'}`,
          }))
        : [],
    [reports, showReports]
  );

  const selectZone = (zone: RiskZone) => {
    setSelected(zone);
    setSelectedReport(null);
    const index = INITIAL_RISK_ZONES.findIndex((z) => z.id === zone.id);
    setFocus({ ...zoneCoord(zone, index), zoom: 13, key: Date.now() });
    scrollToMap();
  };

  const locateMe = async () => {
    const fix = await location.request();
    if (fix) setFocus({ lat: fix.lat, lng: fix.lng, zoom: 14, key: Date.now() });
  };

  const tone = riskTone[selected.riskLevel];
  const low = Math.max(0, selected.estimatedHgMgKg * (1 - selected.uncertainty));
  const high = selected.estimatedHgMgKg * (1 + selected.uncertainty);
  const prob = probabilityAboveThreshold(selected.estimatedHgMgKg, selected.uncertainty);
  const heroHeight = wide ? Math.min(760, Math.max(600, height - 80)) : Math.max(560, Math.min(height - 120, 680));

  /* ---------------- Bloques ---------------- */

  const hero = (
    <View style={[styles.hero, { height: heroHeight }]}>
      <RiverArt style={StyleSheet.absoluteFill} compact={!wide} />
      {wide ? <Shade direction="right" max={0.9} style={styles.shadeLeft} /> : null}
      <Shade direction="up" max={0.96} style={[styles.shadeBottom, { height: wide ? '50%' : '65%' }]} />

      <View style={[styles.heroInner, wide && styles.heroInnerWide]}>
        <View style={[styles.heroText, wide && styles.heroTextWide]}>
          <Text style={[styles.heroTitle, wide && styles.heroTitleWide]}>El mercurio viaja con el río.</Text>
          <Text style={[styles.heroLead, wide && styles.heroLeadWide]}>
            Estos son el Kaka, el Tipuani, el Mapiri y el Coroico. Cada cuadrito es un sitio minero y los puntos
            plateados muestran hacia dónde baja el mercurio. Mira el riesgo en tu zona y avisa lo que ves, aunque no
            tengas señal.
          </Text>
          <View style={styles.heroActions}>
            <Button label="Ver mi zona en el mapa" icon="map" variant="light" onPress={scrollToMap} />
            <Button label="Reportar algo" icon="megaphone-outline" variant="ghostLight" onPress={() => router.navigate('/report')} />
          </View>
        </View>
        <View style={[styles.heroLegend, wide && styles.heroLegendWide]}>
          <LegendMark kind="mine" label="Sitio minero" />
          <LegendMark kind="mercury" label="Mercurio bajando (ilustrativo)" />
          <LegendMark kind="town" label="Poblado" />
        </View>
      </View>
    </View>
  );

  const journey = (
    <View style={[styles.band, styles.bandArena]}>
      <View style={[styles.container, wide && styles.containerWide]}>
        <SectionTitle title="Cómo llega el mercurio a tu mesa" lead="Es un recorrido de cuatro pasos. Cortar cualquiera de ellos protege a tu familia." />
        <View style={[styles.journey, wide && styles.journeyTwo, sideBySide && styles.journeyWide]}>
          {JOURNEY.map((step, i) => (
            <Pressable key={step.title} onPress={() => askAssistant(step.faq)} style={({ pressed }) => [styles.step, wide && styles.stepTwo, sideBySide && styles.stepWide, pressed && styles.pressed]}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
              <Text style={styles.stepLink}>Saber más</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );

  const mapPanel = (
    <View style={[styles.mapFrame, { height: wide ? 620 : 460 }]}>
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
        <MapButton icon={location.status === 'loading' ? 'hourglass-outline' : 'locate'} label="Dónde estoy" onPress={locateMe} active={!!location.fix} />
        <MapButton icon="scan-outline" label="Ver todas las zonas" onPress={() => setFitKey((k) => k + 1)} />
        <MapButton icon={showReports ? 'flag' : 'flag-outline'} label={`Avisos (${reports.length})`} onPress={() => setShowReports((v) => !v)} active={showReports} />
      </View>
      {location.status === 'denied' ? (
        <View style={styles.mapToast} pointerEvents="none">
          <Text style={styles.mapToastText}>No diste permiso de ubicación</Text>
        </View>
      ) : null}
    </View>
  );

  const detail = (
    <View style={[styles.detail, sideBySide && styles.detailSide]}>
      {selectedReport ? (
        <View style={styles.reportBox}>
          {selectedReport.photoUri ? (
            <Image source={{ uri: selectedReport.photoUri }} style={styles.reportThumb} contentFit="cover" />
          ) : null}
          <View style={styles.flex}>
            <Text style={styles.reportTitle}>Aviso: {reportTypeLabel(selectedReport)}</Text>
            <Text style={styles.small} numberOfLines={2}>
              {selectedReport.description}
            </Text>
            <Text style={styles.mono}>
              {selectedReport.createdAt}, {Number(selectedReport.latitude).toFixed(4)}, {Number(selectedReport.longitude).toFixed(4)}
            </Text>
          </View>
          <Pressable onPress={() => setSelectedReport(null)} hitSlop={10} accessibilityLabel="Cerrar aviso">
            <Ionicons name="close" size={18} color={ink.secondary} />
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.riskHead, { borderLeftColor: tone.solid }]}>
        <Text style={[styles.riskWord, { color: tone.text }]}>{RISK_LABEL[selected.riskLevel]}</Text>
        <Text style={styles.zoneName}>{selected.name}</Text>
        <Text style={styles.small}>{selected.riverOrArea}</Text>
      </View>

      <View style={styles.figures}>
        <Figure value={selected.estimatedHgMgKg.toFixed(2)} unit="mg/kg" label="Mercurio estimado" active={layer === 'peligro'} />
        <Figure value={`±${Math.round(selected.uncertainty * 100)}`} unit="%" label={`Confianza ${confidenceLabel(selected.uncertainty)}`} active={layer === 'incertidumbre'} />
        <Figure value={`${Math.round(prob * 100)}`} unit="%" label={`Prob. de pasar ${HG_THRESHOLD_MG_KG}`} />
      </View>
      <Text style={styles.small}>
        Rango probable: {low.toFixed(2)} a {high.toFixed(2)} mg/kg.
      </Text>

      <Meter label="Personas expuestas" value={selected.exposureScore} />
      <Meter label="Vulnerabilidad" value={selected.vulnerabilityScore} />

      <Text style={styles.hint}>{RISK_HINT[selected.riskLevel]}</Text>

      <View style={styles.faqLinks}>
        {[1, 25].map((id) => {
          const f = faqById(id);
          return f ? (
            <Pressable key={id} onPress={() => askAssistant(id)} style={({ pressed }) => [styles.faqLink, pressed && styles.pressed]}>
              <Ionicons name="help-circle-outline" size={17} color={palette.rio} />
              <Text style={styles.faqLinkText}>{f.pregunta}</Text>
            </Pressable>
          ) : null;
        })}
      </View>
      <Button label="Reportar algo en esta zona" icon="megaphone-outline" variant="outline" onPress={() => router.navigate('/report')} />
    </View>
  );

  const layersList = (
    <View style={styles.layersBox}>
      <Text style={styles.layersTitle}>Qué se ve en el mapa</Text>
      <View style={[styles.layersGrid, wide && styles.layersGridWide]}>
        {GEO_LAYER_DEFS.map((def) => (
          <LayerToggle key={def.id} def={def} active={visibleLayers.includes(def.id)} onPress={() => toggleLayer(def.id)} />
        ))}
      </View>
      <Text style={styles.footnote}>Capas preparadas en QGIS con datos de OpenStreetMap. Toca un río, un poblado o un área minera para ver su nombre.</Text>
    </View>
  );

  const mapSection = (
    <View
      style={[styles.band, styles.bandWhite]}
      onLayout={(e) => {
        mapY.current = e.nativeEvent.layout.y;
      }}
    >
      <View style={[styles.container, wide && styles.containerWide]}>
        <SectionTitle title="Mapa de riesgo" lead={LAYERS[layer].description} />
        <View style={styles.tabs} accessibilityRole="tablist">
          {LAYER_ORDER.map((item) => {
            const active = layer === item;
            return (
              <Pressable key={item} onPress={() => setLayer(item)} style={[styles.tab, active && styles.tabActive]} accessibilityRole="tab" accessibilityState={{ selected: active }}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{LAYERS[item].label}</Text>
              </Pressable>
            );
          })}
          <View style={styles.tabLegend}>
            <Legend layer={layer} />
          </View>
        </View>

        {sideBySide ? (
          <View style={styles.explorerRow}>
            <View style={styles.explorerMap}>{mapPanel}</View>
            {detail}
          </View>
        ) : (
          <>
            {mapPanel}
            {detail}
          </>
        )}
        {layersList}
      </View>
    </View>
  );

  const zonesSection = (
    <View style={[styles.band, styles.bandArena]}>
      <View style={[styles.container, wide && styles.containerWide]}>
        <SectionTitle title="Tramos vigilados" lead="Toca un tramo para verlo en el mapa." />
        <View style={styles.table}>
          {wide ? (
            <View style={[styles.row, styles.rowHead]}>
              <Text style={[styles.cellHead, styles.cellName]}>Tramo</Text>
              <Text style={[styles.cellHead, styles.cellNum]}>Mercurio</Text>
              <Text style={[styles.cellHead, styles.cellNum]}>Confianza</Text>
              <Text style={[styles.cellHead, styles.cellRisk]}>Nivel</Text>
            </View>
          ) : null}
          {INITIAL_RISK_ZONES.map((zone, i) => {
            const t = riskTone[zone.riskLevel];
            const isSel = zone.id === selected.id;
            return (
              <Pressable key={zone.id} onPress={() => selectZone(zone)} style={({ pressed }) => [styles.row, !wide && styles.rowStack, isSel && styles.rowSelected, pressed && styles.pressed]}>
                <View style={[styles.cellName, styles.nameCell]}>
                  <View style={[styles.zoneDot, { backgroundColor: zoneColor(zone) }]}>
                    <Text style={styles.zoneDotText}>{i + 1}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.rowTitle}>{zone.name}</Text>
                    <Text style={styles.small}>{zone.riverOrArea}</Text>
                  </View>
                </View>
                <Text style={[styles.cellNum, styles.rowNumber]}>
                  {zone.estimatedHgMgKg.toFixed(2)} <Text style={styles.rowUnit}>mg/kg</Text>
                </Text>
                <Text style={[styles.cellNum, styles.rowNumber]}>±{Math.round(zone.uncertainty * 100)}%</Text>
                <View style={styles.cellRisk}>
                  <View style={[styles.levelChip, { backgroundColor: t.soft, borderColor: t.border }]}>
                    <View style={[styles.levelDot, { backgroundColor: t.solid }]} />
                    <Text style={[styles.levelText, { color: t.text }]}>{RISK_LABEL[zone.riskLevel]}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );

  const faqSection = (
    <View style={[styles.band, styles.bandWhite]}>
      <View style={[styles.container, wide && styles.containerWide, sideBySide && styles.faqRow]}>
        <SectionTitle
          style={sideBySide ? styles.faqIntro : undefined}
          title="Preguntas frecuentes"
          lead="Respuestas revisadas con estudios del río Beni, la OMS y guías de pequeña minería. Están guardadas en la app y se pueden leer sin señal."
        />
        <View style={styles.flex}>
          <FaqList onAsk={(item) => askAssistant(item.id)} askLabel="Abrir en el asistente" />
        </View>
      </View>
    </View>
  );

  const reportCall = (
    <View style={[styles.band, styles.bandRio]}>
      <View style={[styles.container, wide && styles.containerWide, sideBySide && styles.callRow]}>
        <View style={styles.flex}>
          <Text style={[styles.callTitle, wide && styles.callTitleWide]}>¿Viste una draga, agua turbia, una quema o peces muertos?</Text>
          <Text style={styles.callLead}>Repórtalo en tres pasos. No pedimos tu nombre y funciona sin señal: se envía solo cuando vuelve el internet.</Text>
        </View>
        <Button label="Reportar ahora" icon="megaphone-outline" variant="light" onPress={() => router.navigate('/report')} />
      </View>
    </View>
  );

  return (
    <ScrollView ref={scrollRef as never} style={styles.screen}>
      {hero}
      {journey}
      {mapSection}
      {zonesSection}
      {faqSection}
      {reportCall}
      <Footer />
    </ScrollView>
  );
}

/* ---------------- Subcomponentes ---------------- */

function LegendMark({ kind, label }: { kind: 'mine' | 'mercury' | 'town'; label: string }) {
  return (
    <View style={styles.legendMark}>
      {kind === 'mine' ? <View style={styles.markMine} /> : kind === 'mercury' ? <View style={styles.markMercury} /> : <View style={styles.markTown} />}
      <Text style={styles.legendMarkText}>{label}</Text>
    </View>
  );
}

function MapButton({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.mapBtn, active && styles.mapBtnActive, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={label}>
      <Ionicons name={icon} size={15} color={active ? palette.arena : palette.selva} />
      <Text style={[styles.mapBtnText, active && styles.mapBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Figure({ value, unit, label, active }: { value: string; unit: string; label: string; active?: boolean }) {
  return (
    <View style={[styles.figure, active && styles.figureActive]}>
      <Text style={styles.figureValue}>
        {value}
        <Text style={styles.figureUnit}> {unit}</Text>
      </Text>
      <Text style={styles.figureLabel}>{label}</Text>
    </View>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const v = Math.min(1, Math.max(0, value));
  return (
    <View style={styles.meter}>
      <View style={styles.meterHead}>
        <Text style={styles.meterLabel}>{label}</Text>
        <Text style={styles.meterValue}>{Math.round(v * 100)}%</Text>
      </View>
      <View style={styles.meterTrack}>
        <View style={[styles.meterFill, { width: `${Math.round(v * 100)}%` as const }]} />
      </View>
    </View>
  );
}

function LayerToggle({ def, active, onPress }: { def: GeoLayerDef; active: boolean; onPress: () => void }) {
  const swatch =
    def.kind === 'line' ? (
      <View style={[styles.swLine, { backgroundColor: def.style.color }]} />
    ) : def.kind === 'point' ? (
      <View style={[styles.swPoint, { backgroundColor: def.style.color }]} />
    ) : (
      <View style={[styles.swPoly, { backgroundColor: def.style.fillColor ?? def.style.color, borderColor: def.style.color }]} />
    );
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.toggle, pressed && styles.pressed]} accessibilityRole="checkbox" accessibilityState={{ checked: active }} accessibilityLabel={def.name}>
      <View style={[styles.checkbox, active && styles.checkboxOn]}>{active ? <Ionicons name="checkmark" size={13} color={palette.arena} /> : null}</View>
      <View style={styles.swWrap}>{swatch}</View>
      <Text style={[styles.toggleText, !active && styles.toggleTextOff]}>{def.name}</Text>
      <Text style={styles.toggleCount}>{featureCount(def)}</Text>
    </Pressable>
  );
}

function Legend({ layer }: { layer: LayerMode }) {
  if (layer === 'riesgo') {
    return (
      <View style={styles.legend}>
        {(['bajo', 'medio', 'alto'] as RiskLevel[]).map((level) => (
          <View key={level} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: riskTone[level].solid }]} />
            <Text style={styles.legendText}>{level === 'bajo' ? 'Bajo' : level === 'medio' ? 'Medio' : 'Alto'}</Text>
          </View>
        ))}
      </View>
    );
  }
  if (layer === 'peligro') {
    return (
      <View style={styles.legend}>
        <Text style={styles.legendText}>0%</Text>
        <View style={styles.scaleBar}>
          {HAZARD_LEGEND.map((c) => (
            <View key={c} style={[styles.scaleStep, { backgroundColor: c }]} />
          ))}
        </View>
        <Text style={styles.legendText}>100%</Text>
      </View>
    );
  }
  return (
    <View style={styles.legend}>
      <View style={[styles.legendSwatch, { backgroundColor: UNCERTAIN, opacity: 0.3 }]} />
      <Text style={styles.legendText}>Más seguro</Text>
      <View style={[styles.legendSwatch, { backgroundColor: UNCERTAIN }]} />
      <Text style={styles.legendText}>Menos seguro</Text>
    </View>
  );
}

/* ---------------- Estilos ---------------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.floor },
  flex: { flex: 1 },
  pressed: { opacity: 0.75 },
  small: { ...type.bodySm, fontSize: 13, lineHeight: 19, color: ink.secondary },
  mono: { ...type.data, fontSize: 12, color: ink.body, marginTop: 4 },
  footnote: { ...type.bodySm, fontSize: 12, lineHeight: 17, color: ink.tertiary },

  container: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', paddingHorizontal: space.s20, gap: space.s24 },
  containerWide: { maxWidth: layout.pageMaxWidth, paddingHorizontal: space.s40, gap: space.s32 },
  band: { paddingVertical: space.s48 },
  bandArena: { backgroundColor: palette.arena },
  bandWhite: { backgroundColor: palette.white },
  bandRio: { backgroundColor: palette.rio, paddingVertical: space.s40 },

  /* Hero */
  hero: { backgroundColor: palette.selva, overflow: 'hidden' },
  shadeLeft: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '60%' },
  shadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%' },
  heroInner: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.s20, paddingBottom: space.s32, gap: space.s20 },
  heroInnerWide: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: space.s48, paddingBottom: space.s48, width: '100%', maxWidth: 1280, alignSelf: 'center' },
  heroText: { gap: space.s16, maxWidth: 560, flexShrink: 1 },
  heroTextWide: { maxWidth: 620 },
  heroTitle: { ...type.display, fontSize: 52, lineHeight: 50, color: palette.arena },
  heroTitleWide: { fontSize: 88, lineHeight: 84, letterSpacing: -1.6 },
  heroLead: { ...type.body, fontSize: 16, lineHeight: 25, color: ink.onDarkSoft },
  heroLeadWide: { fontSize: 18, lineHeight: 28 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s12, marginTop: space.s4 },
  heroLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s16 },
  heroLegendWide: { flexDirection: 'column', gap: space.s8, alignItems: 'flex-start' },
  legendMark: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  legendMarkText: { ...type.bodySm, fontSize: 12, color: ink.onDarkSoft },
  markMine: { width: 9, height: 9, borderWidth: 1, borderColor: palette.mercurio },
  markMercury: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.mercurioLight },
  markTown: { width: 7, height: 7, borderRadius: 4, backgroundColor: palette.arena },

  /* Recorrido del mercurio */
  journey: { gap: 0 },
  journeyTwo: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s32 },
  journeyWide: { flexWrap: 'nowrap', columnGap: space.s24 },
  step: { paddingVertical: space.s20, borderTopWidth: 2, borderTopColor: palette.selva, gap: space.s8 },
  stepTwo: { width: '46%', flexGrow: 1 },
  stepWide: { width: undefined, flex: 1 },
  stepNumber: { fontFamily: FONT.narrowBold, fontSize: 44, lineHeight: 44, color: palette.rio },
  stepTitle: { ...type.subheading, fontSize: 24, color: ink.heading },
  stepText: { ...type.body, fontSize: 15, lineHeight: 23, color: ink.body },
  stepLink: { fontFamily: FONT.textSemi, fontSize: 14, color: palette.rio, textDecorationLine: 'underline' },

  /* Mapa */
  tabs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: space.s24, borderBottomWidth: 1, borderBottomColor: line.muted },
  tab: { paddingVertical: space.s12, borderBottomWidth: 3, borderBottomColor: 'transparent', marginBottom: -1 },
  tabActive: { borderBottomColor: palette.selva },
  tabText: { fontFamily: FONT.narrowSemi, fontSize: 20, color: ink.tertiary },
  tabTextActive: { color: palette.selva },
  tabLegend: { marginLeft: 'auto', paddingBottom: space.s12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.s8, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 14, height: 10 },
  legendText: { ...type.bodySm, fontSize: 12, color: ink.secondary },
  scaleBar: { flexDirection: 'row' },
  scaleStep: { width: 18, height: 10 },

  explorerRow: { flexDirection: 'row', gap: space.s32, alignItems: 'flex-start' },
  explorerMap: { flex: 1.65 },
  mapFrame: { borderRadius: radius.badge, overflow: 'hidden', borderWidth: 1, borderColor: line.muted, backgroundColor: palette.arena },
  map: { flex: 1, borderRadius: 0 },
  mapControls: { position: 'absolute', left: 12, bottom: 12, right: 12, flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  mapBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: space.s12, paddingVertical: 8, borderRadius: radius.input, backgroundColor: palette.arena, borderWidth: 1, borderColor: line.ghost },
  mapBtnActive: { backgroundColor: palette.selva, borderColor: palette.selva },
  mapBtnText: { fontFamily: FONT.textSemi, fontSize: 13, color: palette.selva },
  mapBtnTextActive: { color: palette.arena },
  mapToast: { position: 'absolute', alignSelf: 'center', top: 12, paddingHorizontal: space.s12, paddingVertical: 6, borderRadius: radius.input, backgroundColor: palette.selva },
  mapToastText: { ...type.caption, color: palette.arena },

  detail: { gap: space.s16 },
  detailSide: { flex: 1, maxWidth: 420 },
  reportBox: { flexDirection: 'row', gap: space.s12, alignItems: 'flex-start', padding: space.s12, backgroundColor: surface.raised, borderRadius: radius.input },
  reportThumb: { width: 56, height: 56, borderRadius: radius.badge },
  reportTitle: { fontFamily: FONT.textSemi, fontSize: 15, color: ink.heading },
  riskHead: { borderLeftWidth: 6, paddingLeft: space.s16, gap: 4 },
  riskWord: { fontFamily: FONT.narrowBold, fontSize: 40, lineHeight: 42 },
  zoneName: { fontFamily: FONT.narrowSemi, fontSize: 22, lineHeight: 26, color: ink.heading },
  figures: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: line.muted },
  figure: { flex: 1, paddingVertical: space.s12, paddingRight: space.s8, gap: 2 },
  figureActive: { backgroundColor: surface.raised, paddingLeft: space.s8 },
  figureValue: { fontFamily: FONT.narrowBold, fontSize: 32, lineHeight: 36, color: ink.heading, fontVariant: ['tabular-nums'] },
  figureUnit: { fontFamily: FONT.text, fontSize: 13, color: ink.secondary },
  figureLabel: { ...type.bodySm, fontSize: 12, lineHeight: 16, color: ink.secondary },
  meter: { gap: 6 },
  meterHead: { flexDirection: 'row', justifyContent: 'space-between' },
  meterLabel: { fontFamily: FONT.textSemi, fontSize: 14, color: ink.body },
  meterValue: { ...type.data, fontSize: 15, color: ink.heading },
  meterTrack: { height: 6, backgroundColor: surface.overlay },
  meterFill: { height: 6, backgroundColor: palette.rio },
  hint: { ...type.body, fontSize: 15, lineHeight: 23, color: ink.body },
  faqLinks: { gap: 2 },
  faqLink: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  faqLinkText: { fontFamily: FONT.textSemi, fontSize: 14, color: palette.rio, flex: 1, textDecorationLine: 'underline' },

  layersBox: { gap: space.s12, paddingTop: space.s16, borderTopWidth: 1, borderTopColor: line.subtle },
  layersTitle: { ...type.subheading, color: ink.heading },
  layersGrid: { gap: 2 },
  layersGridWide: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.s32 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: space.s12, paddingVertical: 8, minWidth: 260 },
  checkbox: { width: 20, height: 20, borderRadius: 3, borderWidth: 1.5, borderColor: palette.selva, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: palette.selva },
  swWrap: { width: 16, alignItems: 'center' },
  swLine: { width: 16, height: 3 },
  swPoint: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: palette.white },
  swPoly: { width: 14, height: 11, borderWidth: 1 },
  toggleText: { ...type.bodySm, fontSize: 14, color: ink.body },
  toggleTextOff: { color: ink.tertiary },
  toggleCount: { ...type.data, fontSize: 13, color: ink.tertiary },

  /* Tabla de tramos */
  table: { borderTopWidth: 2, borderTopColor: palette.selva },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.s16, paddingVertical: space.s16, borderBottomWidth: 1, borderBottomColor: line.muted },
  rowStack: { flexWrap: 'wrap', rowGap: space.s8 },
  rowHead: { paddingVertical: space.s8 },
  rowSelected: { backgroundColor: 'rgba(23,51,38,0.06)' },
  cellHead: { fontFamily: FONT.textSemi, fontSize: 13, color: ink.secondary },
  cellName: { flex: 3, minWidth: 240 },
  cellNum: { flex: 1, minWidth: 90 },
  cellRisk: { flex: 1.2, minWidth: 130 },
  nameCell: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  zoneDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  zoneDotText: { fontFamily: FONT.narrowBold, fontSize: 15, color: palette.white },
  rowTitle: { fontFamily: FONT.narrowSemi, fontSize: 19, lineHeight: 23, color: ink.heading },
  rowNumber: { fontFamily: FONT.narrowSemi, fontSize: 20, color: ink.heading, fontVariant: ['tabular-nums'] },
  rowUnit: { fontFamily: FONT.text, fontSize: 12, color: ink.secondary },
  levelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, borderWidth: 1 },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  levelText: { fontFamily: FONT.textSemi, fontSize: 13 },

  /* Preguntas */
  faqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.s64 },
  faqIntro: { width: 340 },

  /* Llamado a reportar */
  callRow: { flexDirection: 'row', alignItems: 'center', gap: space.s40 },
  callTitle: { fontFamily: FONT.narrowBold, fontSize: 32, lineHeight: 34, color: palette.white },
  callTitleWide: { fontSize: 40, lineHeight: 42 },
  callLead: { ...type.body, color: 'rgba(255,255,255,0.86)', marginTop: space.s8, maxWidth: 620 },
});
