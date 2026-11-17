#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# start db/api if available (best effort)
docker compose -f infra/compose/docker-compose.yml up -d postgres >/dev/null 2>&1 || true
if ! curl -sf http://localhost:8080/actuator/health >/dev/null 2>&1; then
  (cd services/api && JAVA_HOME=/opt/homebrew/opt/openjdk@21 ./gradlew bootRun >/tmp/demo-api.log 2>&1 &)
fi
if ! curl -sf http://localhost:3000 >/dev/null 2>&1; then
  (cd apps/web && pnpm dev --host 0.0.0.0 --port 3000 >/tmp/demo-web.log 2>&1 &)
fi

echo "Waiting for demo web..."
for i in {1..60}; do
  if curl -sf http://localhost:3000 >/dev/null 2>&1; then break; fi
  sleep 1
done

cat <<'INFO'
SchoolOS DEMO (données fictives)
URL: http://localhost:3000
Connexion 1 clic (écran d'accueil démo): Directeur, Enseignant, Parent (2 enfants), et autres rôles.
Reset: bouton "Réinitialiser la démo" dans le menu démo, ou make demo-reset
INFO
