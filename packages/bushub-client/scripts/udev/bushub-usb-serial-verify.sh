#!/bin/bash
# /dev/bushub-controller, /dev/bushub-people-counter 존재 확인
set -euo pipefail

echo "=== udev 링크 확인 ==="

check_link() {
  local name="$1"
  local path="/dev/$name"
  if [ -L "$path" ]; then
    echo "✅ $path -> $(readlink -f "$path")"
  elif [ -e "$path" ]; then
    echo "⚠️ $path 는 심볼릭 링크가 아닙니다. (type: $(stat -c %F "$path" 2>/dev/null || echo unknown))"
  else
    echo "❌ $path 없음"
  fi
}

check_link "bushub-controller"
check_link "bushub-people-counter"

echo ""
echo "tty 후보(디버깅용):"
ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true

