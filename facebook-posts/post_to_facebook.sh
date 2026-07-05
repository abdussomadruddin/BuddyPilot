#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${FACEBOOK_ENV_FILE:-$SCRIPT_DIR/facebook.env}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${FACEBOOK_PAGE_ID:-}" ]]; then
  echo "Missing FACEBOOK_PAGE_ID. Create $ENV_FILE first." >&2
  exit 2
fi

if [[ -z "${FACEBOOK_PAGE_ACCESS_TOKEN:-}" ]]; then
  echo "Missing FACEBOOK_PAGE_ACCESS_TOKEN. Create $ENV_FILE first." >&2
  exit 2
fi

CAPTION_FILE="${1:-}"
MEDIA_PATH="${2:-}"
COMMENT_MESSAGE="${3:-}"

if [[ -z "$CAPTION_FILE" || ! -f "$CAPTION_FILE" ]]; then
  echo "Missing caption file." >&2
  exit 2
fi

if [[ -z "$MEDIA_PATH" || ! -f "$MEDIA_PATH" ]]; then
  echo "Missing media path." >&2
  exit 2
fi

CAPTION="$(cat "$CAPTION_FILE")"
NODE_BIN="${NODE_BIN:-/Users/abdussomad/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node}"

MEDIA_EXT="$(printf '%s' "${MEDIA_PATH##*.}" | tr '[:upper:]' '[:lower:]')"
case "$MEDIA_EXT" in
  mp4|mov|m4v|webm)
    API_URL="https://graph.facebook.com/v21.0/${FACEBOOK_PAGE_ID}/videos"
    MEDIA_RESPONSE="$(curl -sS -X POST "$API_URL" \
      -F "access_token=$FACEBOOK_PAGE_ACCESS_TOKEN" \
      -F "published=true" \
      -F "source=@$MEDIA_PATH" \
      -F "description=$CAPTION")"
    ;;
  *)
    API_URL="https://graph.facebook.com/v21.0/${FACEBOOK_PAGE_ID}/photos"
    MEDIA_RESPONSE="$(curl -sS -X POST "$API_URL" \
      -F "access_token=$FACEBOOK_PAGE_ACCESS_TOKEN" \
      -F "published=true" \
      -F "source=@$MEDIA_PATH" \
      -F "caption=$CAPTION")"
    ;;
esac

echo "$MEDIA_RESPONSE"

if printf '%s' "$MEDIA_RESPONSE" | "$NODE_BIN" -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s); process.exit(j.error ? 0 : 1)}catch{process.exit(1)}})"; then
  echo "Facebook media upload failed." >&2
  exit 1
fi

if [[ -n "$COMMENT_MESSAGE" ]]; then
  POST_ID="$(printf '%s' "$MEDIA_RESPONSE" | "$NODE_BIN" -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s); process.stdout.write(j.post_id || j.id || '');}catch{process.exit(1)}})")"

  if [[ -z "$POST_ID" ]]; then
    echo "Could not find Facebook post id for comment." >&2
    exit 1
  fi

  COMMENT_RESPONSE="$(curl -sS -X POST "https://graph.facebook.com/v21.0/${POST_ID}/comments" \
    -F "access_token=$FACEBOOK_PAGE_ACCESS_TOKEN" \
    -F "message=$COMMENT_MESSAGE")"

  echo "$COMMENT_RESPONSE"
fi
