#!/usr/bin/env bash
# 현장(on-site) 설치 진입점. 이름의 field = 영어 field(현장·말단 배포 PC), 개발용 워크스테이션과 구분.
# 모노레포 루트에서: ./scripts/install-field.sh
# 배포 태그 사용 시: git fetch origin --tags && git checkout vX.Y.Z 후 위와 동일
# 내부 플로우:
#   install: 호스트 설치 + infra docker load
#   ports: 포트/udev/스택 설정
#   post-ports: 앱 이미지 소스 빌드+compose up (infra는 install 시 docker-images 로드)
#   all: install 실행 후 ports 실행 안내
#   set-ntp / status-ntp: 호스트 NTP (systemd-timesyncd)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_STAGE="$ROOT/scripts/lib/install/01-install-and-reboot.sh"
PORTS_STAGE="$ROOT/scripts/lib/install/02-configure-ports.sh"
POST_PORTS_STAGE="$ROOT/scripts/lib/install/03-post-ports-rebuild.sh"
NTP_STAGE="$ROOT/scripts/lib/install/ntp-field.sh"

usage() {
  echo "사용법: $0 [install|ports|post-ports|all|set-ntp|status-ntp] [--yes] [--reboot] [-h|--help]"
  echo ""
  echo "  install     1단계(호스트 설치)만 수행"
  echo "  ports       2단계(포트/udev/스택 설정)만 수행"
  echo "  post-ports  3단계: 코드 반영 후 이미지 재빌드+기동 (터미널에서 스택 선택, 선택: 인자 usb485|integrated)"
  echo "  all         1단계 수행 후 2단계 실행 방법 안내(기본값)"
  echo "  set-ntp     현장 NTP 서버 적용 (스크립트 내 IP)"
  echo "  status-ntp  NTP 설치·설정 상태 확인"
  echo ""
  echo "공통 옵션:"
  echo "  --yes      확인 프롬프트 생략"
  echo "  --reboot   install/all 에서 설치 직후 재부팅"
}

MODE="all"
if [ $# -gt 0 ]; then
  case "$1" in
    install|ports|post-ports|all|set-ntp|status-ntp)
      MODE="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
  esac
fi

# shellcheck source=scripts/lib/field-guard.sh
source "$ROOT/scripts/lib/field-guard.sh"

case "$MODE" in
  install)
    exec bash "$INSTALL_STAGE" "$@"
    ;;
  ports)
    exec bash "$PORTS_STAGE" "$@"
    ;;
  post-ports)
    exec bash "$POST_PORTS_STAGE" "$@"
    ;;
  set-ntp)
    exec bash "$NTP_STAGE" set
    ;;
  status-ntp)
    exec bash "$NTP_STAGE" status
    ;;
  all)
    bash "$INSTALL_STAGE" "$@"
    echo ""
    echo "➡️  재부팅(또는 재로그인) 후 2단계를 실행하세요:"
    echo "   ./scripts/install-field.sh ports"
    echo "   (이후 소스만 갱신 시) ./scripts/install-field.sh post-ports"
    ;;
  *)
    echo "알 수 없는 모드: $MODE" >&2
    usage >&2
    exit 1
    ;;
esac
