#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="${TELEGRAM_BUTTON_LOG:-$SCRIPT_DIR/button-listener.log}"
INTERVAL_SECONDS="${TELEGRAM_BUTTON_INTERVAL_SECONDS:-5}"

echo "Telegram button listener started at $(date)" >> "$LOG_FILE"

while true; do
  if ! "$SCRIPT_DIR/check_buttons.sh" >> "$LOG_FILE" 2>&1; then
    echo "check_buttons failed at $(date)" >> "$LOG_FILE"
  fi
  sleep "$INTERVAL_SECONDS"
done
