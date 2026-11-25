import { Tabs } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Tabs screenOptions={{ headerTitleAlign: 'center' }}>
      <Tabs.Screen name="index" options={{ title: 'Mapa de Riesgo' }} />
      <Tabs.Screen name="report" options={{ title: 'Reportar (Offline)' }} />
      <Tabs.Screen name="chat" options={{ title: 'Asistente RAG' }} />
    </Tabs>
  );
}
