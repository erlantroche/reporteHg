import * as Network from 'expo-network';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

export interface Connectivity {
  /** true si hay conexión a internet (o se asume, mientras no se verificó). */
  isOnline: boolean;
  /** true cuando ya se leyó el estado real de la red al menos una vez. */
  checked: boolean;
}

function readWebOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

/**
 * Detecta si el dispositivo tiene internet y avisa cada vez que cambia.
 * - Web: eventos online/offline del navegador.
 * - Móvil: expo-network (Wi-Fi o datos + internet alcanzable).
 */
export function useConnectivity(): Connectivity {
  const [state, setState] = useState<Connectivity>({ isOnline: true, checked: false });

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined') return;
      const update = () => setState({ isOnline: readWebOnline(), checked: true });
      update();
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }

    let active = true;
    const apply = (s: Network.NetworkState) => {
      if (!active) return;
      const online = s.isConnected === true && s.isInternetReachable !== false;
      setState({ isOnline: online, checked: true });
    };

    Network.getNetworkStateAsync()
      .then(apply)
      .catch(() => setState((prev) => ({ ...prev, checked: true })));
    const subscription = Network.addNetworkStateListener(apply);

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return state;
}
