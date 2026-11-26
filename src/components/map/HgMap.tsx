import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import WebViewBase from 'react-native-webview';
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

/**
 * react-native-webview 14 declara sus props como intersección iOS & Android & Windows,
 * que con los tipos de React Native 0.88 queda en `never`. Tipamos solo lo que usamos.
 */
type WebViewHandle = { injectJavaScript: (script: string) => void };
type LooseWebViewProps = {
  ref?: React.Ref<WebViewHandle>;
  originWhitelist?: string[];
  source: { html: string; baseUrl?: string };
  onMessage?: (event: { nativeEvent: { data: string } }) => void;
  javaScriptEnabled?: boolean;
  domStorageEnabled?: boolean;
  nestedScrollEnabled?: boolean;
  setSupportMultipleWindows?: boolean;
  overScrollMode?: 'always' | 'content' | 'never';
  style?: StyleProp<ViewStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};
const WebView = WebViewBase as unknown as React.ComponentType<LooseWebViewProps>;

/** Mapa para Android / iOS: Leaflet dentro de un WebView. */
export function HgMap(props: HgMapProps) {
  const webRef = useRef<WebViewHandle>(null);
  const [ready, setReady] = useState(false);
  const propsRef = useLatest(props);

  // El HTML se crea una sola vez; los datos llegan por mensajes.
  const html = useMemo(
    () => buildMapHtml({ center: props.center, zoom: props.zoom ?? 11, base: props.base ?? 'light' }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const post = useCallback((msg: MapInbound) => {
    const payload = JSON.stringify(JSON.stringify(msg));
    webRef.current?.injectJavaScript(`window.__hgReceive && window.__hgReceive(${payload}); true;`);
  }, []);

  useMapSync(props, post, ready);

  return (
    <View style={[styles.wrap, props.style]}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://mercuria.app/' }}
        onMessage={(e) => handleMapOutbound(e.nativeEvent.data, propsRef, setReady)}
        javaScriptEnabled
        domStorageEnabled
        nestedScrollEnabled
        setSupportMultipleWindows={false}
        overScrollMode="never"
        style={styles.web}
        containerStyle={styles.web}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', borderRadius: radius.panel, backgroundColor: MAP_BACKGROUND },
  web: { flex: 1, backgroundColor: MAP_BACKGROUND },
});
