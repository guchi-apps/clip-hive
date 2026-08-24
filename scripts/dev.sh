#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

bash "$ROOT_DIR/scripts/ensure-mysql.sh"

# 本番(PM2)と同じく、Nodeの既定のrequestTimeout(5分)を延長する（guchi-apps/clip-hive#5）。
# next dev は子プロセスを起こすため、node_args ではなく NODE_OPTIONS で渡す（子へ引き継がれる）。
export NODE_OPTIONS="${NODE_OPTIONS:+${NODE_OPTIONS} }--require ${ROOT_DIR}/deploy/http-timeouts.cjs"

exec next dev -p "${PORT}"
