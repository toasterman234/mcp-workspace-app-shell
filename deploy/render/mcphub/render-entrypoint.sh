#!/bin/sh
set -eu

TEMPLATE="/app/mcp_settings.template.json"
TARGET="/app/mcp_settings.json"

if [ ! -f "$TEMPLATE" ]; then
  echo "missing template: $TEMPLATE" >&2
  exit 1
fi

: "${TRADIER_API_KEY:?TRADIER_API_KEY must be set}"
: "${MCPHUB_ADMIN_PASSWORD_BCRYPT:?MCPHUB_ADMIN_PASSWORD_BCRYPT must be set}"
: "${MCPHUB_BEARER_TOKEN:?MCPHUB_BEARER_TOKEN must be set}"

sed \
  -e "s|__TRADIER_API_KEY__|${TRADIER_API_KEY}|g" \
  -e "s|__BCRYPT_HASH_FOR_ADMIN_PASSWORD__|${MCPHUB_ADMIN_PASSWORD_BCRYPT}|g" \
  -e "s|__MCPHUB_BEARER_TOKEN__|${MCPHUB_BEARER_TOKEN}|g" \
  "$TEMPLATE" > "$TARGET"

exec /usr/local/bin/entrypoint.sh "$@"
