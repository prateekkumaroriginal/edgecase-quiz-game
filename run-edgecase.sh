#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -d "$SCRIPT_DIR/node_modules" ]; then
  echo "Installing dependencies..."
  npm ci --prefix "$SCRIPT_DIR"
fi

if [ ! -f "$SCRIPT_DIR/dist/index.html" ]; then
  echo "Building app..."
  npm run build --prefix "$SCRIPT_DIR"
fi
ELECTRON_FLAGS=()
CHROME_SANDBOX="$SCRIPT_DIR/node_modules/electron/dist/chrome-sandbox"

if [ -f "$CHROME_SANDBOX" ]; then
  SANDBOX_OWNER_UID="$(stat -c '%u' "$CHROME_SANDBOX" 2>/dev/null || true)"
  SANDBOX_MODE="$(stat -c '%a' "$CHROME_SANDBOX" 2>/dev/null || true)"

  if [ "$SANDBOX_OWNER_UID" != "0" ] || [ "$SANDBOX_MODE" != "4755" ]; then
    echo "chrome-sandbox permissions are not configured for setuid sandbox; launching with --no-sandbox."
    ELECTRON_FLAGS+=(--no-sandbox)
  fi
fi

exec "$SCRIPT_DIR/node_modules/.bin/electron" "${ELECTRON_FLAGS[@]}" "$@" "$SCRIPT_DIR"
