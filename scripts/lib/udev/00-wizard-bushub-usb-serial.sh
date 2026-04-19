#!/usr/bin/env bash
# 현장용 원샷: 호스트 설정 → [2/5] RS-485 연결 방식( USB 어댑터 vs 내장 ) 선택
#   · USB 어댑터: udev usb485(01·02·03·04) 후 rebuild-and-up-usb485
#   · 내장: Modbus=ttyS0 고정, APC는 USB — udev common/02 + integrated/03·04(APC만) 후 rebuild-and-up-integrated
# 데스크톱(DISP/WAYLAND)이면 zenity로 단계 안내, tty 선택은 yad → zenity → 터미널 순 폴백
#
set -euo pipefail

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
# udev: scripts/lib/udev , 호스트·rebuild 래퍼: scripts/lib
SCRIPTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SETUP_HOST="$SCRIPTS_DIR/setup-host-ubuntu24.sh"
REBUILD_USB="$SCRIPTS_DIR/rebuild-and-up-usb485.sh"
REBUILD_INT="$SCRIPTS_DIR/rebuild-and-up-integrated.sh"

PROBE_DDC="$SCRIPT_DIR/01-probe-ddc-bushub-usb-serial.sh"
PROBE_PC="$SCRIPT_DIR/02-probe-pc-bushub-usb-serial.sh"
INSTALL_USB="$SCRIPT_DIR/03-install-bushub-usb-serial.sh"
VERIFY_USB="$SCRIPT_DIR/04-verify-bushub-usb-serial.sh"
INSTALL_INT="$SCRIPT_DIR/integrated/03-install-bushub-serial.sh"
VERIFY_INT="$SCRIPT_DIR/integrated/04-verify-bushub-serial.sh"

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
  shift 2
  local -a extra_args=("$@")
  if ! display_available || ! command -v python3 >/dev/null 2>&1; then
    bash "$probe_script" "${extra_args[@]}"
    return $?
  fi
  local json
  if ! json="$(bash "$probe_script" "${extra_args[@]}" --list-json 2>/dev/null)"; then
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
    bash "$probe_script" "${extra_args[@]}" --device "$picked"
    return $?
  fi
  bash "$probe_script" "${extra_args[@]}"
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

# zenity 목록 → 1 또는 2 (빈 값이면 빈 문자열). 이후 udev 유무·기동 래퍼가 갈린다.
ui_pick_stack() {
  if ui_available; then
    local sel
    sel="$(zenity --list --title="RS-485 연결 방식" \
      --text="이 PC의 시리얼 연결 방식을 고릅니다.\n이미 선택에 따라 USB udev 단계를 건너뛸 수 있습니다.\n(이미지 재빌드·기동은 시간이 다소 걸릴 수 있습니다.)" \
      --column="번호" --column="설명" \
      "1" "USB–RS485 어댑터형 (udev 심볼릭 · usb485 스택)" \
      "2" "내장 RS-485 포트형 (ttyS* · integrated 스택)" 2>/dev/null)" || true
    # 두 컬럼일 때 "1|USB..." 형태로 올 수 있음
    printf '%s\n' "$sel" | head -n1 | cut -d'|' -f1 | tr -d '[:space:]'
    return
  fi
  echo ""
}

ui_pick_people_counter_count() {
  if ui_available; then
    local sel
    sel="$(zenity --list --title="PeopleCounter 개수" \
      --text="피플카운터(APC100) 개수를 선택하세요.\n0대를 선택하면 피플카운터 udev/마운트는 생략됩니다." \
      --column="개수" --column="설명" \
      "0" "미설치/미사용" \
      "1" "1대 (u001 / -1)" \
      "2" "2대 (u001..u002 / -1..-2)" \
      "3" "3대 (u001..u003 / -1..-3)" 2>/dev/null)" || true
    printf '%s\n' "$sel" | head -n1 | cut -d'|' -f1 | tr -d '[:space:]'
    return
  fi
  echo ""
}

usage() {
  echo "사용법: $0 [-h|--help]"
  echo ""
  echo "  순서: setup-host-ubuntu24.sh → RS-485 방식 선택 → (USB면 udev 프로브·설치) → rebuild-and-up"
  echo "  인터넷(예: 폰 USB 테더링) 연결을 권장합니다."
  echo "  USB 어댑터 경로에서는 해당 케이블만 연결한 뒤 안내에 따라 진행하세요."
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
echo " Bushub 현장 마법사 (호스트·RS-485 방식·udev·스택)"
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
echo "[2/5] RS-485 연결 방식 선택"
ui_info "RS-485 연결" "이 PC가 어떻게 시리얼에 연결되는지 고릅니다.\n• USB–RS485 어댑터형: 이후 USB udev(심볼릭) 단계가 이어집니다.\n• 내장 포트형: udev USB 단계는 건너뜁니다."

stack_sel=""
if ui_available; then
  stack_sel="$(ui_pick_stack)"
fi
while true; do
  if [ -z "$stack_sel" ]; then
    echo "  1) USB–RS485 어댑터형 (Modbus·피플카운터 각각 USB / udev 심볼릭)"
    echo "  2) 내장 RS-485 포트형 (보드 ttyS* / compose.integrated)"
    read -r -p "[2/5] 선택 (1 또는 2): " stack_sel
  fi
  case "$stack_sel" in
    1|2)
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

if [ "$stack_sel" = "2" ]; then
  echo ""
  ui_info "내장 RS-485" "[3/5] Modbus는 /dev/ttyS0 고정입니다.\nPeopleCounter(APC)는 USB–시리얼이며, udev로 /dev/bushub-people-counter-N 을 만듭니다."
  echo "[3/5] 내장: Modbus=/dev/ttyS0. PeopleCounter는 USB 어댑터 + udev(common/02 → integrated/03·04)."

  echo ""
  echo "[4/5] PeopleCounter 개수 선택"
  pc_count=""
  if ui_available; then
    pc_count="$(ui_pick_people_counter_count)"
  fi
  while true; do
    if [ -z "$pc_count" ]; then
      echo "  0) 미설치/미사용"
      echo "  1) 1대"
      echo "  2) 2대"
      echo "  3) 3대"
      read -r -p "[4/5] PeopleCounter 개수 선택 (0~3): " pc_count
    fi
    if [[ "$pc_count" =~ ^[0-3]$ ]]; then
      break
    fi
    if ui_available; then
      zenity --error --text="0~3 중 하나를 선택하세요." 2>/dev/null || true
    fi
    echo "   0~3 중 하나를 입력하세요."
    pc_count=""
  done

  export PEOPLE_COUNTER_COUNT="$pc_count"

  if [ "$pc_count" -ge 1 ]; then
    for i in $(seq 1 "$pc_count"); do
      echo ""
      ui_info "udev [4/5]" "[4/5] PeopleCounter #$i (APC)용 USB–시리얼만 연결합니다.\n\n• 다른 USB 시리얼은 뽑으세요.\n• 지금은 PeopleCounter #$i 에 해당하는 케이블 1개만 연결하세요."
      echo "[4/5] PeopleCounter #$i 케이블만 연결하세요."
      read -r -p "[4/5] PC#$i 만 연결했으면 Enter... " _

      run_probe_with_tty_ui "$PROBE_PC" "udev [4/5] PeopleCounter #$i tty" --index "$i"

      echo ""
      echo "✅ PeopleCounter #$i 프로브 완료. 다음 장비를 위해 케이블을 뽑아주세요."
      read -r -p "[4/5] 케이블을 뽑았으면 Enter... " _
    done
  else
    echo ""
    echo "ℹ️  PeopleCounter 0대 선택 — udev APC 단계 생략"
  fi

  echo ""
  echo "[5/5] udev rules 설치(APC만, 단일 파일 덮어쓰기)..."
  ui_info "sudo" "integrated 는 /etc/udev/rules.d/99-bushub-serial.rules 에\nPeopleCounter 규칙만 기록합니다(Modbus ttyS0 는 이 파일에 넣지 않습니다)."

  UDEV_INSTALL_MAX_RETRY="${UDEV_INSTALL_MAX_RETRY:-15}"

  if [ "$pc_count" -ge 1 ]; then
    if sudo PEOPLE_COUNTER_COUNT="$PEOPLE_COUNTER_COUNT" bash "$INSTALL_INT" --strict; then
      echo ""
      echo "✅ [5/5] udev 설치·검증 단계를 통과했습니다."
    else
      echo ""
      echo "❌ [5/5] integrated 03-install 이 실패했습니다. Docker 기동은 아직 실행하지 않습니다."
      udev_install_attempt=0
      while true; do
        udev_install_attempt=$((udev_install_attempt + 1))
        if [ "$udev_install_attempt" -gt "$UDEV_INSTALL_MAX_RETRY" ]; then
          echo ""
          echo "❌ [5/5] 최대 재시도(${UDEV_INSTALL_MAX_RETRY})에 도달했습니다. 수동:"
          echo "   sudo bash $INSTALL_INT --strict   또는   bash $VERIFY_INT"
          exit 1
        fi
        echo ""
        echo "🔄 [5/5] 04-verify (${udev_install_attempt}/${UDEV_INSTALL_MAX_RETRY})"
        PEOPLE_COUNTER_COUNT="$PEOPLE_COUNTER_COUNT" bash "$VERIFY_INT"
        ok_links=1
        for i in $(seq 1 "$PEOPLE_COUNTER_COUNT"); do
          [ -L "/dev/bushub-people-counter-$i" ] || ok_links=0
        done
        if [ "$ok_links" -eq 1 ]; then
          echo ""
          echo "🎉 [5/5] 심볼릭 링크 확인됨 — Docker 기동으로 진행합니다."
          break
        fi
        echo ""
        echo "❌ [5/5] 아직 필요한 /dev/bushub-people-counter-* 링크가 없습니다."
        echo "   • Enter — 다시 04-verify 만 실행"
        echo "   • q 입력 후 Enter — 마법사 종료"
        read -r -p "[5/5] 재시도? (Enter/q): " _retry_choice
        if [[ "${_retry_choice:-}" =~ ^[qQ]$ ]]; then
          echo "마법사를 종료합니다."
          echo "   sudo bash $INSTALL_INT --strict   또는   bash $VERIFY_INT"
          exit 1
        fi
      done
    fi
  else
    echo ""
    echo "ℹ️  PeopleCounter 0대 — udev 설치 생략(기존 99-bushub-serial.rules 는 그대로일 수 있음)"
    ui_question "udev" "PeopleCounter 0대인데도 /etc/udev/rules.d/99-bushub-serial.rules 를\nAPC 규칙 비우기로 덮어쓸까요? (이전 USB 스택 규칙이 있으면 정리됩니다)" && {
      sudo PEOPLE_COUNTER_COUNT=0 bash "$INSTALL_INT" --strict || true
    } || true
  fi

  echo ""
  echo "Docker 스택 — 이미지 재빌드 후 기동 (integrated, PEOPLE_COUNTER_COUNT=$pc_count)"
  bash "$REBUILD_INT"
else
  echo ""
  ui_info "udev [3/5]" "[3/5] DDC(Modbus)용 USB–시리얼만 연결합니다.\n\n• 연결할 것: 승일 DDC와 Modbus 통신에 쓰는 USB–RS485(또는 USB–시리얼) 어댑터 1개만 PC USB에 꽂으세요.\n• 다른 USB 시리얼 장치는 가능하면 뽑아 두면 tty 구분이 쉽습니다.\n\n다음에 tty 목록 창(yad/zenity)이 뜨면 고르고, KERNELS 번호는 터미널에서 고릅니다."
  echo "[3/5] DDC(Modbus)용 USB–시리얼 어댑터(또는 케이블)만 PC에 연결하세요."
  echo "     (다른 USB 시리얼은 뽑아 두는 것을 권장합니다.)"
  read -r -p "[3/5] 위 장비만 연결했으면 Enter... " _

  run_probe_with_tty_ui "$PROBE_DDC" "udev [3/5] Modbus(DDC) tty"

  echo ""
  echo "[4/5] PeopleCounter 개수 선택"
  pc_count=""
  if ui_available; then
    pc_count="$(ui_pick_people_counter_count)"
  fi
  while true; do
    if [ -z "$pc_count" ]; then
      echo "  0) 미설치/미사용"
      echo "  1) 1대"
      echo "  2) 2대"
      echo "  3) 3대"
      read -r -p "[4/5] PeopleCounter 개수 선택 (0~3): " pc_count
    fi
    if [[ "$pc_count" =~ ^[0-3]$ ]]; then
      break
    fi
    if ui_available; then
      zenity --error --text="0~3 중 하나를 선택하세요." 2>/dev/null || true
    fi
    echo "   0~3 중 하나를 입력하세요."
    pc_count=""
  done

  export PEOPLE_COUNTER_COUNT="$pc_count"

  if [ "$pc_count" -ge 1 ]; then
    for i in $(seq 1 "$pc_count"); do
      echo ""
      ui_info "udev [4/5]" "[4/5] PeopleCounter #$i (APC)용 USB–시리얼만 연결합니다.\n\n• 다른 USB 시리얼은 뽑으세요.\n• 지금은 PeopleCounter #$i 에 해당하는 케이블 1개만 연결하세요.\n\n다음 화면에서 tty를 선택합니다.\n완료되면 케이블을 뽑고 다음(#$((i+1)))으로 진행합니다."
      echo "[4/5] PeopleCounter #$i 케이블만 연결하세요."
      read -r -p "[4/5] PC#$i 만 연결했으면 Enter... " _

      run_probe_with_tty_ui "$PROBE_PC" "udev [4/5] PeopleCounter #$i tty" --index "$i"

      echo ""
      echo "✅ PeopleCounter #$i 프로브 완료. 다음 장비를 위해 케이블을 뽑아주세요."
      read -r -p "[4/5] 케이블을 뽑았으면 Enter... " _
    done
  else
    echo ""
    echo "ℹ️  PeopleCounter 0대 선택 — 프로브 단계 생략"
  fi

  echo ""
  echo "[5/5] udev rules 설치(링크 자동 확인 포함)..."
  ui_info "sudo" "곧 관리자 권한(sudo)으로 udev 규칙을 설치합니다.\n03-install 은 이 단계에서 한 번만 실행되며, 내부에서 udev reload·trigger·settle 을 이미 수행합니다.\n실패 후 Enter 로 재시도할 때는 03 을 반복하지 않고 04-verify 와 심볼릭 링크 확인만 합니다."

  UDEV_INSTALL_MAX_RETRY="${UDEV_INSTALL_MAX_RETRY:-15}"

  if sudo PEOPLE_COUNTER_COUNT="$PEOPLE_COUNTER_COUNT" bash "$INSTALL_USB" --strict; then
    echo ""
    echo "✅ [5/5] udev 설치·검증 단계를 통과했습니다."
  else
    echo ""
    echo "❌ [5/5] 03-install 이 실패했습니다. Docker(usb485) 기동은 아직 실행하지 않습니다."
    echo "   USB 재연결·프로브(01·02) 결과 확인 후, 아래에서 04-verify 만 반복할 수 있습니다."
    udev_install_attempt=0
    while true; do
      udev_install_attempt=$((udev_install_attempt + 1))
      if [ "$udev_install_attempt" -gt "$UDEV_INSTALL_MAX_RETRY" ]; then
        echo ""
        echo "❌ [5/5] 최대 재시도(${UDEV_INSTALL_MAX_RETRY})에 도달했습니다. 수동:"
        echo "   sudo bash $INSTALL_USB --strict   또는   bash $VERIFY_USB"
        exit 1
      fi
      echo ""
      echo "🔄 [5/5] 04-verify (${udev_install_attempt}/${UDEV_INSTALL_MAX_RETRY}) — 03-install 은 생략"
      PEOPLE_COUNTER_COUNT="$PEOPLE_COUNTER_COUNT" bash "$VERIFY_USB"
      ok_links=1
      [ -L /dev/bushub-controller ] || ok_links=0
      if [ "$PEOPLE_COUNTER_COUNT" -ge 1 ]; then
        for i in $(seq 1 "$PEOPLE_COUNTER_COUNT"); do
          [ -L "/dev/bushub-people-counter-$i" ] || ok_links=0
        done
      fi
      if [ "$ok_links" -eq 1 ]; then
        echo ""
        echo "🎉 [5/5] 심볼릭 링크 확인됨 — Docker 기동으로 진행합니다."
        break
      fi
      echo ""
      echo "❌ [5/5] 아직 필요한 /dev 링크가 없습니다."
      echo "   • Enter — 다시 04-verify 만 실행"
      echo "   • q 입력 후 Enter — 마법사 종료 (필요 시 수동으로 sudo bash $INSTALL_USB --strict)"
      read -r -p "[5/5] 재시도? (Enter/q): " _retry_choice
      if [[ "${_retry_choice:-}" =~ ^[qQ]$ ]]; then
        echo "마법사를 종료합니다."
        echo "   sudo bash $INSTALL_USB --strict   또는   bash $VERIFY_USB"
        exit 1
      fi
    done
  fi

  echo ""
  echo "Docker 스택 — 이미지 재빌드 후 기동 (USB-RS485)"
  bash "$REBUILD_USB"
fi

echo ""
echo "✅ 마법사 흐름을 마쳤습니다."
if [ "$stack_sel" = "1" ]; then
  echo "   udev 추가 확인: bash $VERIFY_USB"
  ui_info "완료" "설치 마법사 단계가 끝났습니다.\n문제가 있으면 터미널 로그와\n04-verify-bushub-usb-serial.sh 를 확인하세요."
else
  echo "   integrated: Modbus=/dev/ttyS0, PeopleCounter는 bash $VERIFY_INT"
  ui_info "완료" "설치 마법사 단계가 끝났습니다.\nintegrated 는 Modbus=ttyS0, APC는 USB(/dev/bushub-people-counter-*).\n문제가 있으면 터미널 로그와 udev 링크를 확인하세요."
fi
