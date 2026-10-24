#!/usr/bin/env bash
# Stops the Local Demo.
#
#   scripts/demo-down.sh          stop; demo data is kept for the next start
#   scripts/demo-down.sh --reset  stop and delete the demo's own volumes
#                                 (demo database, demo photos, seed marker)
#
# Only the "outdoor-demo" Compose project is touched; the development stack
# in Project/docker-compose.yml and its volume are never affected.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$ROOT/deploy/local-demo"
ENV_FILE="$DEMO/.env.demo"
[ -f "$ENV_FILE" ] || ENV_FILE="$DEMO/.env.demo.example"

compose() {
  docker compose --env-file "$ENV_FILE" -f "$DEMO/docker-compose.demo.yml" --profile seed "$@"
}

if [ "${1:-}" = "--reset" ]; then
  read -r -p "Delete all Local Demo data (accounts created in the demo, Plans, Memories, photos)? [y/N] " answer
  case "$answer" in
    [yY]*) compose down -v --remove-orphans; echo "Local Demo stopped and its data deleted." ;;
    *) echo "Nothing deleted." ;;
  esac
else
  compose down --remove-orphans
  echo "Local Demo stopped. Data is kept; start again with scripts/demo-up.sh."
fi
