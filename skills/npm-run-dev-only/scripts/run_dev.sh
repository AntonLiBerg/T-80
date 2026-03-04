#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 0 ]]; then
  echo "No arguments allowed. This script only runs: npm run dev" >&2
  exit 2
fi

exec npm run dev
