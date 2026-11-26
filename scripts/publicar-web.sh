#!/usr/bin/env bash
# Publica la versión web de MercurIA en GitHub Pages (rama gh-pages).
# Uso:  bash scripts/publicar-web.sh
# Requisitos: el repositorio ya tiene un remoto "origin" en GitHub y tú puedes hacer push.
set -euo pipefail

cd "$(dirname "$0")/.."
REMOTE_URL="$(git remote get-url origin)"
REPO_NAME="$(basename -s .git "$REMOTE_URL")"

echo "▶ Exportando la web para /$REPO_NAME …"
rm -rf dist
EXPO_BASE_URL="/$REPO_NAME" npx expo export --platform web --output-dir dist
cp dist/index.html dist/404.html   # rutas como /report funcionan al recargar
touch dist/.nojekyll

echo "▶ Subiendo a la rama gh-pages …"
cd dist
git init -q
git checkout -q -b gh-pages
git add -A
git commit -q -m "Publicar web $(date '+%Y-%m-%d %H:%M')"
git push -f "$REMOTE_URL" gh-pages
cd ..
rm -rf dist/.git

OWNER="$(echo "$REMOTE_URL" | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#')"
echo ""
echo "✔ Listo. Si es la primera vez: en GitHub → Settings → Pages → Branch: gh-pages / (root) → Save."
echo "  Enlace: https://$OWNER.github.io/$REPO_NAME/"
