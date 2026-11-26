import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ink, radius, statusTone, type } from '../constants/hg-theme';
import { useReports } from '../context/ReportsContext';

/** Indicador compacto de señal para el encabezado: En línea / Sin señal / Enviando. */
export function ConnectivityBadge({ compact }: { compact?: boolean }) {
  const { isOnline, syncing, pendingCount, simulateOffline } = useReports();

  const tone = isOnline ? statusTone.sincronizado : statusTone.pendiente;
  const label = syncing
    ? 'Enviando…'
    : isOnline
    ? 'En línea'
    : simulateOffline
    ? 'Sin señal (demo)'
    : 'Sin señal';

  return (
    <View
      style={[styles.badge, { borderColor: tone.border, backgroundColor: tone.soft }]}
      accessibilityRole="text"
      accessibilityLabel={`Estado de conexión: ${label}. ${pendingCount} avisos pendientes.`}
    >
      {syncing ? (
        <ActivityIndicator size="small" color={tone.text} style={styles.spinner} />
      ) : (
        <Ionicons name={isOnline ? 'wifi' : 'cloud-offline-outline'} size={13} color={tone.text} />
      )}
      {!compact ? <Text style={[styles.text, { color: tone.text }]}>{label}</Text> : null}
      {pendingCount > 0 ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{pendingCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1,
    marginHorizontal: 12,
  },
  spinner: { transform: [{ scale: 0.6 }], width: 13, height: 13 },
  text: { ...type.caption, fontSize: 10, letterSpacing: 0.6 },
  count: {
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    backgroundColor: statusTone.pendiente.solid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { ...type.data, fontSize: 10, color: ink.onSolid },
});
