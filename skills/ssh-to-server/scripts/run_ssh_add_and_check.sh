#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "No arguments allowed." >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"

cd "${ROOT_DIR}"

docker compose -f docker-compose.dev.yaml exec -T db \
  psql -U t80 -d t80 -c "DELETE FROM kvps WHERE key='testKey';" >/dev/null

node skills/ssh-to-server/scripts/ssh_add_test_kvp.js
bash skills/ssh-to-server/scripts/check_test_kvp.sh
