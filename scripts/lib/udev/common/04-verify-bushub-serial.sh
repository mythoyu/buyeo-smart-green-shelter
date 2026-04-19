#!/usr/bin/env bash
# /dev/bushub-controller, /dev/bushub-people-counter-1..N 존재 확인
#
# 옵션:
#   --apc-only  /dev/bushub-controller 검사 생략(integrated: Modbus는 ttyS0 고정)
#
set -euo pipefail

APC_ONLY=0
while [ $# -gt 0 ]; do
  case "$1" in
    --apc-only)
      APC_ONLY=1
      shift
      ;;
    -h|--help)
      echo "사용법: $0 [--apc-only]"
      exit 0
      ;;
    *)
      echo "알 수 없는 인자: $1" >&2
      exit 1
      ;;
  esac
done

echo "=== udev 링크 확인 ==="

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

if [ "$APC_ONLY" -eq 0 ]; then
  check_link "bushub-controller"
else
  echo "ℹ️  --apc-only: /dev/bushub-controller 검사 생략 (integrated / Modbus=ttyS0)"
fi

PEOPLE_COUNTER_COUNT="${PEOPLE_COUNTER_COUNT:-1}"
if ! [[ "$PEOPLE_COUNTER_COUNT" =~ ^[0-3]$ ]]; then
  echo "❌ PEOPLE_COUNTER_COUNT는 0~3 정수여야 합니다. 현재: $PEOPLE_COUNTER_COUNT" >&2
  exit 1
fi

if [ "$PEOPLE_COUNTER_COUNT" -ge 1 ]; then
  for i in $(seq 1 "$PEOPLE_COUNTER_COUNT"); do
    check_link "bushub-people-counter-$i"
  done
else
  echo "ℹ️  PEOPLE_COUNTER_COUNT=0 (피플카운터 링크 검사 생략)"
fi

echo ""
echo "tty 후보(디버깅용):"
ls -l /dev/ttyUSB* /dev/ttyACM* 2>/dev/null || true
