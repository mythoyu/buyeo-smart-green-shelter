#!/bin/bash
# USB-RS485 — docker-compose.usb485.yml
set -euo pipefail
SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  _D="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  _D="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
export BUSHUB_COMPOSE_MODE=usb485
exec "$_D/run-docker-stack.sh"
