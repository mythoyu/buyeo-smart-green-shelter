#!/usr/bin/env bash
# 1단계: 호스트 설치(필수 도구 설치) + (선택) 재부팅
set -euo pipefail

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi

ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
SETUP_HOST="$ROOT_DIR/scripts/lib/setup-host-ubuntu24.sh"

ASSUME_YES=0
DO_REBOOT=0

usage() {
  echo "사용법: $0 [--yes] [--reboot] [-h|--help]"
  echo ""
  echo "  --yes      확인 프롬프트를 생략합니다."
  echo "  --reboot   설치 완료 직후 재부팅을 즉시 실행합니다."
  echo "  -h, --help 도움말"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --yes)
      ASSUME_YES=1
      ;;
    --reboot)
      DO_REBOOT=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 인자: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [ ! -f "$SETUP_HOST" ]; then
  echo "❌ 호스트 설정 스크립트가 없습니다: $SETUP_HOST" >&2
  exit 1
fi

echo "=========================================="
echo " Bushub 1단계: 설치 + 재부팅"
echo "=========================================="
echo ""

bash "$SETUP_HOST"

echo ""
echo "✅ 1단계 설치가 완료되었습니다."
echo "   다음 단계: ./scripts/install-field.sh ports"

if [ "$DO_REBOOT" -eq 1 ]; then
  echo ""
  echo "🔁 --reboot 옵션으로 즉시 재부팅을 실행합니다."
  sudo reboot
fi

if [ "$ASSUME_YES" -eq 0 ]; then
  echo ""
  read -r -p "지금 재부팅할까요? [y/N]: " answer
  answer="${answer:-N}"
  if [[ "$answer" =~ ^[yY]$ ]]; then
    sudo reboot
  fi
fi
