#!/usr/bin/env bash
# 3단계: ports(마법사) 완료 후 소스만 갱신했을 때 — 이미지 재빌드 + compose up 만 수행
set -euo pipefail

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi

ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
REBUILD_USB="$ROOT_DIR/scripts/lib/rebuild-and-up-usb485.sh"
REBUILD_INT="$ROOT_DIR/scripts/lib/rebuild-and-up-integrated.sh"

usage() {
  echo "사용법: $0 [usb485|integrated] [-h|--help]"
  echo ""
  echo "  ports 단계까지 끝난 PC에서 코드(git pull 등) 반영 후 실행합니다."
  echo "  인자 없으면 터미널에서 스택(1=usb485, 2=integrated)을 고릅니다."
  echo "  rebuild-docker-images + docker compose up 까지 수행합니다."
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 0
fi

pick_stack_interactive() {
  local sel=""
  local tty_in=/dev/stdin
  if [ ! -t 0 ] && [ -r /dev/tty ]; then
    tty_in=/dev/tty
  fi
  echo ""
  echo "Docker 스택을 선택하세요 (이 PC에 맞는 쪽):"
  echo "  1) USB–RS485 어댑터형 (docker-compose.usb485.yml)"
  echo "  2) 내장 RS-485 포트형 (docker-compose.integrated.yml)"
  while true; do
    read -r -p "선택 (1 또는 2): " sel <"$tty_in"
    case "${sel:-}" in
      1)
        printf '%s' "usb485"
        return
        ;;
      2)
        printf '%s' "integrated"
        return
        ;;
      *)
        echo "   1 또는 2 만 입력하세요."
        ;;
    esac
  done
}

STACK="${1:-}"
case "$STACK" in
  usb485|integrated)
    shift
    ;;
  "")
    if [[ -t 0 ]] || { [ -r /dev/tty ] && [ -w /dev/tty ]; }; then
      STACK="$(pick_stack_interactive)"
    else
      echo "❌ 터미널을 사용할 수 없습니다. 스택을 인자로 주세요: usb485 또는 integrated" >&2
      usage >&2
      exit 1
    fi
    ;;
  *)
    echo "❌ 알 수 없는 인자: $STACK" >&2
    usage >&2
    exit 1
    ;;
esac

case "$STACK" in
  usb485)
    exec bash "$REBUILD_USB" "$@"
    ;;
  integrated)
    exec bash "$REBUILD_INT" "$@"
    ;;
  *)
    echo "❌ 내부 오류: STACK=$STACK" >&2
    exit 1
    ;;
esac
