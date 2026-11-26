import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

export type LocationStatus = 'idle' | 'loading' | 'ok' | 'denied' | 'unavailable';

export interface GeoFix {
  lat: number;
  lng: number;
  /** Precisión aproximada en metros. */
  accuracy: number | null;
  timestamp: number;
}

const TIMEOUT_MS = 15000;

function toFix(pos: Location.LocationObject): GeoFix {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null,
    timestamp: pos.timestamp,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/**
 * Ubicación GPS del teléfono (o del navegador en web).
 * El GPS funciona sin internet: solo el mapa base necesita conexión.
 */
export function useCurrentLocation(options: { auto?: boolean } = {}) {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const fixRef = useRef<GeoFix | null>(null);

  const request = useCallback(async (): Promise<GeoFix | null> => {
    setStatus('loading');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStatus('denied');
        return null;
      }

      // Primero la última ubicación conocida (rápida), luego una lectura fresca.
      const last = await Location.getLastKnownPositionAsync().catch(() => null);
      if (last) {
        fixRef.current = toFix(last);
        setFix(fixRef.current);
      }

      const fresh = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        TIMEOUT_MS
      );
      if (fresh) {
        fixRef.current = toFix(fresh);
        setFix(fixRef.current);
      }

      setStatus(fixRef.current ? 'ok' : 'unavailable');
      return fixRef.current;
    } catch {
      setStatus(fixRef.current ? 'ok' : 'unavailable');
      return fixRef.current;
    }
  }, []);

  useEffect(() => {
    if (options.auto) request();
  }, [options.auto, request]);

  return { fix, status, request };
}
