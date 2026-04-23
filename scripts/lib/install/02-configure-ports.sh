#!/usr/bin/env bash
# 2단계: 포트/udev/스택 설정만 수행
set -euo pipefail

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi

ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
WIZARD="$ROOT_DIR/scripts/lib/udev/00-wizard-bushub-usb-serial.sh"

if [ ! -f "$WIZARD" ]; then
  echo "❌ 포트 설정 마법사가 없습니다: $WIZARD" >&2
  exit 1
fi

exec bash "$WIZARD" --ports-only "$@"
