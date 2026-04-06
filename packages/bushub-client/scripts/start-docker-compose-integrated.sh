#!/bin/bash
# 내장 RS-485 — docker-compose.integrated.yml
set -euo pipefail
SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  _D="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  _D="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
export BUSHUB_COMPOSE_MODE=integrated
exec "$_D/run-docker-stack.sh"
