# MercurIA

Monitoreo ciudadano del riesgo por mercurio en zonas mineras de Bolivia (React Native + Expo Router).

- **Mapa de riesgo**: interpolación IDW (demo), capas del territorio preparadas en QGIS (© OpenStreetMap) y avisos ciudadanos.
- **Reporte anónimo offline**: foto (cámara o galería), GPS, se guarda sin señal y se envía solo al volver internet.
- **Asistente**: 32 preguntas frecuentes verificadas que funcionan sin internet + demo RAG en línea.

## Web

La versión web se publica sola en GitHub Pages con cada `push` a `main`
(`.github/workflows/deploy-pages.yml`).

## Desarrollo

```bash
npm install
npx expo start
```

## Capas de QGIS

`qgis/preparar_capas.py` descarga y prepara las capas (ejecutar en la consola de Python de QGIS).

> Valores demo: no sustituyen análisis de laboratorio.
