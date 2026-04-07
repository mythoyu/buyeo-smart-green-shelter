#!/usr/bin/env bash
# PeopleCounter(APC100)용 USB-시리얼 포트를 udev KERNELS 조건으로 식별해
# /dev/bushub-people-counter 심볼릭 링크 생성 규칙 1줄을 생성합니다.
#
# 사용법은 DDC 프로브(01)와 동일합니다.
# --list-json : tty 후보만 JSON 으로 stdout 에 출력 후 종료(마법사·yad). 디바이스 없으면 exit 1
#
set -euo pipefail

TMP_DIR="/tmp/bushub-udev-rules"
FRAGMENT_FILE="$TMP_DIR/99-bushub-serial-people-counter.fragment"

SYMLINK_NAME="bushub-people-counter"

usage() {
  echo "사용법: $0 [--device /dev/ttyUSB0] [--list-json]"
  echo "  --device      디바이스 선택을 건너뜁니다."
  echo "  --list-json   tty 후보 목록만 JSON 으로 출력하고 종료합니다."
  exit 1
}

emit_tty_list_json() {
  if ! command -v python3 >/dev/null 2>&1; then
    echo "❌ --list-json 은 python3 가 필요합니다." >&2
    exit 1
  fi
  python3 -c 'import json,sys; print(json.dumps({"probe":sys.argv[1],"symlink":sys.argv[2],"devices":sys.argv[3:]}, ensure_ascii=False))' \
    "02-pc" "$SYMLINK_NAME" "${TTY_LIST[@]}"
}

DEVICE=""
LIST_JSON=0
while [ $# -gt 0 ]; do
  case "$1" in
    --device)
      DEVICE="${2:-}"
      shift 2
      ;;
    --list-json)
      LIST_JSON=1
      shift
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "알 수 없는 인자: $1"
      usage
      ;;
  esac
done

shopt -s nullglob
TTY_CANDIDATES=(/dev/ttyUSB* /dev/ttyACM*)
TTY_LIST=()
for d in "${TTY_CANDIDATES[@]}"; do
  [ -e "$d" ] && TTY_LIST+=("$d")
done

if [ "$LIST_JSON" -eq 1 ]; then
  if [ ${#TTY_LIST[@]} -eq 0 ]; then
    echo "❌ /dev/ttyUSB* 또는 /dev/ttyACM* 디바이스가 없습니다." >&2
    echo "   PeopleCounter용 USB 어댑터를 먼저 꽂고 다시 실행하세요." >&2
    exit 1
  fi
  emit_tty_list_json
  exit 0
fi

if [ ${#TTY_LIST[@]} -eq 0 ]; then
  echo "❌ /dev/ttyUSB* 또는 /dev/ttyACM* 디바이스가 없습니다."
  echo "   PeopleCounter용 USB 어댑터를 먼저 꽂고 다시 실행하세요."
  exit 1
fi

if [ -z "$DEVICE" ]; then
  echo "=== tty 후보 선택 ($SYMLINK_NAME용) ==="
  i=1
  for d in "${TTY_LIST[@]}"; do
    echo "  $i) $d"
    i=$((i+1))
  done
  read -r -p "번호를 입력하세요(기본 1): " sel
  sel="${sel:-1}"
  if ! [[ "$sel" =~ ^[0-9]+$ ]]; then
    echo "❌ 번호가 올바르지 않습니다: $sel"
    exit 1
  fi
  idx=$((sel-1))
  if [ $idx -lt 0 ] || [ $idx -ge ${#TTY_LIST[@]} ]; then
    echo "❌ 범위를 벗어났습니다: $sel"
    exit 1
  fi
  DEVICE="${TTY_LIST[$idx]}"
else
  if [ ! -e "$DEVICE" ]; then
    echo "❌ 지정한 디바이스가 없습니다: $DEVICE"
    exit 1
  fi
fi

if [[ "$(basename "$DEVICE")" =~ ^ttyUSB ]]; then
  KERNEL_MATCH='ttyUSB*'
elif [[ "$(basename "$DEVICE")" =~ ^ttyACM ]]; then
  KERNEL_MATCH='ttyACM*'
else
  KERNEL_MATCH="$(basename "$DEVICE")"
fi

echo "📌 선택된 디바이스: $DEVICE"
echo "   KERNEL_MATCH: $KERNEL_MATCH"

echo "🔎 udevadm info -a 를 수집합니다(선택한 디바이스 기준)..."
UDEV_A="$(udevadm info -a -n "$DEVICE")"

mapfile -t KERNELS_CANDIDATES < <(printf '%s\n' "$UDEV_A" | awk -F'"' '/KERNELS==/ {print $2}' | awk '!seen[$0]++')
if [ ${#KERNELS_CANDIDATES[@]} -eq 0 ]; then
  echo "❌ udevadm 출력에서 KERNELS 후보를 찾지 못했습니다."
  exit 1
fi

echo "=== KERNELS 후보 ==="
for i in "${!KERNELS_CANDIDATES[@]}"; do
  n=$((i+1))
  echo "  $n) ${KERNELS_CANDIDATES[$i]}"
done

# 기본값: 후보 목록의 마지막(대개 USB 허브 체인 끝). 보드·허브 구성에 따라 다르므로 틀리면 번호를 바꿉니다.
DEFAULT_SEL="${#KERNELS_CANDIDATES[@]}"
read -r -p "KERNELS를 고르세요(기본값=${DEFAULT_SEL}): " sel
sel="${sel:-$DEFAULT_SEL}"
if ! [[ "$sel" =~ ^[0-9]+$ ]]; then
  echo "❌ 번호가 올바르지 않습니다: $sel"
  exit 1
fi
if [ "$sel" -lt 1 ] || [ "$sel" -gt "${#KERNELS_CANDIDATES[@]}" ]; then
  echo "❌ 범위를 벗어났습니다: $sel"
  exit 1
fi

KERNELS_CHOSEN="${KERNELS_CANDIDATES[$((sel-1))]}"

VENDOR="$(printf '%s\n' "$UDEV_A" | awk -F'"' '/idVendor==/ {print $2; exit}')"
PRODUCT="$(printf '%s\n' "$UDEV_A" | awk -F'"' '/idProduct==/ {print $2; exit}')"
SERIAL="$(printf '%s\n' "$UDEV_A" | awk -F'"' '/serial==/ && /ATTRS\{serial\}/ {print $2; exit}')"

RULE_PREFIX='ACTION=="add", SUBSYSTEM=="tty",'
RULE="$RULE_PREFIX KERNEL==\"$KERNEL_MATCH\", KERNELS==\"$KERNELS_CHOSEN\""

if [ -n "$VENDOR" ] && [ -n "$PRODUCT" ]; then
  RULE="$RULE, ATTRS{idVendor}==\"$VENDOR\", ATTRS{idProduct}==\"$PRODUCT\""
fi
if [ -n "${SERIAL:-}" ]; then
  RULE="$RULE, ATTRS{serial}==\"$SERIAL\""
fi

RULE="$RULE, SYMLINK+=\"$SYMLINK_NAME\", MODE=\"0660\", GROUP=\"dialout\""

mkdir -p "$TMP_DIR"
cat > "$FRAGMENT_FILE" <<EOF
# Generated at $(date -Is)
# SYMLINK: /dev/$SYMLINK_NAME
$RULE
EOF

echo "✅ PeopleCounter fragment 생성 완료: $FRAGMENT_FILE"
echo "   다음 단계:"
echo "   sudo ./03-install-bushub-usb-serial.sh"
echo "   (원샷 경로: ./00-wizard-bushub-usb-serial.sh)"
