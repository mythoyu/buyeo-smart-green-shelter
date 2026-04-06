#!/bin/bash
# dist 정리 → 이미지 무캐시 재빌드 → docker-compose.usb485.yml up
set -euo pipefail

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  _D="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  _D="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi

export BUSHUB_COMPOSE_MODE=usb485
"$_D/rebuild-docker-images.sh"
exec "$_D/start-docker-compose-usb485.sh"
