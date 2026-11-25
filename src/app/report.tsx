import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { CitizenReport, ReportType } from '../data/mocks';
import { addOfflineReport, loadReports, syncPendingReports } from '../services/offlineQueue';

const REPORT_TYPES: { id: ReportType; label: string }[] = [
  { id: 'draga', label: 'Draga' },
  { id: 'agua_turbia', label: 'Agua turbia' },
  { id: 'quema_amalgama', label: 'Quema de amalgama' },
  { id: 'peces_muertos', label: 'Peces muertos' },
];

export default function ReportScreen() {
  const [type, setType] = useState<ReportType>('agua_turbia');
  const [department, setDepartment] = useState('La Paz');
  const [municipalityOrCommunity, setMunicipalityOrCommunity] = useState('');
  const [machineryOrActor, setMachineryOrActor] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [optionalContact, setOptionalContact] = useState('');
  const [description, setDescription] = useState('');
  const [reports, setReports] = useState<CitizenReport[]>([]);

  useEffect(() => {
    loadReports().then(setReports);
  }, []);

  const handleSave = async () => {
    const updated = await addOfflineReport({
      type,
      description,
      department,
      municipalityOrCommunity: municipalityOrCommunity.trim() || 'Por confirmar en campo',
      machineryOrActor: machineryOrActor.trim() || undefined,
      isAnonymous,
      optionalContact: !isAnonymous && optionalContact.trim() ? optionalContact.trim() : undefined,
    });
    setReports(updated);
    setDescription('');
    setMunicipalityOrCommunity('');
    setMachineryOrActor('');
    setOptionalContact('');
  };

  const handleSync = async () => {
    const updated = await syncPendingReports();
    setReports(updated);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          Reporte anónimo por defecto y offline: no se exige identidad. Se guarda sin señal y sincroniza al haber red.
        </Text>
      </View>

      <Text style={styles.label}>Tipo de aviso</Text>
      <View style={styles.grid}>
        {REPORT_TYPES.map((item) => (
          <Pressable
            key={item.id}
            style={[styles.typeBtn, type === item.id && styles.typeBtnActive]}
            onPress={() => setType(item.id)}
          >
            <Text style={[styles.typeText, type === item.id && styles.typeTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Privacidad del reporte</Text>
      <Pressable
        style={[styles.anonBtn, isAnonymous && styles.anonBtnActive]}
        onPress={() => setIsAnonymous((prev) => !prev)}
      >
        <Text style={[styles.anonText, isAnonymous && styles.anonTextActive]}>
          {isAnonymous
            ? 'Modo anónimo activado (sin datos personales)'
            : 'Incluir contacto voluntario (opcional)'}
        </Text>
      </Pressable>

      {!isAnonymous ? (
        <TextInput
          style={styles.inputSingle}
          placeholder="Dato de contacto opcional (solo si deseas seguimiento)"
          value={optionalContact}
          onChangeText={setOptionalContact}
        />
      ) : null}

      <Text style={styles.label}>Departamento y comunidad / localidad</Text>
      <TextInput
        style={styles.inputSingle}
        placeholder="Departamento (ej. La Paz, Beni, Pando...)"
        value={department}
        onChangeText={setDepartment}
      />
      <TextInput
        style={styles.inputSingle}
        placeholder="Comunidad, localidad o punto de referencia"
        value={municipalityOrCommunity}
        onChangeText={setMunicipalityOrCommunity}
      />

      <Text style={styles.label}>Maquinaria, equipo o detalle visible (opcional)</Text>
      <TextInput
        style={styles.inputSingle}
        placeholder="Ej. Draga, motobomba, balsa o detalle observable"
        value={machineryOrActor}
        onChangeText={setMachineryOrActor}
      />

      <Text style={styles.label}>Descripción de los hechos</Text>
      <TextInput
        style={styles.input}
        placeholder="Ej. Agua turbia o quema en ribera sin conexión..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Pressable style={styles.primaryBtn} onPress={handleSave}>
        <Text style={styles.primaryText}>Guardar reporte anónimo sin conexión</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={handleSync}>
        <Text style={styles.secondaryText}>Sincronizar pendientes</Text>
      </Pressable>

      <Text style={styles.label}>Avisos guardados ({reports.length})</Text>
      {reports.map((r) => (
        <View key={r.id} style={styles.item}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.itemTitle}>
              {r.type.replace('_', ' ').toUpperCase()} · {r.isAnonymous ? 'ANÓNIMO' : 'CON CONTACTO'}
            </Text>
            <Text style={styles.subtext}>{r.department} · {r.municipalityOrCommunity}</Text>
            {r.machineryOrActor ? <Text style={styles.subtext}>Equipo/Detalle: {r.machineryOrActor}</Text> : null}
            <Text style={styles.subtext}>{r.description}</Text>
            <Text style={styles.subtext}>{r.createdAt} · GPS: {r.latitude}, {r.longitude}</Text>
          </View>
          <Text style={[styles.status, r.status === 'pendiente' ? styles.pending : styles.synced]}>
            {r.status === 'pendiente' ? 'Pendiente' : 'Sincronizado'}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 10 },
  banner: { padding: 12, borderRadius: 8, backgroundColor: '#fef3c7' },
  bannerText: { color: '#78350f', fontWeight: '600', fontSize: 13 },
  label: { fontWeight: '700', fontSize: 14, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeBtn: { width: '48%', padding: 12, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  typeBtnActive: { backgroundColor: '#1d4ed8' },
  typeText: { fontWeight: '600', color: '#111827' },
  typeTextActive: { color: '#ffffff' },
  anonBtn: { padding: 12, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  anonBtnActive: { backgroundColor: '#065f46' },
  anonText: { fontWeight: '600', color: '#111827', fontSize: 13 },
  anonTextActive: { color: '#ffffff', fontSize: 13 },
  inputSingle: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, backgroundColor: '#ffffff' },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, minHeight: 70, backgroundColor: '#ffffff' },
  primaryBtn: { backgroundColor: '#111827', padding: 14, borderRadius: 8, alignItems: 'center' },
  primaryText: { color: '#ffffff', fontWeight: '700' },
  secondaryBtn: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  secondaryText: { color: '#ffffff', fontWeight: '700' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 8, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb' },
  itemTitle: { fontWeight: '700' },
  subtext: { fontSize: 12, color: '#4b5563' },
  status: { fontSize: 12, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  pending: { backgroundColor: '#fde68a', color: '#92400e' },
  synced: { backgroundColor: '#dcfce7', color: '#166534' },
});
