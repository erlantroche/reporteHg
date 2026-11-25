import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { INITIAL_RISK_ZONES, RiskZone } from '../data/mocks';

type LayerMode = 'peligro' | 'riesgo' | 'incertidumbre';

export default function MapScreen() {
  const [layer, setLayer] = useState<LayerMode>('riesgo');
  const [selected, setSelected] = useState<RiskZone>(INITIAL_RISK_ZONES[0]);

  const badgeColor = (level: RiskZone['riskLevel']) => {
    if (level === 'alto') return '#dc2626';
    if (level === 'medio') return '#d97706';
    return '#16a34a';
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ReporteHg — Riesgo y Alerta</Text>

      <View style={styles.layerRow}>
        {(['peligro', 'riesgo', 'incertidumbre'] as LayerMode[]).map((item) => (
          <Pressable
            key={item}
            style={[styles.layerBtn, layer === item && styles.layerBtnActive]}
            onPress={() => setLayer(item)}
          >
            <Text style={[styles.layerText, layer === item && styles.layerTextActive]}>
              {item.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Zonas estimadas (capa: {layer})</Text>
        <Text style={styles.subtext}>
          Peligro = interpolación de Hg | Riesgo = peligro × exposición × vulnerabilidad | Incertidumbre = transparencia por distancia/muestreo.
        </Text>

        {INITIAL_RISK_ZONES.map((zone) => {
          const isSelected = selected.id === zone.id;
          const opacity = layer === 'incertidumbre' ? Math.max(0.3, 1 - zone.uncertainty) : 1;

          return (
            <Pressable
              key={zone.id}
              style={[styles.zoneItem, isSelected && styles.zoneSelected, { opacity }]}
              onPress={() => setSelected(zone)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.zoneName}>{zone.name}</Text>
                <Text style={styles.subtext}>{zone.riverOrArea}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: badgeColor(zone.riskLevel) }]}>
                <Text style={styles.badgeText}>{zone.riskLevel.toUpperCase()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Detalle: {selected.name}</Text>
        <Text>Valor interpolado estimado: {selected.estimatedHgMgKg} mg/kg</Text>
        <Text>Incertidumbre: {Math.round(selected.uncertainty * 100)}%</Text>
        <Text>Exposición: {Math.round(selected.exposureScore * 100)}% · Vulnerabilidad: {Math.round(selected.vulnerabilityScore * 100)}%</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  layerRow: { flexDirection: 'row', gap: 8 },
  layerBtn: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: '#e5e7eb', alignItems: 'center' },
  layerBtnActive: { backgroundColor: '#111827' },
  layerText: { fontWeight: '600', color: '#111827', fontSize: 12 },
  layerTextActive: { color: '#ffffff' },
  card: { padding: 14, borderRadius: 10, backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  subtext: { fontSize: 12, color: '#4b5563' },
  zoneItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e5e7eb' },
  zoneSelected: { borderColor: '#2563eb', borderWidth: 2 },
  zoneName: { fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
});
