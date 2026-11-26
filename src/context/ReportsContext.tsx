import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CitizenReport } from '../data/mocks';
import { useConnectivity } from '../hooks/useConnectivity';
import { addOfflineReport, loadReports, syncPendingReports } from '../services/offlineQueue';

type NewReportInput = Parameters<typeof addOfflineReport>[0];

interface ReportsContextValue {
  reports: CitizenReport[];
  loaded: boolean;
  pendingCount: number;
  /** Conexión efectiva (red real y sin simulación de "sin señal"). */
  isOnline: boolean;
  /** Estado real de la red del dispositivo. */
  networkOnline: boolean;
  networkChecked: boolean;
  /** Modo demostración: fuerza "sin señal" para enseñar el flujo offline. */
  simulateOffline: boolean;
  setSimulateOffline: (value: boolean) => void;
  syncing: boolean;
  lastSyncAt: Date | null;
  saveReport: (input: NewReportInput) => Promise<CitizenReport | undefined>;
  syncNow: () => Promise<void>;
  reload: () => Promise<void>;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

/** Tiempo mínimo que se muestra "Enviando…" para que el usuario vea el cambio de estado. */
const MIN_SYNC_FEEDBACK_MS = 1200;

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const { isOnline: networkOnline, checked: networkChecked } = useConnectivity();
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [reports, setReports] = useState<CitizenReport[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const syncingRef = useRef(false);

  const isOnline = networkOnline && !simulateOffline;
  const pendingCount = useMemo(() => reports.filter((r) => r.status === 'pendiente').length, [reports]);

  const reload = useCallback(async () => {
    const data = await loadReports();
    setReports(data);
    setLoaded(true);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const syncNow = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const [updated] = await Promise.all([
        syncPendingReports(),
        new Promise((resolve) => setTimeout(resolve, MIN_SYNC_FEEDBACK_MS)),
      ]);
      setReports(updated);
      setLastSyncAt(new Date());
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // Envío automático: apenas hay señal y existen avisos pendientes, se sincronizan solos.
  useEffect(() => {
    if (loaded && isOnline && pendingCount > 0 && !syncingRef.current) {
      syncNow();
    }
  }, [loaded, isOnline, pendingCount, syncNow]);

  const saveReport = useCallback(async (input: NewReportInput) => {
    const updated = await addOfflineReport(input);
    setReports(updated);
    return updated[0];
  }, []);

  const value = useMemo<ReportsContextValue>(
    () => ({
      reports,
      loaded,
      pendingCount,
      isOnline,
      networkOnline,
      networkChecked,
      simulateOffline,
      setSimulateOffline,
      syncing,
      lastSyncAt,
      saveReport,
      syncNow,
      reload,
    }),
    [reports, loaded, pendingCount, isOnline, networkOnline, networkChecked, simulateOffline, syncing, lastSyncAt, saveReport, syncNow, reload]
  );

  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}

export function useReports(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) throw new Error('useReports debe usarse dentro de <ReportsProvider>.');
  return ctx;
}
