#!/usr/bin/env bash
set -euo pipefail

DETACHED=0
BUILD=0
SERVICE_NAME="admin-node"
IMAGE_NAME="admin-node"

for arg in "$@"; do
  case "$arg" in
    --detached)
      DETACHED=1
      ;;
    --build)
      BUILD=1
      ;;
    *)
      echo "❌ Unknown argument: $arg"
      echo "Usage: $0 [--detached] [--build]"
      exit 1
      ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"
PROJECT_NAME="${COMPOSE_PROJECT_NAME:-kergit-admin}"
COMPOSE_ARGS=(-p "$PROJECT_NAME" -f "$COMPOSE_FILE")
ENV_FILE="$REPO_ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  COMPOSE_ARGS=(--env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}")
fi

# Shared network for Caddy -> admin-node resolution.
docker network inspect kergit_default >/dev/null 2>&1 || docker network create kergit_default >/dev/null 2>&1 || true

# ---- stop any previous app container ----------------------
docker compose "${COMPOSE_ARGS[@]}" down --remove-orphans >/dev/null 2>&1 || true
docker rm -f admin-node web-admin-container nuxt-admin-dev-container >/dev/null 2>&1 || true

if [ "$BUILD" -eq 1 ] || ! docker inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  docker compose "${COMPOSE_ARGS[@]}" build "$SERVICE_NAME"
fi

if [ "$DETACHED" -eq 1 ]; then
  docker compose "${COMPOSE_ARGS[@]}" up -d --remove-orphans "$SERVICE_NAME"
else
  docker compose "${COMPOSE_ARGS[@]}" up --remove-orphans "$SERVICE_NAME"
fi
