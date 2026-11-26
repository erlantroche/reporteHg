# -*- coding: utf-8 -*-
"""
ReporteHg — Preparación de capas en QGIS
========================================

Qué hace (todo automático):
  1. Descarga de OpenStreetMap (Overpass) las capas útiles para el mapa de riesgo
     en la zona aurífera del norte de La Paz (Guanay, Tipuani, Mapiri, Teoponte).
  2. Las limpia, simplifica (para que el celular no se ponga lento) y les da estilo.
  3. Agrega las zonas de muestreo demo de la app y mapas base (OSM y satélite).
  4. Exporta todo como GeoJSON (EPSG:4326) a  ~/reporteHg/assets/geo/  para la app.
  5. Guarda el proyecto en  ~/reporteHg/qgis/ReporteHg.qgz

Cómo ejecutarlo:
  QGIS > Complementos > Consola de Python, y pega esta línea:
      exec(open('/home/erlan/reporteHg/qgis/preparar_capas.py', encoding='utf-8').read())

  Necesita internet. QGIS puede quedarse "congelado" 1–3 minutos mientras descarga: es normal.

Capas que NO vienen de OSM y conviene sumar después a mano (las tiene el equipo):
  - Concesiones mineras georreferenciadas (Leoni / AJAM)
  - HydroRIVERS (red de ríos con caudal y dirección de flujo)
  - Minería detectada por satélite (Amazon Mining Watch)
  - Puntos de muestreo reales (estudios publicados, laboratorio, tiras de prueba)
"""

import json
import os
import shutil
import ssl
import time
import urllib.parse
import urllib.request

import processing
from qgis.core import (
    QgsCoordinateReferenceSystem,
    QgsCoordinateTransform,
    QgsFeature,
    QgsField,
    QgsFillSymbol,
    QgsGeometry,
    QgsLineSymbol,
    QgsMarkerSymbol,
    QgsPalLayerSettings,
    QgsPointXY,
    QgsProject,
    QgsRasterLayer,
    QgsRectangle,
    QgsRendererCategory,
    QgsCategorizedSymbolRenderer,
    QgsSingleSymbolRenderer,
    QgsTextBufferSettings,
    QgsTextFormat,
    QgsVectorFileWriter,
    QgsVectorLayer,
    QgsVectorLayerSimpleLabeling,
)
from qgis.PyQt.QtCore import QVariant
from qgis.PyQt.QtGui import QColor, QFont
from qgis.PyQt.QtWidgets import QApplication

# --------------------------------------------------------------------------
# Configuración
# --------------------------------------------------------------------------
HOME = os.path.expanduser("~")
PROJECT_DIR = os.path.join(HOME, "reporteHg")
OUT_DIR = os.path.join(PROJECT_DIR, "assets", "geo")
RAW_DIR = os.path.join(PROJECT_DIR, "qgis", "osm_crudo")
QGZ_PATH = os.path.join(PROJECT_DIR, "qgis", "ReporteHg.qgz")
APP_DATA_DIR = os.path.join(PROJECT_DIR, "src", "data", "geo")  # copias .json que importa la app

# Área de estudio (sur, oeste, norte, este) — zona aurífera del norte de La Paz.
BBOX = (-15.85, -68.35, -15.20, -67.55)

OVERPASS_URLS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

# Zonas demo de la app (mismas que src/data/mocks.ts + src/data/zoneGeo.ts).
ZONAS_DEMO = [
    {"id": "z-1", "nombre": "Tramo Río Alto — Sector A", "lat": -15.462, "lng": -67.905,
     "hg_mgkg": 0.65, "incert": 0.25, "exposic": 0.8, "vulnerab": 0.7, "riesgo": "alto"},
    {"id": "z-2", "nombre": "Ribera Media — Toma comunal", "lat": -15.505, "lng": -67.872,
     "hg_mgkg": 0.28, "incert": 0.45, "exposic": 0.6, "vulnerab": 0.5, "riesgo": "medio"},
    {"id": "z-3", "nombre": "Sector Aguas Arriba", "lat": -15.585, "lng": -67.985,
     "hg_mgkg": 0.08, "incert": 0.15, "exposic": 0.2, "vulnerab": 0.3, "riesgo": "bajo"},
]

# Capas a descargar. geom: line | polygon | point | area_or_point
# simplify: tolerancia en grados (≈ 0.0003° ~ 30 m). None = sin simplificar.
CAPAS = [
    {
        "id": "rios", "nombre": "Ríos principales", "grupo": "Agua", "geom": "line", "simplify": 0.0002,
        "query": 'way["waterway"="river"]({bbox});',
        "uso": "Hacia dónde viaja el mercurio por el agua (peligro aguas abajo).",
    },
    {
        "id": "quebradas", "nombre": "Quebradas y arroyos", "grupo": "Agua", "geom": "line", "simplify": 0.0003,
        "query": 'way["waterway"~"^(stream|canal|drain)$"]({bbox});',
        "uso": "Afluentes donde suelen operar dragas y lavaderos.",
    },
    {
        "id": "cuerpos_agua", "nombre": "Cuerpos de agua", "grupo": "Agua", "geom": "polygon", "simplify": 0.0002,
        "query": 'way["natural"="water"]({bbox}); relation["natural"="water"]({bbox}); way["waterway"="riverbank"]({bbox});',
        "uso": "Cauces anchos, lagunas y pozas (sedimento donde se acumula Hg).",
    },
    {
        "id": "poblados", "nombre": "Poblados y comunidades", "grupo": "Exposición", "geom": "point", "simplify": None,
        "query": 'node["place"~"^(city|town|village|hamlet|isolated_dwelling)$"]({bbox});',
        "uso": "Capa de exposición: personas que viven cerca del río.",
    },
    {
        "id": "tomas_agua", "nombre": "Tomas y fuentes de agua", "grupo": "Exposición", "geom": "point", "simplify": None,
        "query": ('node["man_made"~"^(water_works|water_tower|water_well|reservoir_covered|pumping_station)$"]({bbox}); '
                  'way["man_made"~"^(water_works|reservoir_covered|water_tower)$"]({bbox}); '
                  'node["amenity"="drinking_water"]({bbox});'),
        "uso": "Capa de exposición: tomas de agua para consumo.",
    },
    {
        "id": "escuelas_salud", "nombre": "Escuelas y centros de salud", "grupo": "Vulnerabilidad", "geom": "point", "simplify": None,
        "query": ('node["amenity"~"^(school|kindergarten|clinic|hospital|doctors|health_post)$"]({bbox}); '
                  'way["amenity"~"^(school|kindergarten|clinic|hospital|doctors|health_post)$"]({bbox}); '
                  'node["healthcare"]({bbox});'),
        "uso": "Capa de vulnerabilidad: niños y atención de salud.",
    },
    {
        "id": "mineria", "nombre": "Minería (OSM)", "grupo": "Minería", "geom": "area_or_point", "simplify": 0.0001,
        "query": ('way["landuse"="quarry"]({bbox}); relation["landuse"="quarry"]({bbox}); '
                  'way["industrial"="mine"]({bbox}); node["industrial"="mine"]({bbox}); '
                  'node["man_made"~"^(mineshaft|adit)$"]({bbox}); way["landuse"="industrial"]["industrial"="mining"]({bbox});'),
        "uso": "Áreas y puntos mineros mapeados en OSM (incompleto: sumar Amazon Mining Watch).",
    },
    {
        "id": "caminos", "nombre": "Caminos principales", "grupo": "Contexto", "geom": "line", "simplify": 0.0003,
        "query": 'way["highway"~"^(trunk|primary|secondary|tertiary)$"]({bbox});',
        "uso": "Acceso a comunidades y zonas de trabajo de campo.",
    },
]

# Estilos (colores alineados al tema oscuro de la app).
ESTILOS = {
    "rios": lambda: QgsLineSymbol.createSimple({"color": "#4FA3F0", "width": "0.8", "capstyle": "round", "joinstyle": "round"}),
    "quebradas": lambda: QgsLineSymbol.createSimple({"color": "#2F6FB8", "width": "0.3"}),
    "cuerpos_agua": lambda: QgsFillSymbol.createSimple({"color": "28,79,130,170", "outline_style": "no"}),
    "poblados": lambda: QgsMarkerSymbol.createSimple({"name": "circle", "color": "#FFFFFF", "size": "2.4", "outline_color": "#0e1012", "outline_width": "0.4"}),
    "tomas_agua": lambda: QgsMarkerSymbol.createSimple({"name": "circle", "color": "#5EDC97", "size": "2.2", "outline_color": "#0e1012"}),
    "escuelas_salud": lambda: QgsMarkerSymbol.createSimple({"name": "triangle", "color": "#F5A524", "size": "2.8", "outline_color": "#0e1012"}),
    "mineria_areas": lambda: QgsFillSymbol.createSimple({"color": "255,77,79,90", "outline_color": "#FF4D4F", "outline_width": "0.4"}),
    "mineria_puntos": lambda: QgsMarkerSymbol.createSimple({"name": "cross2", "color": "#FF4D4F", "size": "3", "outline_color": "#FF4D4F", "outline_width": "0.6"}),
    "caminos": lambda: QgsLineSymbol.createSimple({"color": "#8B96AA", "width": "0.35", "line_style": "dash"}),
}
ETIQUETAS = {"rios": 8, "poblados": 9}

RIESGO_COLOR = {"alto": "#FF4D4F", "medio": "#F5A524", "bajo": "#2FBF71"}


# --------------------------------------------------------------------------
# Utilidades
# --------------------------------------------------------------------------
def log(msg):
    print("[ReporteHg] " + msg)
    QApplication.processEvents()


def overpass(body):
    s, w, n, e = BBOX
    bbox = "{},{},{},{}".format(s, w, n, e)
    query = "[out:json][timeout:180];(" + body.format(bbox=bbox) + ");out geom;"
    data = urllib.parse.urlencode({"data": query}).encode("utf-8")
    ctx = ssl.create_default_context()
    last_error = None
    for url in OVERPASS_URLS:
        for intento in range(2):
            try:
                req = urllib.request.Request(url, data=data, headers={"User-Agent": "ReporteHg-QGIS/1.0 (proyecto academico)"})
                with urllib.request.urlopen(req, timeout=200, context=ctx) as resp:
                    return json.loads(resp.read().decode("utf-8"))
            except Exception as exc:  # noqa: BLE001
                last_error = exc
                log("   servidor ocupado ({}), reintentando…".format(type(exc).__name__))
                time.sleep(4 + intento * 4)
    raise RuntimeError("No se pudo descargar de Overpass: {}".format(last_error))


def tipo_osm(tags):
    for k in ("waterway", "place", "amenity", "healthcare", "man_made", "industrial", "landuse", "highway", "natural"):
        if k in tags:
            return "{}={}".format(k, tags[k])
    return ""


def coords_de(geometry):
    return [[round(p["lon"], 6), round(p["lat"], 6)] for p in geometry if p]


def unir_segmentos(segmentos):
    """Une segmentos abiertos de una relación en anillos cerrados (básico)."""
    anillos = []
    pendientes = [list(s) for s in segmentos if len(s) >= 2]
    while pendientes:
        actual = pendientes.pop(0)
        cambio = True
        while cambio and actual[0] != actual[-1]:
            cambio = False
            for i, seg in enumerate(pendientes):
                if seg[0] == actual[-1]:
                    actual += seg[1:]
                elif seg[-1] == actual[-1]:
                    actual += list(reversed(seg))[1:]
                elif seg[-1] == actual[0]:
                    actual = seg + actual[1:]
                elif seg[0] == actual[0]:
                    actual = list(reversed(seg)) + actual[1:]
                else:
                    continue
                pendientes.pop(i)
                cambio = True
                break
        if len(actual) >= 4 and actual[0] == actual[-1]:
            anillos.append(actual)
    return anillos


def centroide(coords):
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return [sum(xs) / len(xs), sum(ys) / len(ys)]


def osm_a_features(data, geom):
    puntos, lineas, poligonos = [], [], []
    for el in data.get("elements", []):
        tags = el.get("tags") or {}
        props = {
            "osm_id": "{}/{}".format(el.get("type"), el.get("id")),
            "nombre": tags.get("name", ""),
            "tipo": tipo_osm(tags),
        }
        t = el.get("type")
        if t == "node" and "lat" in el:
            if geom in ("point", "area_or_point"):
                puntos.append((props, {"type": "Point", "coordinates": [el["lon"], el["lat"]]}))
        elif t == "way" and el.get("geometry"):
            c = coords_de(el["geometry"])
            if len(c) < 2:
                continue
            cerrado = len(c) >= 4 and c[0] == c[-1]
            if geom == "line":
                lineas.append((props, {"type": "LineString", "coordinates": c}))
            elif geom in ("polygon", "area_or_point") and cerrado:
                poligonos.append((props, {"type": "Polygon", "coordinates": [c]}))
            elif geom == "point":
                puntos.append((props, {"type": "Point", "coordinates": centroide(c)}))
        elif t == "relation" and geom in ("polygon", "area_or_point"):
            cerrados, abiertos = [], []
            for m in el.get("members", []):
                if m.get("type") != "way" or m.get("role") not in ("outer", "") or not m.get("geometry"):
                    continue
                c = coords_de(m["geometry"])
                (cerrados if len(c) >= 4 and c[0] == c[-1] else abiertos).append(c)
            anillos = cerrados + unir_segmentos(abiertos)
            if anillos:
                poligonos.append((props, {"type": "MultiPolygon", "coordinates": [[a] for a in anillos]}))
    return puntos, lineas, poligonos


def escribir_geojson_crudo(path, feats):
    fc = {"type": "FeatureCollection", "features": [{"type": "Feature", "properties": p, "geometry": g} for p, g in feats]}
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(fc, fh, ensure_ascii=False)


def exportar_para_app(layer, path):
    if os.path.exists(path):
        os.remove(path)
    opts = QgsVectorFileWriter.SaveVectorOptions()
    opts.driverName = "GeoJSON"
    opts.fileEncoding = "UTF-8"
    opts.layerOptions = ["RFC7946=YES", "COORDINATE_PRECISION=5", "WRITE_BBOX=NO"]
    res = QgsVectorFileWriter.writeAsVectorFormatV3(layer, path, QgsProject.instance().transformContext(), opts)
    if res[0] != QgsVectorFileWriter.NoError:
        raise RuntimeError("Error al exportar {}: {}".format(path, res[1]))


def aplicar_estilo(layer, estilo_id):
    if estilo_id in ESTILOS:
        layer.setRenderer(QgsSingleSymbolRenderer(ESTILOS[estilo_id]()))
    if estilo_id in ETIQUETAS:
        fmt = QgsTextFormat()
        fmt.setFont(QFont("Sans Serif", ETIQUETAS[estilo_id]))
        fmt.setSize(ETIQUETAS[estilo_id])
        fmt.setColor(QColor("#FFFFFF"))
        buf = QgsTextBufferSettings()
        buf.setEnabled(True)
        buf.setColor(QColor("#0e1012"))
        buf.setSize(0.8)
        fmt.setBuffer(buf)
        pal = QgsPalLayerSettings()
        pal.fieldName = "nombre"
        pal.setFormat(fmt)
        layer.setLabeling(QgsVectorLayerSimpleLabeling(pal))
        layer.setLabelsEnabled(True)
    layer.triggerRepaint()


def grupo(nombre):
    root = QgsProject.instance().layerTreeRoot()
    g = root.findGroup(nombre)
    return g if g else root.addGroup(nombre)


def agregar(layer, nombre_grupo):
    QgsProject.instance().addMapLayer(layer, False)
    grupo(nombre_grupo).addLayer(layer)


def capa_desde_archivo(path, nombre):
    lyr = QgsVectorLayer(path, nombre, "ogr")
    if not lyr.isValid():
        raise RuntimeError("Capa inválida: " + path)
    return lyr


def procesar_capa(cfg, crudo_path, sufijo, nombre, estilo_id, resumen):
    capa = capa_desde_archivo(crudo_path, nombre)
    if cfg["simplify"] and cfg["geom"] != "point" and sufijo != "_puntos":
        capa = processing.run(
            "native:simplifygeometries",
            {"INPUT": capa, "METHOD": 0, "TOLERANCE": cfg["simplify"], "OUTPUT": "memory:"},
        )["OUTPUT"]
    final_path = os.path.join(OUT_DIR, cfg["id"] + sufijo + ".geojson")
    exportar_para_app(capa, final_path)
    final = capa_desde_archivo(final_path, nombre)
    aplicar_estilo(final, estilo_id)
    agregar(final, cfg["grupo"])
    kb = os.path.getsize(final_path) / 1024.0
    resumen.append({
        "id": cfg["id"] + sufijo, "nombre": nombre, "grupo": cfg["grupo"], "uso": cfg["uso"],
        "archivo": "assets/geo/" + os.path.basename(final_path), "elementos": final.featureCount(), "kb": round(kb, 1),
    })
    log("   ✓ {} — {} elementos, {:.0f} KB".format(nombre, final.featureCount(), kb))


# --------------------------------------------------------------------------
# Proceso principal
# --------------------------------------------------------------------------
def main():
    if not iface.newProject(True):  # noqa: F821  (iface existe en la consola de QGIS)
        log("Cancelado: no se creó un proyecto nuevo.")
        return

    os.makedirs(OUT_DIR, exist_ok=True)
    os.makedirs(RAW_DIR, exist_ok=True)
    proyecto = QgsProject.instance()
    proyecto.setCrs(QgsCoordinateReferenceSystem("EPSG:3857"))
    proyecto.setTitle("ReporteHg — Mapa de riesgo por mercurio")

    # Orden de grupos en el panel (arriba = encima en el mapa)
    for g in ("Zonas de la app", "Minería", "Exposición", "Vulnerabilidad", "Agua", "Contexto", "Mapas base"):
        grupo(g)

    # Mapas base
    for nombre, url, zmax in (
        ("Satélite (Esri)", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", 18),
        ("OpenStreetMap", "https://tile.openstreetmap.org/{z}/{x}/{y}.png", 19),
    ):
        uri = "type=xyz&url={}&zmin=0&zmax={}".format(urllib.parse.quote(url, safe=":/{}"), zmax)
        base = QgsRasterLayer(uri, nombre, "wms")
        if base.isValid():
            agregar(base, "Mapas base")

    resumen = []
    for cfg in CAPAS:
        log("Descargando: {} …".format(cfg["nombre"]))
        try:
            datos = overpass(cfg["query"])
        except Exception as exc:  # noqa: BLE001
            log("   ✗ {} (se omite): {}".format(cfg["nombre"], exc))
            continue
        puntos, lineas, poligonos = osm_a_features(datos, cfg["geom"])

        partes = []
        if cfg["geom"] == "area_or_point":
            partes = [("_areas", "Áreas — " + cfg["nombre"], cfg["id"] + "_areas", poligonos),
                      ("_puntos", "Puntos — " + cfg["nombre"], cfg["id"] + "_puntos", puntos)]
        else:
            feats = {"line": lineas, "polygon": poligonos, "point": puntos}[cfg["geom"]]
            partes = [("", cfg["nombre"], cfg["id"], feats)]

        for sufijo, nombre, estilo_id, feats in partes:
            if not feats:
                log("   · {}: sin datos en OSM para esta zona".format(nombre))
                continue
            crudo = os.path.join(RAW_DIR, cfg["id"] + sufijo + ".geojson")
            escribir_geojson_crudo(crudo, feats)
            try:
                procesar_capa(cfg, crudo, sufijo, nombre, estilo_id, resumen)
            except Exception as exc:  # noqa: BLE001
                log("   ✗ {}: {}".format(nombre, exc))
        time.sleep(2)  # respeto al servidor público de Overpass

    # Zonas demo de la app (para comparar con las capas reales)
    zonas = QgsVectorLayer("Point?crs=EPSG:4326", "Zonas de muestreo (demo app)", "memory")
    pr = zonas.dataProvider()
    pr.addAttributes([
        QgsField("id", QVariant.String), QgsField("nombre", QVariant.String),
        QgsField("hg_mgkg", QVariant.Double), QgsField("incert", QVariant.Double),
        QgsField("exposic", QVariant.Double), QgsField("vulnerab", QVariant.Double),
        QgsField("riesgo", QVariant.String),
    ])
    zonas.updateFields()
    for z in ZONAS_DEMO:
        f = QgsFeature(zonas.fields())
        f.setGeometry(QgsGeometry.fromPointXY(QgsPointXY(z["lng"], z["lat"])))
        f.setAttributes([z["id"], z["nombre"], z["hg_mgkg"], z["incert"], z["exposic"], z["vulnerab"], z["riesgo"]])
        pr.addFeature(f)
    zonas.updateExtents()
    cats = []
    for nivel, color in RIESGO_COLOR.items():
        sym = QgsMarkerSymbol.createSimple({"name": "circle", "color": color, "size": "5", "outline_color": "#0e1012", "outline_width": "0.8"})
        cats.append(QgsRendererCategory(nivel, sym, nivel.capitalize()))
    zonas.setRenderer(QgsCategorizedSymbolRenderer("riesgo", cats))
    zonas_path = os.path.join(OUT_DIR, "zonas_demo.geojson")
    exportar_para_app(zonas, zonas_path)
    agregar(zonas, "Zonas de la app")
    resumen.append({
        "id": "zonas_demo", "nombre": "Zonas de muestreo (demo app)", "grupo": "Zonas de la app",
        "uso": "Zonas demo que usa hoy la app; reemplazar por puntos de muestreo reales.",
        "archivo": "assets/geo/zonas_demo.geojson", "elementos": len(ZONAS_DEMO),
        "kb": round(os.path.getsize(zonas_path) / 1024.0, 1),
    })

    # Área de estudio
    s, w, n, e = BBOX
    area = QgsVectorLayer("Polygon?crs=EPSG:4326", "Área de estudio", "memory")
    fa = QgsFeature()
    fa.setGeometry(QgsGeometry.fromRect(QgsRectangle(w, s, e, n)))
    area.dataProvider().addFeature(fa)
    area.setRenderer(QgsSingleSymbolRenderer(QgsFillSymbol.createSimple({"color": "0,0,0,0", "outline_color": "#007afc", "outline_width": "0.6", "outline_style": "dash"})))
    agregar(area, "Contexto")

    # Índice para la app
    indice = {
        "generado": time.strftime("%Y-%m-%d %H:%M"),
        "fuente": "© OpenStreetMap contributors (ODbL) vía Overpass API",
        "bbox": {"sur": s, "oeste": w, "norte": n, "este": e},
        "capas": resumen,
    }
    with open(os.path.join(OUT_DIR, "capas.json"), "w", encoding="utf-8") as fh:
        json.dump(indice, fh, ensure_ascii=False, indent=2)

    # Copias .json para la app (src/data/geoLayers.ts las importa)
    os.makedirs(APP_DATA_DIR, exist_ok=True)
    for c in resumen:
        origen = os.path.join(PROJECT_DIR, c["archivo"])
        if os.path.exists(origen):
            shutil.copyfile(origen, os.path.join(APP_DATA_DIR, c["id"] + ".json"))

    # Encuadre y guardado
    xform = QgsCoordinateTransform(QgsCoordinateReferenceSystem("EPSG:4326"), proyecto.crs(), proyecto)
    iface.mapCanvas().setExtent(xform.transformBoundingBox(QgsRectangle(w, s, e, n)))  # noqa: F821
    iface.mapCanvas().refresh()  # noqa: F821
    proyecto.write(QGZ_PATH)

    total_kb = sum(c["kb"] for c in resumen)
    log("")
    log("LISTO ✔  {} capas exportadas ({:.0f} KB en total)".format(len(resumen), total_kb))
    log("   GeoJSON para la app: " + OUT_DIR)
    log("   Copias para la app:  " + APP_DATA_DIR)
    log("   Proyecto QGIS:       " + QGZ_PATH)


main()
