#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="${NODE_BIN:-/Users/abdussomad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"

if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$SCRIPT_DIR/.env"
  set +a
fi

exec "$NODE_BIN" "$SCRIPT_DIR/server.mjs"
