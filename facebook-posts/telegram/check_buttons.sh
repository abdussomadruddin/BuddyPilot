#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN="${NODE_BIN:-/Users/abdussomad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"

if [[ ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node || true)"
fi

if [[ -z "$NODE_BIN" ]]; then
  echo "Node.js runtime not found." >&2
  exit 2
fi

"$NODE_BIN" "$SCRIPT_DIR/handle_telegram_buttons.mjs"
