#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "No arguments allowed." >&2
  exit 2
fi

COMPOSE=(docker compose -f docker-compose.dev.yaml)

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 1
fi

result="$(
  "${COMPOSE[@]}" exec -T db \
    psql -U t80 -d t80 -tAc \
    "SELECT key || '|' || btrim(value, E' \\t\\n\\r') FROM kvps WHERE key='testKey' AND btrim(value, E' \\t\\n\\r')='testPass' LIMIT 1;"
)"

normalized="$(echo "${result}" | tr -d '[:space:]')"

if [[ "${normalized}" == "testKey|testPass" ]]; then
  echo "Verified: testKey=testPass exists in kvps."
  exit 0
fi

echo "Verification failed: testKey=testPass not found in kvps." >&2
exit 1
