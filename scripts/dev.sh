#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/ensure-mysql.sh"

exec next dev -p "${PORT}"
