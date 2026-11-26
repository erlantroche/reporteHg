import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button, Footer, IMAGES, PageHero } from '../components/eco/ui';
import { FaqSource } from '../components/eco/FaqList';
import { HgMap } from '../components/map/HgMap';
import { Reveal, RevealProvider, useRevealScroll } from '../components/motion/Reveal';
import type { MapPoint } from '../components/map/mapBridge';
import {
  accent,
  ink,
  layout,
  line,
  palette,
  radius,
  shadow,
  space,
  statusTone,
  surface,
  type,
} from '../constants/hg-theme';
import { REPORT_TYPES, reportTypeInfo, reportTypeLabel } from '../constants/reportTypes';
import { useReports } from '../context/ReportsContext';
import { faqById, FAQ_FOR_REPORT_TYPE } from '../data/faq';
import { CitizenReport, ReportType } from '../data/mocks';
import { DEFAULT_CENTER } from '../data/zoneGeo';
import { useRouter } from 'expo-router';
import { useCurrentLocation } from '../hooks/useCurrentLocation';

type IonName = keyof typeof Ionicons.glyphMap;

const WIDE_BREAKPOINT = 1024;
const DEPARTMENT_SUGGESTIONS = ['La Paz', 'Beni', 'Pando'];

const STATUS_META: Record<CitizenReport['status'], { label: string; icon: IonName; hint: string }> = {
  pendiente: { label: 'Pendiente', icon: 'cloud-offline-outline', hint: 'Guardado en este celular' },
  sincronizado: { label: 'Sincronizado', icon: 'cloud-done-outline', hint: 'Enviado al servidor' },
};

const STEPS: { icon: IonName; title: string; text: string }[] = [
  { icon: 'eye-outline', title: 'Elige qué viste', text: 'Draga, agua turbia, quema o peces muertos.' },
  { icon: 'camera-outline', title: 'Foto y lugar', text: 'Toma una foto. El GPS marca el lugar solo.' },
  { icon: 'paper-plane-outline', title: 'Guarda', text: 'Sin señal se guarda aquí y se envía solo después.' },
];

type Place = MapPoint & { source: 'gps' | 'mapa'; accuracy?: number | null };

export default function ReportScreen() {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT;
  const twoCols = width >= 1280;

  const {
    reports,
    pendingCount,
    isOnline,
    networkOnline,
    simulateOffline,
    setSimulateOffline,
    syncing,
    lastSyncAt,
    saveReport,
    syncNow,
  } = useReports();

  const router = useRouter();
  const location = useCurrentLocation({ auto: true });
  const reveal = useRevealScroll();
  const scrollRef = useRef<{ scrollTo: (o: { y: number; animated?: boolean }) => void } | null>(null);
  const formY = useRef(0);
  const contentY = useRef(0);
  const scrollToForm = () => scrollRef.current?.scrollTo({ y: Math.max(0, contentY.current + formY.current - 12), animated: true });

  const [type, setType] = useState<ReportType>('agua_turbia');
  const [department, setDepartment] = useState('La Paz');
  const [municipalityOrCommunity, setMunicipalityOrCommunity] = useState('');
  const [machineryOrActor, setMachineryOrActor] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [optionalContact, setOptionalContact] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const [mapFocus, setMapFocus] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [detail, setDetail] = useState<CitizenReport | null>(null);

  const syncedCount = reports.length - pendingCount;

  // Cuando llega el GPS y el usuario no movió el pin, usamos esa ubicación.
  useEffect(() => {
    const fix = location.fix;
    if (!fix) return;
    setPlace((prev) => (prev && prev.source === 'mapa' ? prev : { lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, source: 'gps' }));
    setMapFocus({ lat: fix.lat, lng: fix.lng, zoom: 15, key: fix.timestamp });
  }, [location.fix]);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4500);
    return () => clearTimeout(timer);
  }, [feedback]);

  const takePhoto = async () => {
    setPhotoError(null);
    try {
      if (Platform.OS !== 'web') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          setPhotoError('Permiso de cámara denegado. Puedes elegir una foto de la galería.');
          return;
        }
      }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch {
      setPhotoError('No se pudo abrir la cámara en este dispositivo.');
    }
  };

  const pickFromGallery = async () => {
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
      if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
    } catch {
      setPhotoError('No se pudo abrir la galería.');
    }
  };

  const locateMe = async () => {
    const fix = await location.request();
    if (fix) {
      setPlace({ lat: fix.lat, lng: fix.lng, accuracy: fix.accuracy, source: 'gps' });
      setMapFocus({ lat: fix.lat, lng: fix.lng, zoom: 15, key: Date.now() });
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await saveReport({
        type,
        description,
        department,
        municipalityOrCommunity: municipalityOrCommunity.trim() || 'Por confirmar en campo',
        machineryOrActor: machineryOrActor.trim() || undefined,
        isAnonymous,
        optionalContact: !isAnonymous && optionalContact.trim() ? optionalContact.trim() : undefined,
        latitude: place?.lat,
        longitude: place?.lng,
        photoUri: photoUri ?? undefined,
      });
      setDescription('');
      setMunicipalityOrCommunity('');
      setMachineryOrActor('');
      setOptionalContact('');
      setPhotoUri(null);
      setFeedback(
        isOnline
          ? 'Aviso guardado. Se está enviando ahora mismo.'
          : 'Aviso guardado en tu celular. Se enviará solo cuando vuelva la señal.'
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Bloques ---------- */

  const connectionBanner = (
    <View
      style={[
        styles.connBanner,
        { borderColor: (isOnline ? statusTone.sincronizado : statusTone.pendiente).border },
      ]}
    >
      <View style={[styles.connIcon, { backgroundColor: (isOnline ? statusTone.sincronizado : statusTone.pendiente).soft }]}>
        {syncing ? (
          <ActivityIndicator size="small" color={statusTone.sincronizado.text} />
        ) : (
          <Ionicons
            name={isOnline ? 'wifi' : 'cloud-offline-outline'}
            size={18}
            color={(isOnline ? statusTone.sincronizado : statusTone.pendiente).text}
          />
        )}
      </View>
      <View style={styles.flex}>
        <Text style={styles.connTitle}>
          {syncing ? 'Enviando avisos…' : isOnline ? 'Con señal' : 'Sin señal'}
        </Text>
        <Text style={styles.connText}>
          {isOnline
            ? pendingCount > 0
              ? `${pendingCount} aviso(s) por enviar. Se envían solos.`
              : lastSyncAt
              ? `Todo enviado · ${lastSyncAt.toLocaleTimeString().slice(0, 5)}`
              : 'Tus avisos se envían automáticamente.'
            : 'Puedes reportar igual: se guarda aquí y se envía solo cuando vuelva la señal.'}
        </Text>
      </View>
      {isOnline && pendingCount > 0 && !syncing ? (
        <Pressable onPress={syncNow} style={styles.connAction} hitSlop={8}>
          <Text style={styles.connActionText}>Enviar</Text>
        </Pressable>
      ) : null}
    </View>
  );

  const stepsBlock = (
    <View style={styles.stepsCard}>
      <Text style={styles.stepsEyebrow}>Así de fácil</Text>
      <View style={styles.stepsRow}>
        {STEPS.map((s, i) => (
          <View key={s.title} style={styles.stepItem}>
            <View style={styles.stepCircle}>
              <Ionicons name={s.icon} size={18} color={accent.primary} />
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
            </View>
            <Text style={styles.stepTitle}>{s.title}</Text>
            <Text style={styles.stepDesc}>{s.text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const typeSection = (
    <Section step={1} title="¿Qué observaste?">
      <View style={styles.grid}>
        {REPORT_TYPES.map((item) => {
          const active = type === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => setType(item.id)}
              style={({ pressed }) => [styles.typeTile, active && styles.typeTileActive, pressed && !active && styles.pressedSurface]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
            >
              <View style={[styles.typeIcon, active && styles.typeIconActive]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={active ? ink.onSolid : accent.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.typeText, active && styles.typeTextActive]} numberOfLines={2}>
                  {item.label}
                </Text>
                <Text style={styles.typeHint} numberOfLines={2}>
                  {item.hint}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );

  const tipFaq = faqById(FAQ_FOR_REPORT_TYPE[type]?.[0] ?? 0);
  const tipCard = tipFaq ? (
    <View style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <View style={styles.tipIcon}>
          <Ionicons name="bulb" size={16} color={accent.primary} />
        </View>
        <Text style={styles.tipEyebrow}>Mientras reportas · consejo verificado</Text>
      </View>
      <Text style={styles.tipQuestion}>{tipFaq.pregunta}</Text>
      <Text style={styles.tipAnswer} numberOfLines={4}>
        {tipFaq.respuesta}
      </Text>
      <FaqSource item={tipFaq} compact />
      <Pressable
        onPress={() => router.navigate({ pathname: '/chat', params: { faq: String(tipFaq.id) } })}
        style={({ pressed }) => [styles.tipLink, pressed && styles.pressedSurface]}
      >
        <Text style={styles.tipLinkText}>Leer completo en el asistente</Text>
        <Ionicons name="arrow-forward" size={14} color={accent.primary} />
      </Pressable>
    </View>
  ) : null;

  const photoSection = (
    <Section step={2} title="Foto" optional>
      {photoUri ? (
        <View style={styles.photoPreviewWrap}>
          <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
          <View style={styles.photoActions}>
            <SmallButton icon="camera-reverse-outline" label="Otra foto" onPress={takePhoto} />
            <SmallButton icon="images-outline" label="Galería" onPress={pickFromGallery} />
            <SmallButton icon="trash-outline" label="Quitar" onPress={() => setPhotoUri(null)} />
          </View>
        </View>
      ) : (
        <View style={styles.photoButtons}>
          <Pressable style={({ pressed }) => [styles.photoBtn, pressed && styles.pressedSurface]} onPress={takePhoto}>
            <View style={[styles.photoBtnIcon, { backgroundColor: accent.primary }]}>
              <Ionicons name="camera" size={24} color={ink.onSolid} />
            </View>
            <Text style={styles.photoBtnTitle}>Tomar foto</Text>
            <Text style={styles.photoBtnText}>Abre la cámara</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.photoBtn, pressed && styles.pressedSurface]} onPress={pickFromGallery}>
            <View style={styles.photoBtnIcon}>
              <Ionicons name="images-outline" size={24} color={accent.primary} />
            </View>
            <Text style={styles.photoBtnTitle}>Desde galería</Text>
            <Text style={styles.photoBtnText}>Elige una foto guardada</Text>
          </Pressable>
        </View>
      )}
      {photoError ? <Text style={styles.errorText}>{photoError}</Text> : null}
      <Text style={styles.helperText}>Evita que se vean caras o placas: el aviso es anónimo.</Text>
    </Section>
  );

  const gpsLabel =
    location.status === 'loading' && !place
      ? 'Buscando señal GPS…'
      : location.status === 'denied'
      ? 'Permiso de ubicación denegado: marca el lugar en el mapa.'
      : location.status === 'unavailable' && !place
      ? 'No se obtuvo GPS: marca el lugar en el mapa.'
      : place?.source === 'mapa'
      ? 'Lugar marcado a mano en el mapa'
      : place
      ? `Ubicación GPS${place.accuracy ? ` · precisión ±${Math.round(place.accuracy)} m` : ''}`
      : 'Ubicación pendiente';

  const placeSection = (
    <Section step={3} title="¿Dónde ocurrió?">
      <View style={styles.gpsRow}>
        <View
          style={[
            styles.gpsIcon,
            place ? { backgroundColor: accent.soft, borderColor: accent.border } : { backgroundColor: surface.overlay, borderColor: line.muted },
          ]}
        >
          {location.status === 'loading' ? (
            <ActivityIndicator size="small" color={accent.primary} />
          ) : (
            <Ionicons name={place?.source === 'mapa' ? 'hand-left-outline' : 'navigate'} size={18} color={place ? accent.primary : ink.secondary} />
          )}
        </View>
        <View style={styles.flex}>
          <Text style={styles.gpsTitle}>{gpsLabel}</Text>
          <Text style={styles.coords}>
            {place ? `${place.lat.toFixed(5)}, ${place.lng.toFixed(5)}` : '—'}
          </Text>
        </View>
        <SmallButton icon="locate" label="Mi GPS" onPress={locateMe} />
      </View>

      <View style={styles.pickMapWrap}>
        <HgMap
          center={place ?? DEFAULT_CENTER}
          zoom={place ? 15 : 10}
          mode="pick"
          pick={place}
          me={location.fix ? { lat: location.fix.lat, lng: location.fix.lng, accuracy: location.fix.accuracy } : null}
          focus={mapFocus}
          onPick={(p) => setPlace({ ...p, source: 'mapa' })}
          style={styles.pickMap}
        />
      </View>
      <Text style={styles.helperText}>
        Toca el mapa o arrastra el pin azul si el lugar no es exacto. Sin internet el mapa no carga, pero el GPS sí funciona.
      </Text>

      <Field label="Departamento" icon="map-outline">
        <Input placeholder="Ej. La Paz, Beni, Pando..." value={department} onChangeText={setDepartment} />
        <View style={styles.chipsRow}>
          {DEPARTMENT_SUGGESTIONS.map((d) => {
            const active = department.trim().toLowerCase() === d.toLowerCase();
            return (
              <Pressable key={d} onPress={() => setDepartment(d)} style={[styles.chip, active && styles.chipActive]}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
              </Pressable>
            );
          })}
        </View>
      </Field>
      <Field label="Comunidad o punto de referencia" icon="location-outline" optional>
        <Input placeholder="Ej. cerca del puente, playa del río..." value={municipalityOrCommunity} onChangeText={setMunicipalityOrCommunity} />
      </Field>
    </Section>
  );

  const detailsSection = (
    <Section step={4} title="Detalles">
      <Field label="¿Qué pasó?" icon="document-text-outline">
        <Input
          placeholder="Ej. El agua está café y hay espuma desde ayer..."
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
        />
      </Field>
      <Field label="Maquinaria o equipo visible" icon="construct-outline" optional>
        <Input placeholder="Ej. draga, motobomba, balsa..." value={machineryOrActor} onChangeText={setMachineryOrActor} />
      </Field>
    </Section>
  );

  const privacySection = (
    <Section step={5} title="Privacidad">
      <Pressable
        onPress={() => setIsAnonymous((prev) => !prev)}
        style={[styles.privacyRow, isAnonymous && styles.privacyRowActive]}
        accessibilityRole="switch"
        accessibilityState={{ checked: isAnonymous }}
      >
        <View style={[styles.privacyIcon, isAnonymous && styles.privacyIconActive]}>
          <Ionicons name={isAnonymous ? 'eye-off-outline' : 'person-outline'} size={18} color={isAnonymous ? ink.onSolid : ink.body} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.privacyTitle}>{isAnonymous ? 'Modo anónimo activado' : 'Incluir contacto voluntario'}</Text>
          <Text style={styles.privacyText}>
            {isAnonymous ? 'No se guarda nombre, teléfono ni correo.' : 'Solo si deseas seguimiento. Puedes dejarlo vacío.'}
          </Text>
        </View>
        <Switch
          value={isAnonymous}
          onValueChange={setIsAnonymous}
          trackColor={{ false: palette.steel, true: accent.primary }}
          thumbColor={palette.white}
        />
      </Pressable>
      {!isAnonymous ? (
        <Field label="Dato de contacto" icon="call-outline" optional>
          <Input placeholder="Teléfono o correo (opcional)" value={optionalContact} onChangeText={setOptionalContact} autoCapitalize="none" />
        </Field>
      ) : null}
    </Section>
  );

  const actions = (
    <View style={styles.actions}>
      {feedback ? (
        <View style={styles.feedback}>
          <Ionicons name="checkmark-circle" size={18} color={statusTone.sincronizado.text} />
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      ) : null}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => [styles.primaryBtn, (pressed || saving) && styles.primaryBtnPressed]}
      >
        {saving ? <ActivityIndicator color={ink.onSolid} /> : <Ionicons name="save-outline" size={18} color={ink.onSolid} />}
        <Text style={styles.primaryText}>{isAnonymous ? 'Guardar aviso anónimo' : 'Guardar aviso'}</Text>
      </Pressable>
      <Text style={styles.actionHint}>
        {isOnline ? 'Con señal: se enviará en segundos.' : 'Sin señal: queda guardado y se envía solo después.'}
      </Text>
    </View>
  );

  const listBlock = (
    <View style={styles.listWrap}>
      <View style={styles.statsRow}>
        <StatTile status="pendiente" label="Pendientes" value={pendingCount} />
        <StatTile status="sincronizado" label="Sincronizados" value={syncedCount} />
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Avisos guardados</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{reports.length}</Text>
        </View>
      </View>

      {reports.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="file-tray-outline" size={26} color={ink.tertiary} />
          <Text style={styles.emptyText}>Aún no hay avisos guardados.</Text>
        </View>
      ) : (
        reports.map((r, i) => (
          <Reveal key={r.id} delay={Math.min(i, 5) * 80}>
            <ReportCard report={r} syncing={syncing} onPress={() => setDetail(r)} />
          </Reveal>
        ))
      )}

      <View style={styles.demoRow}>
        <View style={styles.flex}>
          <Text style={styles.demoTitle}>Simular "sin señal"</Text>
          <Text style={styles.demoText}>
            Para la presentación: guarda avisos como si no hubiera internet y luego apágalo para ver el envío automático.
            {!networkOnline ? ' (Ahora mismo tu dispositivo no tiene red.)' : ''}
          </Text>
        </View>
        <Switch
          value={simulateOffline}
          onValueChange={setSimulateOffline}
          trackColor={{ false: palette.steel, true: statusTone.pendiente.solid }}
          thumbColor={palette.white}
        />
      </View>
    </View>
  );

  const formBlocks = [typeSection, tipCard, photoSection, placeSection, detailsSection, privacySection, actions].filter(Boolean);
  const form = (
    <View
      style={styles.formCol}
      onLayout={(e) => {
        formY.current = e.nativeEvent.layout.y;
      }}
    >
      {formBlocks.map((block, i) => (
        <Reveal key={i} delay={i === 0 ? 80 : 0}>
          {block}
        </Reveal>
      ))}
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <RevealProvider value={reveal.ctx}>
        <Animated.ScrollView
          ref={scrollRef as never}
          style={styles.screen}
          onScroll={reveal.onScroll}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <PageHero
            source={IMAGES.river}
            dark
            eyebrow="Reporte ciudadano · anónimo"
            eyebrowIcon="shield-checkmark"
            title="¿Viste algo"
            highlight="en el río?"
            subtitle="Avisa en 3 pasos. No pedimos tu nombre y funciona aunque no tengas señal."
            height={wide ? 480 : 380}
          >
            <Button label="Empezar aviso" icon="arrow-down" variant="lime" onPress={scrollToForm} />
          </PageHero>

          <View
            style={[styles.content, wide && styles.contentWide]}
            onLayout={(e) => {
              contentY.current = e.nativeEvent.layout.y;
            }}
          >
            <Reveal>{connectionBanner}</Reveal>
            <Reveal delay={100}>{stepsBlock}</Reveal>
            {twoCols ? (
              <View style={styles.wideRow}>
                <View style={styles.wideCol}>{form}</View>
                <View style={[styles.wideCol, styles.wideSide]}>{listBlock}</View>
              </View>
            ) : (
              <>
                {form}
                {listBlock}
              </>
            )}
          </View>
          <Footer />
        </Animated.ScrollView>
      </RevealProvider>

      <ReportDetailModal report={detail} onClose={() => setDetail(null)} />
    </KeyboardAvoidingView>
  );
}

/* ---------- Componentes ---------- */

function Section({ step, title, optional, children }: { step: number; title: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.stepText}>{String(step).padStart(2, '0')}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
        {optional ? <Text style={styles.optionalTag}>Opcional</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Field({ label, icon, optional, children }: { label: string; icon: IonName; optional?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabelRow}>
        <Ionicons name={icon} size={14} color={ink.secondary} />
        <Text style={styles.fieldLabel}>{label}</Text>
        {optional ? <Text style={styles.optionalTag}>Opcional</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Input(props: TextInputProps) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      placeholderTextColor={ink.tertiary}
      selectionColor={accent.primary}
      {...props}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      style={[styles.input, props.multiline && styles.inputMultiline, focused && styles.inputFocused, props.style]}
    />
  );
}

function SmallButton({ icon, label, onPress }: { icon: IonName; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.smallBtn, pressed && styles.pressedSurface]}>
      <Ionicons name={icon} size={15} color={accent.primary} />
      <Text style={styles.smallBtnText}>{label}</Text>
    </Pressable>
  );
}

function StatTile({ status, label, value }: { status: CitizenReport['status']; label: string; value: number }) {
  const tone = statusTone[status];
  return (
    <View style={[styles.statTile, { borderColor: tone.border }]}>
      <View style={[styles.statIcon, { backgroundColor: tone.soft }]}>
        <Ionicons name={STATUS_META[status].icon} size={18} color={tone.text} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={[styles.statLabel, { color: tone.text }]}>{label}</Text>
      </View>
    </View>
  );
}

function Meta({ icon, text, mono }: { icon: IonName; text: string; mono?: boolean }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={13} color={ink.tertiary} />
      <Text style={[styles.metaText, mono && styles.metaMono]} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

function StatusBadge({ status, syncing }: { status: CitizenReport['status']; syncing?: boolean }) {
  const pending = status !== 'sincronizado';
  const tone = statusTone[pending ? 'pendiente' : 'sincronizado'];
  const meta = STATUS_META[pending ? 'pendiente' : 'sincronizado'];
  const fg = ink.onSolid;
  return (
    <View style={[styles.statusBadge, { backgroundColor: tone.solid }]}>
      {pending && syncing ? <ActivityIndicator size="small" color={fg} style={styles.badgeSpinner} /> : <Ionicons name={meta.icon} size={12} color={fg} />}
      <Text style={[styles.statusText, { color: fg }]}>{pending && syncing ? 'Enviando' : meta.label}</Text>
    </View>
  );
}

function ReportCard({ report, syncing, onPress }: { report: CitizenReport; syncing: boolean; onPress: () => void }) {
  const info = reportTypeInfo(report.type);
  const pending = report.status !== 'sincronizado';
  const tone = statusTone[pending ? 'pendiente' : 'sincronizado'];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.reportCard, pending ? styles.reportPending : styles.reportSynced, pressed && styles.pressedSurface]}
    >
      <View style={[styles.reportStripe, { backgroundColor: tone.solid }]} />
      <View style={styles.reportBody}>
        <View style={styles.reportTop}>
          {report.photoUri ? (
            <Image source={{ uri: report.photoUri }} style={styles.reportThumb} contentFit="cover" />
          ) : (
            <View style={styles.reportTypeIcon}>
              <MaterialCommunityIcons name={info?.icon ?? 'alert'} size={20} color={ink.body} />
            </View>
          )}
          <View style={styles.flex}>
            <Text style={styles.reportTitle}>{reportTypeLabel(report)}</Text>
            <Text style={styles.reportDate}>{report.createdAt}</Text>
          </View>
          <StatusBadge status={report.status} syncing={syncing} />
        </View>

        {report.description ? (
          <Text style={styles.reportDesc} numberOfLines={2}>
            {report.description}
          </Text>
        ) : null}

        <View style={styles.metaList}>
          <Meta icon="location-outline" text={`${report.department} · ${report.municipalityOrCommunity}`} />
          <Meta icon="navigate-outline" text={`${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`} mono />
        </View>

        <View style={styles.reportFooter}>
          <View style={styles.privacyChip}>
            <Ionicons name={report.isAnonymous ? 'eye-off-outline' : 'person-outline'} size={12} color={ink.body} />
            <Text style={styles.privacyChipText}>{report.isAnonymous ? 'Anónimo' : 'Con contacto'}</Text>
          </View>
          {report.photoUri ? (
            <View style={styles.privacyChip}>
              <Ionicons name="image-outline" size={12} color={ink.body} />
              <Text style={styles.privacyChipText}>Con foto</Text>
            </View>
          ) : null}
          <Text style={[styles.footerHint, { color: tone.text }]}>{STATUS_META[pending ? 'pendiente' : 'sincronizado'].hint}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function ReportDetailModal({ report, onClose }: { report: CitizenReport | null; onClose: () => void }) {
  const { syncing } = useReports();
  const point = useMemo(() => (report ? { lat: Number(report.latitude), lng: Number(report.longitude) } : null), [report]);
  if (!report || !point) return null;
  const info = reportTypeInfo(report.type);
  const pending = report.status !== 'sincronizado';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={() => undefined}>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.modalTitleRow}>
                <View style={styles.reportTypeIcon}>
                  <MaterialCommunityIcons name={info?.icon ?? 'alert'} size={20} color={ink.body} />
                </View>
                <View>
                  <Text style={styles.reportTitle}>{reportTypeLabel(report)}</Text>
                  <Text style={styles.reportDate}>{report.createdAt}</Text>
                </View>
              </View>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={22} color={ink.body} />
              </Pressable>
            </View>

            <StatusBadge status={report.status} syncing={syncing} />

            {report.photoUri ? (
              <Image source={{ uri: report.photoUri }} style={styles.modalPhoto} contentFit="cover" />
            ) : (
              <View style={[styles.modalPhoto, styles.modalNoPhoto]}>
                <Ionicons name="image-outline" size={28} color={ink.tertiary} />
                <Text style={styles.emptyText}>Aviso sin foto</Text>
              </View>
            )}

            {report.description ? <Text style={styles.modalDesc}>{report.description}</Text> : null}

            <View style={styles.metaList}>
              <Meta icon="location-outline" text={`${report.department} · ${report.municipalityOrCommunity}`} />
              {report.machineryOrActor ? <Meta icon="construct-outline" text={report.machineryOrActor} /> : null}
              <Meta icon="navigate-outline" text={`${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`} mono />
              <Meta icon={report.isAnonymous ? 'eye-off-outline' : 'person-outline'} text={report.isAnonymous ? 'Aviso anónimo' : 'Incluye contacto voluntario'} />
            </View>

            <View style={styles.modalMap}>
              <HgMap
                center={point}
                zoom={14}
                reports={[
                  {
                    id: report.id,
                    lat: point.lat,
                    lng: point.lng,
                    color: statusTone[pending ? 'pendiente' : 'sincronizado'].solid,
                    title: reportTypeLabel(report),
                    subtitle: report.createdAt,
                  },
                ]}
                style={styles.flex}
              />
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- Estilos ---------- */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: surface.floor },
  content: {
    paddingHorizontal: space.s16,
    gap: space.s16,
    width: '100%',
    maxWidth: layout.maxWidth,
    alignSelf: 'center',
    paddingBottom: space.s48,
    marginTop: -space.s32,
  },
  contentWide: { maxWidth: 1100, paddingHorizontal: space.s32, gap: space.s24 },
  wideRow: { flexDirection: 'row', gap: space.s24, alignItems: 'flex-start' },
  wideCol: { flex: 1 },
  wideSide: { maxWidth: 480 },
  formCol: { gap: space.s16 },
  flex: { flex: 1 },
  pressedSurface: { backgroundColor: surface.overlay },

  intro: { gap: space.s8, paddingHorizontal: 2, paddingTop: space.s8 },
  eyebrow: { ...type.eyebrow, color: ink.tertiary },
  title: { ...type.headingSm, fontSize: 26, lineHeight: 31, letterSpacing: -0.5, color: ink.heading },

  connBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    padding: space.s12,
    borderRadius: radius.panel,
    borderWidth: 1,
    backgroundColor: surface.panel,
  },
  connIcon: { width: 40, height: 40, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },
  connTitle: { ...type.label, fontWeight: '700', color: ink.heading },
  connText: { ...type.bodySm, fontSize: 12, lineHeight: 17, color: ink.body, marginTop: 1 },
  connAction: { paddingHorizontal: space.s12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: accent.primary },
  connActionText: { ...type.label, fontSize: 12, fontWeight: '700', color: ink.onSolid },

  stepsCard: {
    padding: space.s16,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: accent.border,
    backgroundColor: surface.panel,
    gap: space.s12,
  },
  stepsEyebrow: { ...type.eyebrow, color: accent.primary },
  stepsRow: { flexDirection: 'row', gap: space.s12 },
  stepItem: { flex: 1, gap: 6 },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: accent.soft,
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
    backgroundColor: accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: surface.panel,
  },
  stepNumText: { ...type.data, fontSize: 10, color: ink.onSolid },
  stepTitle: { ...type.label, fontSize: 13, fontWeight: '700', color: ink.heading },
  stepDesc: { ...type.bodySm, fontSize: 12, lineHeight: 16, color: ink.secondary },

  card: {
    backgroundColor: surface.panel,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: line.subtle,
    padding: space.s20,
    gap: space.s16,
    ...shadow.card,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.s8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  stepText: { ...type.data, fontSize: 13, color: accent.primary, letterSpacing: 1 },
  sectionTitle: { ...type.subheading, fontWeight: '700', color: ink.heading },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.s12 },
  typeTile: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: space.s12,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: line.muted,
    backgroundColor: surface.raised,
  },
  typeTileActive: { borderColor: accent.primary, backgroundColor: accent.soft },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeIconActive: { backgroundColor: accent.primary },
  typeText: { ...type.label, fontSize: 13, color: ink.body },
  typeTextActive: { color: accent.primary, fontWeight: '800' },
  typeHint: { ...type.bodySm, fontSize: 11, lineHeight: 14, color: ink.tertiary, marginTop: 2 },

  tipCard: {
    gap: space.s8,
    padding: space.s16,
    borderRadius: radius.card,
    backgroundColor: accent.soft,
    borderWidth: 1,
    borderColor: accent.border,
  },
  tipHeader: { flexDirection: 'row', alignItems: 'center', gap: space.s8 },
  tipIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: surface.panel, alignItems: 'center', justifyContent: 'center' },
  tipEyebrow: { ...type.caption, color: accent.primary, flexShrink: 1 },
  tipQuestion: { ...type.subheading, fontSize: 16, color: ink.heading },
  tipAnswer: { ...type.bodySm, fontSize: 14, lineHeight: 20, color: ink.body },
  tipLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  tipLinkText: { ...type.label, fontSize: 13, color: accent.primary },
  photoButtons: { flexDirection: 'row', gap: space.s12 },
  photoBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: space.s20,
    paddingHorizontal: space.s12,
    borderRadius: radius.panel,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: line.ghost,
    backgroundColor: surface.raised,
  },
  photoBtnIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: accent.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  photoBtnTitle: { ...type.label, fontWeight: '700', color: ink.heading },
  photoBtnText: { ...type.bodySm, fontSize: 12, color: ink.secondary, textAlign: 'center' },
  photoPreviewWrap: { gap: space.s12 },
  photoPreview: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.panel, backgroundColor: surface.raised },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s8 },
  errorText: { ...type.bodySm, fontSize: 12, color: statusTone.pendiente.text },
  helperText: { ...type.bodySm, fontSize: 12, lineHeight: 17, color: ink.tertiary },

  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.s12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: line.pill,
  },
  smallBtnText: { ...type.label, fontSize: 12, color: accent.primary },

  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  gpsIcon: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  gpsTitle: { ...type.label, fontSize: 13, color: ink.heading },
  coords: { ...type.data, fontWeight: '500', fontSize: 12, color: ink.body, marginTop: 2 },
  pickMapWrap: { height: 260, borderRadius: radius.panel, overflow: 'hidden', borderWidth: 1, borderColor: line.muted },
  pickMap: { flex: 1, borderRadius: 0 },

  field: { gap: space.s8 },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fieldLabel: { ...type.label, fontSize: 13, color: ink.body },
  optionalTag: {
    ...type.caption,
    fontSize: 9,
    color: ink.secondary,
    borderWidth: 1,
    borderColor: line.ghost,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radius.badge,
  },
  input: {
    ...type.bodySm,
    fontSize: 15,
    borderWidth: 1,
    borderColor: line.muted,
    borderRadius: radius.input,
    paddingHorizontal: space.s12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    backgroundColor: surface.raised,
    color: ink.heading,
  },
  inputMultiline: { minHeight: 104 },
  inputFocused: { borderColor: accent.primary, backgroundColor: surface.panel },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: space.s12, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: line.ghost },
  chipActive: { backgroundColor: accent.primary, borderColor: accent.primary },
  chipText: { ...type.label, fontSize: 12, color: ink.body },
  chipTextActive: { color: ink.onSolid },

  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    padding: space.s12,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: line.muted,
    backgroundColor: surface.raised,
  },
  privacyRowActive: { borderColor: accent.border, backgroundColor: accent.soft },
  privacyIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: surface.overlay, alignItems: 'center', justifyContent: 'center' },
  privacyIconActive: { backgroundColor: accent.primary },
  privacyTitle: { ...type.label, fontSize: 14, fontWeight: '700', color: ink.heading },
  privacyText: { ...type.bodySm, fontSize: 12, lineHeight: 17, color: ink.secondary, marginTop: 1 },

  actions: { gap: space.s12 },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s8,
    padding: space.s12,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: statusTone.sincronizado.border,
    backgroundColor: statusTone.sincronizado.soft,
  },
  feedbackText: { ...type.bodySm, flex: 1, fontSize: 13, color: ink.heading },
  primaryBtn: {
    ...shadow.glow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.s8,
    backgroundColor: accent.primary,
    paddingVertical: 15,
    paddingHorizontal: space.s24,
    borderRadius: radius.pill,
  },
  primaryBtnPressed: { backgroundColor: accent.pressed },
  primaryText: { ...type.label, fontWeight: '700', color: ink.onSolid },
  actionHint: { ...type.bodySm, fontSize: 12, color: ink.secondary, textAlign: 'center' },

  listWrap: { gap: space.s12 },
  statsRow: { flexDirection: 'row', gap: space.s12 },
  statTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    padding: space.s12,
    borderRadius: radius.panel,
    borderWidth: 1,
    backgroundColor: surface.panel,
  },
  statIcon: { width: 36, height: 36, borderRadius: radius.chip, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...type.data, fontSize: 22, lineHeight: 26, color: ink.heading },
  statLabel: { ...type.caption, letterSpacing: 0.8 },

  listHeader: { flexDirection: 'row', alignItems: 'center', gap: space.s8, marginTop: space.s8 },
  listTitle: { ...type.subheading, fontWeight: '700', color: ink.heading },
  countBadge: { borderWidth: 1, borderColor: line.ghost, borderRadius: radius.badge, paddingHorizontal: 6, paddingVertical: 1 },
  countBadgeText: { ...type.data, fontSize: 12, color: ink.body },
  empty: {
    alignItems: 'center',
    gap: space.s8,
    padding: space.s24,
    borderRadius: radius.card,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: line.muted,
  },
  emptyText: { ...type.bodySm, fontSize: 13, color: ink.secondary },

  reportCard: { flexDirection: 'row', borderRadius: radius.panel, overflow: 'hidden', borderWidth: 1 },
  reportPending: { backgroundColor: surface.panel, borderColor: statusTone.pendiente.border, borderStyle: 'dashed' },
  reportSynced: { backgroundColor: surface.panel, borderColor: line.subtle },
  reportStripe: { width: 4 },
  reportBody: { flex: 1, padding: space.s16, gap: 10 },
  reportTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reportTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.input,
    backgroundColor: surface.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportThumb: { width: 40, height: 40, borderRadius: radius.input, backgroundColor: surface.raised },
  reportTitle: { ...type.label, fontSize: 14, fontWeight: '700', color: ink.heading },
  reportDate: { ...type.data, fontWeight: '400', fontSize: 11, color: ink.secondary },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.badge,
  },
  badgeSpinner: { transform: [{ scale: 0.55 }], width: 12, height: 12 },
  statusText: { ...type.caption, letterSpacing: 0.8 },
  reportDesc: { ...type.bodySm, fontSize: 13, lineHeight: 19, color: ink.body },
  metaList: { gap: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...type.bodySm, flex: 1, fontSize: 12, lineHeight: 16, color: ink.secondary },
  metaMono: { ...type.data, fontWeight: '500', fontSize: 12, color: ink.body },
  reportFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.s8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: line.subtle,
  },
  privacyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: line.muted,
    paddingHorizontal: space.s8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  privacyChipText: { ...type.label, fontSize: 11, color: ink.body },
  footerHint: { ...type.caption, letterSpacing: 0.6, marginLeft: 'auto' },

  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s12,
    marginTop: space.s8,
    padding: space.s12,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: line.ghost,
  },
  demoTitle: { ...type.label, fontSize: 13, fontWeight: '700', color: ink.body },
  demoText: { ...type.bodySm, fontSize: 11, lineHeight: 15, color: ink.tertiary, marginTop: 2 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(14, 16, 18, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.s16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: line.muted,
    backgroundColor: surface.panel,
    overflow: 'hidden',
  },
  modalContent: { padding: space.s20, gap: space.s16 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.s12 },
  modalPhoto: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.panel, backgroundColor: surface.raised },
  modalNoPhoto: { alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderStyle: 'dashed', borderColor: line.muted },
  modalDesc: { ...type.body, fontSize: 15, lineHeight: 22, color: ink.body },
  modalMap: { height: 200, borderRadius: radius.panel, overflow: 'hidden' },
});
