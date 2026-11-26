// Configuración dinámica: toma app.json y permite cambiar la ruta base al publicar en GitHub Pages.
// En GitHub Actions se usa EXPO_BASE_URL=/<nombre-del-repo>; en local queda vacío.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
