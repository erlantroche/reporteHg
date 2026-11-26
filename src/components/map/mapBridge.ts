/**
 * Puente común del mapa (Leaflet) para móvil (WebView) y web (iframe).
 * La página HTML del mapa recibe mensajes { type: 'data' | 'flyTo' | 'invalidate' }
 * y responde { type: 'ready' | 'zoneSelect' | 'reportSelect' | 'pick' | 'error' }.
 */
import { MutableRefObject, useEffect, useMemo, useRef } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapZone extends MapPoint {
  id: string;
  label: string;
  color: string;
  selected?: boolean;
  title?: string;
  subtitle?: string;
}

export interface MapReport extends MapPoint {
  id: string;
  color: string;
  title: string;
  subtitle?: string;
}

export interface MapCell {
  lat0: number;
  lng0: number;
  lat1: number;
  lng1: number;
  color: string;
  opacity: number;
}

export interface MapGeoStyle {
  color: string;
  weight?: number;
  opacity?: number;
  fillColor?: string;
  fillOpacity?: number;
  dash?: string;
  radius?: number;
  stroke?: string;
}

/** Capa vectorial (GeoJSON exportado desde QGIS). */
export interface MapGeoLayer {
  id: string;
  name: string;
  kind: 'line' | 'polygon' | 'point';
  data: unknown;
  style: MapGeoStyle;
}

export interface MapFocus extends MapPoint {
  zoom?: number;
  /** Cambia este número para volver a centrar en el mismo punto. */
  key: number;
}

export interface HgMapProps {
  center: MapPoint;
  zoom?: number;
  base?: 'light' | 'dark' | 'sat';
  cells?: MapCell[];
  zones?: MapZone[];
  reports?: MapReport[];
  me?: (MapPoint & { accuracy?: number | null }) | null;
  /** 'pick': tocar el mapa o arrastrar el pin elige un lugar. */
  mode?: 'view' | 'pick';
  pick?: MapPoint | null;
  /** Encuadra estos puntos cuando cambia fitKey. */
  fitTo?: MapPoint[] | null;
  fitKey?: string | number;
  focus?: MapFocus | null;
  /** Capas de QGIS (se envían una sola vez; mantener la misma referencia). */
  geoLayers?: MapGeoLayer[];
  /** Ids de las capas de QGIS visibles. */
  visibleLayers?: string[];
  onZoneSelect?: (id: string) => void;
  onReportSelect?: (id: string) => void;
  onPick?: (point: MapPoint) => void;
  onError?: () => void;
  style?: StyleProp<ViewStyle>;
}

export type MapInbound =
  | { type: 'data'; data: MapDataPayload }
  | { type: 'flyTo'; lat: number; lng: number; zoom?: number }
  | { type: 'invalidate' }
  | { type: 'geo'; layers: MapGeoLayer[] }
  | { type: 'geoVisible'; ids: string[] };

interface MapDataPayload {
  cells: MapCell[];
  zones: MapZone[];
  reports: MapReport[];
  me: (MapPoint & { accuracy?: number | null }) | null;
  mode: 'view' | 'pick';
  pick: MapPoint | null;
  fitTo: MapPoint[] | null;
  fitKey: string | number | null;
}

/** Envía datos y enfoques al mapa cada vez que cambian (y al quedar listo). */
export function useMapSync(props: HgMapProps, post: (msg: MapInbound) => void, ready: boolean) {
  const payload = useMemo<MapDataPayload>(
    () => ({
      cells: props.cells ?? [],
      zones: props.zones ?? [],
      reports: props.reports ?? [],
      me: props.me ?? null,
      mode: props.mode ?? 'view',
      pick: props.pick ?? null,
      fitTo: props.fitTo ?? null,
      fitKey: props.fitKey ?? null,
    }),
    [props.cells, props.zones, props.reports, props.me, props.mode, props.pick, props.fitTo, props.fitKey]
  );

  useEffect(() => {
    if (ready) post({ type: 'data', data: payload });
  }, [ready, payload, post]);

  const geoLayers = props.geoLayers;
  useEffect(() => {
    if (ready && geoLayers && geoLayers.length) post({ type: 'geo', layers: geoLayers });
  }, [ready, geoLayers, post]);

  const visibleKey = (props.visibleLayers ?? []).join('|');
  useEffect(() => {
    if (ready && geoLayers && geoLayers.length) post({ type: 'geoVisible', ids: visibleKey ? visibleKey.split('|') : [] });
  }, [ready, geoLayers, visibleKey, post]);

  const focus = props.focus;
  useEffect(() => {
    if (ready && focus) post({ type: 'flyTo', lat: focus.lat, lng: focus.lng, zoom: focus.zoom });
    // Solo reacciona a una nueva "key" de enfoque.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focus?.key]);
}

/** Mantiene siempre la versión más reciente de los callbacks. */
export function useLatest<T>(value: T): MutableRefObject<T> {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** Procesa un mensaje que viene desde la página del mapa. */
export function handleMapOutbound(
  raw: unknown,
  propsRef: MutableRefObject<HgMapProps>,
  setReady: (v: boolean) => void
) {
  let msg: { type?: string; id?: string; lat?: number; lng?: number } | null = null;
  try {
    msg = typeof raw === 'string' ? JSON.parse(raw) : (raw as typeof msg);
  } catch {
    return;
  }
  if (!msg || typeof msg.type !== 'string') return;
  const p = propsRef.current;
  switch (msg.type) {
    case 'ready':
      setReady(true);
      break;
    case 'zoneSelect':
      if (msg.id) p.onZoneSelect?.(msg.id);
      break;
    case 'reportSelect':
      if (msg.id) p.onReportSelect?.(msg.id);
      break;
    case 'pick':
      if (typeof msg.lat === 'number' && typeof msg.lng === 'number') p.onPick?.({ lat: msg.lat, lng: msg.lng });
      break;
    case 'error':
      p.onError?.();
      break;
  }
}

export const MAP_BACKGROUND = '#E8EFE6';

/** Página HTML autocontenida con Leaflet (se carga desde CDN; requiere internet para el mapa base). */
export function buildMapHtml(config: { center: MapPoint; zoom: number; base: 'light' | 'dark' | 'sat' }): string {
  const cfg = JSON.stringify(config);
  return `<!DOCTYPE html>
<html lang="es"><head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" onerror="this.onerror=null;this.href='https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css'" />
<style>
  html,body,#map{margin:0;padding:0;height:100%;width:100%;background:${MAP_BACKGROUND};}
  body{font-family:Inter,"DM Sans",-apple-system,system-ui,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent;}
  .leaflet-container{background:${MAP_BACKGROUND};font-family:inherit;}
  .leaflet-control-attribution{background:rgba(255,255,255,.85)!important;color:#66796B!important;font-size:9px!important;border-radius:6px 0 0 0;}
  .leaflet-control-attribution a{color:#2E7D32!important;}
  .leaflet-bar{border:1px solid #D2DDCC!important;border-radius:14px!important;overflow:hidden;box-shadow:0 8px 20px rgba(20,38,26,.12)!important;}
  .leaflet-bar a{background:#fff!important;color:#14261A!important;border-bottom-color:#E3EADF!important;}
  .leaflet-bar a:hover{background:#EEF4EA!important;}
  .leaflet-control-layers{background:#fff!important;color:#3F5245!important;border:1px solid #D2DDCC!important;border-radius:14px!important;box-shadow:0 8px 20px rgba(20,38,26,.12)!important;}
  .leaflet-control-layers-expanded{padding:8px 12px!important;}
  .leaflet-popup-content-wrapper{background:#fff;color:#14261A;border-radius:14px;box-shadow:0 12px 30px rgba(20,38,26,.18);}
  .leaflet-popup-content{margin:10px 14px;font-size:13px;line-height:1.4;}
  .leaflet-popup-tip{background:#fff;}
  .pp-t{font-weight:800;color:#14261A;} .pp-s{color:#66796B;font-size:12px;margin-top:2px;}
  .zone{position:relative;width:30px;height:30px;animation:pop .6s cubic-bezier(.16,1,.3,1) both;}
  .zone .glow{position:absolute;left:-10px;top:-10px;width:50px;height:50px;border-radius:50%;opacity:.25;animation:breathe 2.6s ease-in-out infinite;}
  .zone .ring{display:none;position:absolute;left:-7px;top:-7px;width:40px;height:40px;border-radius:50%;border:2px solid #14261A;box-sizing:border-box;}
  .zone.sel .ring{display:block;}
  .zone .dot{position:absolute;inset:0;border-radius:50%;border:3px solid #fff;box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;color:#fff;box-shadow:0 4px 12px rgba(20,38,26,.25);}
  .rep{width:12px;height:12px;transform:rotate(45deg);border:2px solid #fff;border-radius:3px;box-sizing:content-box;box-shadow:0 2px 6px rgba(0,0,0,.25);animation:pop .5s ease both;}
  .me{width:14px;height:14px;border-radius:50%;background:#007afc;border:3px solid #fff;animation:pulse 2s infinite;}
  @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(0,122,252,.55)}70%{box-shadow:0 0 0 16px rgba(0,122,252,0)}100%{box-shadow:0 0 0 0 rgba(0,122,252,0)}}
  @keyframes pop{0%{transform:scale(.3);opacity:0}100%{transform:scale(1);opacity:1}}
  @keyframes breathe{0%,100%{transform:scale(.9);opacity:.18}50%{transform:scale(1.15);opacity:.34}}
  .rep{animation:none;}
  .pin{position:relative;width:30px;height:42px;}
  .pin .head{position:absolute;left:0;top:0;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#2E7D32;border:3px solid #fff;box-sizing:border-box;box-shadow:0 6px 14px rgba(20,38,26,.3);}
  .pin .core{position:absolute;left:10px;top:10px;width:10px;height:10px;border-radius:50%;background:#E3F35B;}
  .pin .shadow{position:absolute;left:9px;bottom:0;width:12px;height:4px;border-radius:50%;background:rgba(0,0,0,.3);}
  #hint{display:none;position:absolute;left:50%;top:10px;transform:translateX(-50%);z-index:800;background:#2E7D32;color:#fff;font-size:12px;font-weight:700;padding:6px 14px;border-radius:100px;pointer-events:none;white-space:nowrap;box-shadow:0 8px 20px rgba(46,125,50,.35);}
  #offline{display:none;position:absolute;inset:0;z-index:900;align-items:center;justify-content:center;flex-direction:column;gap:6px;text-align:center;color:#3F5245;padding:24px;font-size:13px;line-height:1.45;background:${MAP_BACKGROUND};}
  #offline b{color:#14261A;font-size:15px;}
</style>
</head>
<body>
<div id="map"></div>
<div id="hint">Toca el mapa o arrastra el pin</div>
<div id="offline"><b>Mapa sin conexión</b><span>El mapa base necesita internet.<br/>Tu ubicación GPS se guarda igual en el aviso.</span></div>
<script>
(function(){
  var CFG = ${cfg};
  function send(m){
    var s = JSON.stringify(m);
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(s); }
    else if (window.parent && window.parent !== window) { window.parent.postMessage({ __hgOut: true, payload: s }, '*'); }
  }
  var queue = [], api = null;
  window.__hgReceive = function(m){
    if (typeof m === 'string') { try { m = JSON.parse(m); } catch(e) { return; } }
    if (!m) return;
    if (!api) { queue.push(m); return; }
    api.handle(m);
  };
  window.addEventListener('message', function(e){ var d = e.data; if (d && d.__hgIn) window.__hgReceive(d.payload); });

  function loadScript(list, ok, fail){
    if (!list.length) { fail(); return; }
    var s = document.createElement('script');
    s.src = list[0]; s.async = true; s.onload = ok;
    s.onerror = function(){ loadScript(list.slice(1), ok, fail); };
    document.head.appendChild(s);
  }
  function esc(t){ return String(t == null ? '' : t).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }

  loadScript(['https://unpkg.com/leaflet@1.9.4/dist/leaflet.js','https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js'], init, function(){
    document.getElementById('offline').style.display = 'flex';
    send({ type: 'error' });
  });

  function init(){
    var map = L.map('map', { zoomControl: true, attributionControl: true, preferCanvas: true, tap: true })
      .setView([CFG.center.lat, CFG.center.lng], CFG.zoom);
    var dark = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', { maxZoom: 16, attribution: 'Mapa &copy; Esri' });
    var sat = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 18, attribution: 'Imágenes &copy; Esri' });
    var light = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Mapa &copy; Esri, HERE, Garmin, OpenStreetMap' });
    (CFG.base === 'sat' ? sat : CFG.base === 'dark' ? dark : light).addTo(map);
    L.control.layers({ 'Topográfico': light, 'Satélite': sat, 'Oscuro': dark }, null, { position: 'topright' }).addTo(map);

    map.createPane('geoPoly').style.zIndex = 410;
    map.createPane('geoLine').style.zIndex = 420;
    map.createPane('geoPoint').style.zIndex = 430;
    var geo = {}, geoVisible = null;

    function setGeo(layers){
      Object.keys(geo).forEach(function(k){ map.removeLayer(geo[k]); });
      geo = {};
      layers.forEach(function(l){
        var s = l.style || {};
        var pane = l.kind === 'point' ? 'geoPoint' : (l.kind === 'polygon' ? 'geoPoly' : 'geoLine');
        geo[l.id] = L.geoJSON(l.data, {
          pane: pane,
          style: function(){
            return { color: s.color, weight: s.weight == null ? 1.5 : s.weight, opacity: s.opacity == null ? 0.9 : s.opacity,
                     fillColor: s.fillColor || s.color, fillOpacity: s.fillOpacity == null ? 0.3 : s.fillOpacity, dashArray: s.dash || null };
          },
          pointToLayer: function(f, ll){
            return L.circleMarker(ll, { pane: pane, radius: s.radius || 4, color: s.stroke || '#ffffff', weight: 1.2, fillColor: s.color, fillOpacity: 0.95 });
          },
          onEachFeature: function(f, layer){
            var p = f.properties || {};
            layer.bindPopup('<div class="pp-t">' + esc(p.nombre || l.name) + '</div><div class="pp-s">' + esc(l.name) + (p.tipo ? ' · ' + esc(p.tipo) : '') + '</div>');
          }
        });
      });
      applyGeoVisible();
    }
    function applyGeoVisible(){
      Object.keys(geo).forEach(function(k){
        var on = !geoVisible || geoVisible.indexOf(k) >= 0;
        if (on && !map.hasLayer(geo[k])) geo[k].addTo(map);
        if (!on && map.hasLayer(geo[k])) map.removeLayer(geo[k]);
      });
    }

    var gridLayer = L.layerGroup().addTo(map);
    var zoneLayer = L.layerGroup().addTo(map);
    var repLayer = L.layerGroup().addTo(map);
    var meLayer = L.layerGroup().addTo(map);
    var pickMarker = null, mode = 'view', lastFitKey = null;
    var hint = document.getElementById('hint');

    var pinIcon = L.divIcon({ className: '', html: '<div class="pin"><div class="shadow"></div><div class="head"></div><div class="core"></div></div>', iconSize: [30, 42], iconAnchor: [15, 40] });

    function setPick(lat, lng){
      if (!pickMarker) {
        pickMarker = L.marker([lat, lng], { draggable: true, icon: pinIcon, zIndexOffset: 1000 }).addTo(map);
        pickMarker.on('dragend', function(){ var p = pickMarker.getLatLng(); send({ type: 'pick', lat: p.lat, lng: p.lng }); });
      } else { pickMarker.setLatLng([lat, lng]); }
    }
    map.on('click', function(e){
      if (mode !== 'pick') return;
      setPick(e.latlng.lat, e.latlng.lng);
      send({ type: 'pick', lat: e.latlng.lat, lng: e.latlng.lng });
    });

    function render(d){
      gridLayer.clearLayers();
      (d.cells || []).forEach(function(c){
        L.rectangle([[c.lat0, c.lng0], [c.lat1, c.lng1]], { stroke: false, fillColor: c.color, fillOpacity: c.opacity, interactive: false }).addTo(gridLayer);
      });

      zoneLayer.clearLayers();
      (d.zones || []).forEach(function(z){
        var html = '<div class="zone' + (z.selected ? ' sel' : '') + '"><div class="glow" style="background:' + esc(z.color) + '"></div><div class="ring"></div><div class="dot" style="background:' + esc(z.color) + '">' + esc(z.label) + '</div></div>';
        var m = L.marker([z.lat, z.lng], { icon: L.divIcon({ className: '', html: html, iconSize: [30, 30], iconAnchor: [15, 15] }), zIndexOffset: z.selected ? 600 : 400 });
        if (z.title) m.bindTooltip(esc(z.title), { direction: 'top', offset: [0, -16] });
        m.on('click', function(){ send({ type: 'zoneSelect', id: z.id }); });
        m.addTo(zoneLayer);
      });

      repLayer.clearLayers();
      (d.reports || []).forEach(function(r){
        var m = L.marker([r.lat, r.lng], { icon: L.divIcon({ className: '', html: '<div class="rep" style="background:' + esc(r.color) + '"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }), zIndexOffset: 300 });
        m.bindPopup('<div class="pp-t">' + esc(r.title) + '</div>' + (r.subtitle ? '<div class="pp-s">' + esc(r.subtitle) + '</div>' : ''));
        m.on('click', function(){ send({ type: 'reportSelect', id: r.id }); });
        m.addTo(repLayer);
      });

      meLayer.clearLayers();
      if (d.me) {
        if (d.me.accuracy) L.circle([d.me.lat, d.me.lng], { radius: d.me.accuracy, color: '#007afc', weight: 1, fillColor: '#007afc', fillOpacity: 0.12, interactive: false }).addTo(meLayer);
        L.marker([d.me.lat, d.me.lng], { icon: L.divIcon({ className: '', html: '<div class="me"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), interactive: false, zIndexOffset: 800 }).addTo(meLayer);
      }

      mode = d.mode || 'view';
      hint.style.display = mode === 'pick' ? 'block' : 'none';
      if (mode === 'pick' && d.pick) { setPick(d.pick.lat, d.pick.lng); }
      else if (mode !== 'pick' && pickMarker) { map.removeLayer(pickMarker); pickMarker = null; }

      if (d.fitTo && d.fitTo.length && d.fitKey !== lastFitKey) {
        lastFitKey = d.fitKey;
        if (d.fitTo.length === 1) map.setView([d.fitTo[0].lat, d.fitTo[0].lng], Math.max(map.getZoom(), 14));
        else map.fitBounds(L.latLngBounds(d.fitTo.map(function(p){ return [p.lat, p.lng]; })).pad(0.25));
      }
    }

    api = { handle: function(m){
      if (m.type === 'data') render(m.data);
      else if (m.type === 'flyTo') map.flyTo([m.lat, m.lng], m.zoom || Math.max(map.getZoom(), 13), { duration: 0.8 });
      else if (m.type === 'invalidate') map.invalidateSize();
      else if (m.type === 'geo') setGeo(m.layers || []);
      else if (m.type === 'geoVisible') { geoVisible = m.ids || []; applyGeoVisible(); }
    } };
    queue.forEach(api.handle); queue = [];
    window.addEventListener('resize', function(){ map.invalidateSize(); });
    setTimeout(function(){ map.invalidateSize(); }, 250);
    send({ type: 'ready' });
  }
})();
</script>
</body></html>`;
}
