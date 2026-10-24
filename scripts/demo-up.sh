#!/usr/bin/env bash
# Starts the Local Demo: builds the application images, starts the stack,
# waits until it is healthy, and adds example data once.
#
#   scripts/demo-up.sh            build, start, seed
#   scripts/demo-up.sh --no-seed  build and start only
#
# Needs Docker with Compose v2. Configuration: deploy/local-demo/.env.demo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$ROOT/deploy/local-demo"
ENV_FILE="$DEMO/.env.demo"
SEED=1
[ "${1:-}" = "--no-seed" ] && SEED=0

compose() {
  docker compose --env-file "$ENV_FILE" -f "$DEMO/docker-compose.demo.yml" "$@"
}

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop (or the Docker daemon) and try again." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  cp "$DEMO/.env.demo.example" "$ENV_FILE"
  echo "Created deploy/local-demo/.env.demo from the example."
fi

set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a
WEB_PORT="${DEMO_WEB_PORT:-3000}"
KC_PORT="${DEMO_KEYCLOAK_PORT:-8181}"

echo "Building images and starting the demo (the first build takes several minutes)..."
compose up -d --build --wait --wait-timeout 900

if [ "$SEED" = 1 ]; then
  echo "Adding example data..."
  compose --profile seed run --rm demo-seed
  compose exec -T postgres psql -q -v ON_ERROR_STOP=1 \
    -U "${POSTGRES_USER:-outdoor}" -d plan_db \
    -v owner_subject="${DEMO_USER_ID:-0d3c2a9e-6f41-4b8a-9c2d-5e7f1a2b3c4d}" \
    -f /demo-seed/past-plans.sql
fi

cat <<INFO

Outdoor Trip Companion (Local Demo) is running.

  Application     http://localhost:${WEB_PORT}
  Demo accounts   demo / ${DEMO_USER_PASSWORD:-demo-password}   (example gear, Plans, Memories)
                  demo2 / ${DEMO_USER_PASSWORD:-demo-password}  (empty account)
                  or create a new account from the sign-in page
  Keycloak admin  http://localhost:${KC_PORT}/admin  (${KEYCLOAK_ADMIN:-admin} / ${KEYCLOAK_ADMIN_PASSWORD:-admin-demo})

Stop with scripts/demo-down.sh (data is kept).
INFO
