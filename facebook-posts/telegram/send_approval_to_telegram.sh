#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${TELEGRAM_ENV_FILE:-$SCRIPT_DIR/telegram.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "Missing TELEGRAM_BOT_TOKEN. Create $ENV_FILE first." >&2
  exit 2
fi

if [[ -z "${TELEGRAM_CHAT_ID:-}" ]]; then
  echo "Missing TELEGRAM_CHAT_ID. Run get_chat_id.sh after messaging your bot." >&2
  exit 2
fi

MESSAGE="${1:-}"
PHOTO_PATH="${2:-}"
DRAFT_ID="${3:-${DRAFT_ID:-draft-$(date +%Y%m%d-%H%M%S)}}"

if [[ -z "$MESSAGE" ]]; then
  MESSAGE="$(cat)"
fi

if [[ "$MESSAGE" == @* ]]; then
  MESSAGE_FILE="${MESSAGE#@}"
  if [[ ! -f "$MESSAGE_FILE" ]]; then
    echo "Message file not found: $MESSAGE_FILE" >&2
    exit 2
  fi
  MESSAGE="$(cat "$MESSAGE_FILE")"
fi

if [[ -z "$MESSAGE" ]]; then
  echo "Missing approval message. Pass it as an argument or via stdin." >&2
  exit 2
fi

API_URL="https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}"

if [[ -n "$PHOTO_PATH" ]]; then
  if [[ ! -f "$PHOTO_PATH" ]]; then
    echo "Photo not found: $PHOTO_PATH" >&2
    exit 2
  fi

  curl -sS -X POST "$API_URL/sendPhoto" \
    -F "chat_id=$TELEGRAM_CHAT_ID" \
    -F "photo=@$PHOTO_PATH" \
    -F "caption=Poster untuk semakan"
  echo
fi

curl -sS -X POST "$API_URL/sendMessage" \
  --data-urlencode "chat_id=$TELEGRAM_CHAT_ID" \
  --data-urlencode "text=$MESSAGE" \
  --data-urlencode "reply_markup={\"inline_keyboard\":[[{\"text\":\"Approve\",\"callback_data\":\"approve:$DRAFT_ID\"},{\"text\":\"Reject\",\"callback_data\":\"reject:$DRAFT_ID\"},{\"text\":\"Edit\",\"callback_data\":\"edit:$DRAFT_ID\"}]]}" \
  -d "disable_web_page_preview=true"
echo
