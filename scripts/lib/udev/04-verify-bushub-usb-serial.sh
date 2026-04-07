#!/bin/bash
# /dev/bushub-controller, /dev/bushub-people-counter 존재 확인
set -euo pipefail

echo "=== udev 링크 확인 ==="

# readlink 로 연 tty 에 대해 udev KERNELS 체인 출력 (rules 의 KERNELS== 와 대조)
print_kernels_chain() {
  local symlink_path="$1"
  local real
  real="$(readlink -f "$symlink_path" 2>/dev/null || true)"
  if [ -z "$real" ] || [ ! -e "$real" ]; then
    return 0
  fi
  if [[ ! "$(basename "$real")" =~ ^tty(USB|ACM) ]]; then
    return 0
  fi
  local udev_a
  udev_a="$(udevadm info -a -n "$real" 2>/dev/null || true)"
  if [ -z "$udev_a" ]; then
    echo "   (udevadm info 실패: $real)"
    return 0
  fi
  local chain
  chain="$(printf '%s\n' "$udev_a" | awk -F'"' '/KERNELS==/ {print $2}' | awk '!seen[$0]++' | awk '{printf "%s%s", (NR>1?" → ":""), $0} END{print""}')"
  if [ -n "$chain" ]; then
    echo "   KERNELS 체인: $chain"
    echo "   (규칙의 KERNELS== 값이 이 중 하나와 같아야 매칭됩니다. 예: \"1-7\")"
  fi
}

check_link() {
  local name="$1"
  local path="/dev/$name"
  if [ -L "$path" ]; then
    echo "✅ $path -> $(readlink -f "$path")"
    print_kernels_chain "$path"
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
