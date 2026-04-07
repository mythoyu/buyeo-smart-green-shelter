#!/bin/bash
# 현장용 원샷: 호스트 설정 → USB udev(01·02·03, 내부 04 verify) → 스택 재빌드·기동(택1)
# 데스크톱(DISP/WAYLAND)이면 zenity로 단계 안내, tty 선택은 yad → zenity → 터미널 순 폴백
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# udev: scripts/lib/udev , 호스트·rebuild 래퍼: scripts/lib
SCRIPTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SETUP_HOST="$SCRIPTS_DIR/setup-host-ubuntu24.sh"
REBUILD_USB="$SCRIPTS_DIR/rebuild-and-up-usb485.sh"
REBUILD_INT="$SCRIPTS_DIR/rebuild-and-up-integrated.sh"

PROBE_DDC="$SCRIPT_DIR/01-probe-ddc-bushub-usb-serial.sh"
PROBE_PC="$SCRIPT_DIR/02-probe-pc-bushub-usb-serial.sh"
INSTALL="$SCRIPT_DIR/03-install-bushub-usb-serial.sh"

ui_available() {
  command -v zenity >/dev/null 2>&1 && { [[ -n "${DISPLAY:-}" ]] || [[ -n "${WAYLAND_DISPLAY:-}" ]]; }
}

display_available() {
  [[ -n "${DISPLAY:-}" ]] || [[ -n "${WAYLAND_DISPLAY:-}" ]]
}

# 01/02 프로브: --list-json → yad/zenity 로 tty 선택 후 --device 로 재실행. 실패·취소 시 터미널 대화형.
run_probe_with_tty_ui() {
  local probe_script="$1"
  local step_title="$2"
  if ! display_available || ! command -v python3 >/dev/null 2>&1; then
    bash "$probe_script"
    return $?
  fi
  local json
  if ! json="$(bash "$probe_script" --list-json 2>/dev/null)"; then
    echo "❌ tty 후보를 가져오지 못했습니다. USB 시리얼이 연결되어 있는지 확인하세요." >&2
    return 1
  fi
  local -a tty_devices=()
  mapfile -t tty_devices < <(printf '%s' "$json" | python3 -c 'import json,sys; d=json.load(sys.stdin); [print(x) for x in d.get("devices",[])]')
  if [ ${#tty_devices[@]} -eq 0 ]; then
    echo "❌ tty 후보가 비어 있습니다." >&2
    return 1
  fi
  local picked=""
  if command -v yad >/dev/null 2>&1; then
    picked="$(yad --list --title="$step_title" \
      --text="연결된 tty 중 하나를 선택하세요.\n(취소 시 이 터미널에서 번호로 선택합니다)" \
      --column="디바이스" --width=560 --height=320 --center \
      "${tty_devices[@]}" 2>/dev/null)" || picked=""
  fi
  if [ -z "$picked" ] && command -v zenity >/dev/null 2>&1; then
    picked="$(zenity --list --title="$step_title" \
      --text="연결된 tty 중 하나를 선택하세요." \
      --column="디바이스" --width=560 --height=320 \
      "${tty_devices[@]}" 2>/dev/null)" || picked=""
  fi
  if [ -n "$picked" ]; then
    picked="${picked%%|*}"
    bash "$probe_script" --device "$picked"
    return $?
  fi
  bash "$probe_script"
}

ui_info() {
  local title="$1"
  local text="$2"
  if ui_available; then
    zenity --info --title="$title" --no-wrap --text="$text" 2>/dev/null || true
  fi
}

# 0 = 예, 1 = 아니오
ui_question() {
  local title="$1"
  local text="$2"
  if ui_available; then
    if zenity --question --title="$title" --no-wrap --text="$text" 2>/dev/null; then
      return 0
    fi
    return 1
  fi
  read -r -p "$text [Y/n] " a
  a="${a:-Y}"
  if [[ "$a" =~ ^[nN] ]]; then return 1; fi
  return 0
}

# zenity 목록 → 1 또는 2 (빈 값이면 빈 문자열)
ui_pick_stack() {
  if ui_available; then
    local sel
    sel="$(zenity --list --title="Docker 스택" \
      --text="이미지 재빌드 후 기동할 모드를 선택하세요. (시간이 다소 걸릴 수 있습니다)" \
      --column="번호" --column="모드" \
      "1" "USB-RS485 (rebuild-and-up-usb485)" \
      "2" "내장 RS-485 (rebuild-and-up-integrated)" 2>/dev/null)" || true
    # 두 컬럼일 때 "1|USB..." 형태로 올 수 있음
    printf '%s\n' "$sel" | head -n1 | cut -d'|' -f1 | tr -d '[:space:]'
    return
  fi
  echo ""
}

usage() {
  echo "사용법: $0 [-h|--help]"
  echo ""
  echo "  순서: setup-host-ubuntu24.sh → USB udev 프로브·설치 → rebuild-and-up (USB 또는 내장)"
  echo "  인터넷(예: 폰 USB 테더링) 연결을 권장합니다."
  echo "  USB 단계에서는 해당 케이블만 연결한 뒤 안내에 따라 진행하세요."
  exit 0
}

if [ $# -gt 0 ]; then
  case "${1:-}" in
    -h|--help) usage ;;
    *)
      echo "알 수 없는 인자: $1" >&2
      echo "도움말: $0 --help" >&2
      exit 1
      ;;
  esac
fi

echo "=========================================="
echo " Bushub 현장 마법사 (호스트·udev·스택)"
echo "=========================================="
echo ""
echo "※ 여러 단계에서 sudo 가 필요할 수 있습니다."
echo ""

ui_info "Bushub 설치" "GitHub 릴리즈 기준 소스에서 설치합니다.\n인터넷(테더링) 연결을 권장합니다.\n다음 단계는 이 터미널에서 진행됩니다."

# --- [1/5] 호스트 환경 (Docker 등) ---
if [ ! -f "$SETUP_HOST" ]; then
  echo "⚠️  호스트 설정 스크립트가 없습니다: $SETUP_HOST"
else
  if ui_question "Bushub 설치" "[1/5] Ubuntu 호스트 환경(Docker·zenity 등)을 설정합니다. 진행할까요?"; then
    bash "$SETUP_HOST"
  else
    echo "   (호스트 설정 건너뜀)"
  fi
fi

echo ""
ui_info "udev [2/5]" "Modbus(DDC)용 USB 시리얼만 PC에 연결하세요.\n가능하면 tty 목록 창(yad/zenity)에서 선택하고, KERNELS 는 터미널에서 고릅니다."
read -r -p "[2/5] 연결 후 Enter... " _

run_probe_with_tty_ui "$PROBE_DDC" "udev [2/5] Modbus(DDC) tty"

echo ""
ui_info "udev [3/5]" "PeopleCounter(APC)용 USB 시리얼만 연결하세요.\n가능하면 tty 목록 창에서 선택합니다."
read -r -p "[3/5] 연결 후 Enter... " _

run_probe_with_tty_ui "$PROBE_PC" "udev [3/5] PeopleCounter tty"

echo ""
echo "[4/5] udev rules 설치(링크 자동 확인 포함)..."
ui_info "sudo" "곧 관리자 권한(sudo)으로 udev 규칙을 설치합니다."
sudo bash "$INSTALL"

echo ""
echo "[5/5] Docker 스택 — 이미지 재빌드 후 기동"
stack_sel=""
if ui_available; then
  stack_sel="$(ui_pick_stack)"
fi
while true; do
  if [ -z "$stack_sel" ]; then
    echo "  1) USB-RS485   → rebuild-and-up-usb485.sh"
    echo "  2) 내장 RS-485 → rebuild-and-up-integrated.sh"
    read -r -p "선택 (1 또는 2): " stack_sel
  fi
  case "$stack_sel" in
    1)
      bash "$REBUILD_USB"
      break
      ;;
    2)
      bash "$REBUILD_INT"
      break
      ;;
    *)
      if ui_available; then
        zenity --error --text="1 또는 2 를 선택하세요." 2>/dev/null || true
      fi
      echo "   1 또는 2 만 입력하세요."
      stack_sel=""
      ;;
  esac
done

echo ""
echo "✅ 마법사 흐름을 마쳤습니다."
echo "   udev 추가 확인: bash $SCRIPT_DIR/04-verify-bushub-usb-serial.sh"
ui_info "완료" "설치 마법사 단계가 끝났습니다.\n문제가 있으면 터미널 로그와\n04-verify-bushub-usb-serial.sh 를 확인하세요."
