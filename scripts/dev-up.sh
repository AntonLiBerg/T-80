#!/usr/bin/env bash
set -euo pipefail

COMPOSE_FILE="docker-compose.dev.yaml"
COMPOSE_CMD=(docker-compose -f "$COMPOSE_FILE")

cleanup() {
  # Keep behavior close to `docker-compose up` where Ctrl+C stops services.
  "${COMPOSE_CMD[@]}" stop >/dev/null 2>&1 || true
}

trap cleanup INT TERM

echo "Starting dev stack..."
"${COMPOSE_CMD[@]}" up --build --force-recreate -d

echo "Waiting for database to become ready..."
until "${COMPOSE_CMD[@]}" exec -T db pg_isready -U t80 -d t80 >/dev/null 2>&1; do
  sleep 1
done

echo "Applying database schema from db/init.sql..."
"${COMPOSE_CMD[@]}" exec -T db psql -U t80 -d t80 -f /docker-entrypoint-initdb.d/init.sql

echo "Streaming container logs (Ctrl+C to stop services)..."
"${COMPOSE_CMD[@]}" logs -f
