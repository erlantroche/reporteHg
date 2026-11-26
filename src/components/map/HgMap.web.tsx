import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { radius } from '../../constants/hg-theme';
import {
  buildMapHtml,
  handleMapOutbound,
  HgMapProps,
  MAP_BACKGROUND,
  MapInbound,
  useLatest,
  useMapSync,
} from './mapBridge';

export type { HgMapProps, MapCell, MapPoint, MapReport, MapZone } from './mapBridge';

/** Mapa para la página web (laptops): Leaflet dentro de un iframe. */
export function HgMap(props: HgMapProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [ready, setReady] = useState(false);
  const propsRef = useLatest(props);

  const html = useMemo(
    () => buildMapHtml({ center: props.center, zoom: props.zoom ?? 11, base: props.base ?? 'light' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (!frameRef.current || e.source !== frameRef.current.contentWindow) return;
      const data = e.data as { __hgOut?: boolean; payload?: string } | null;
      if (data && data.__hgOut) handleMapOutbound(data.payload, propsRef, setReady);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [propsRef]);

  const post = useCallback((msg: MapInbound) => {
    frameRef.current?.contentWindow?.postMessage({ __hgIn: true, payload: msg }, '*');
  }, []);

  useMapSync(props, post, ready);

  return (
    <View style={[styles.wrap, props.style]}>
      <iframe
        ref={frameRef}
        srcDoc={html}
        title="Mapa de riesgo ReporteHg"
        style={{ border: 0, width: '100%', height: '100%', display: 'block', background: MAP_BACKGROUND }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: radius.panel, backgroundColor: MAP_BACKGROUND },
});
