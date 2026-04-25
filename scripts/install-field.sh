#!/usr/bin/env bash
# 현장(on-site) 설치 진입점. 이름의 field = 영어 field(현장·말단 배포 PC), 개발용 워크스테이션과 구분.
# 모노레포 루트에서: ./scripts/install-field.sh
# 배포 태그 사용 시: git fetch origin --tags && git checkout vX.Y.Z 후 위와 동일
# 내부 플로우:
#   install: 호스트 설치 + 재부팅(선택)
#   ports: 포트/udev/스택 설정
#   post-ports: 이미지 재빌드+compose up만 (터미널에서 스택 선택, 필요 시 인자로 지정)
#   all: install 실행 후 ports 실행 안내
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_STAGE="$ROOT/scripts/lib/install/01-install-and-reboot.sh"
PORTS_STAGE="$ROOT/scripts/lib/install/02-configure-ports.sh"
POST_PORTS_STAGE="$ROOT/scripts/lib/install/03-post-ports-rebuild.sh"

usage() {
  echo "사용법: $0 [install|ports|post-ports|all] [--yes] [--reboot] [-h|--help]"
  echo ""
  echo "  install     1단계(호스트 설치)만 수행"
  echo "  ports       2단계(포트/udev/스택 설정)만 수행"
  echo "  post-ports  3단계: 코드 반영 후 이미지 재빌드+기동 (터미널에서 스택 선택, 선택: 인자 usb485|integrated)"
  echo "  all         1단계 수행 후 2단계 실행 방법 안내(기본값)"
  echo ""
  echo "공통 옵션:"
  echo "  --yes      확인 프롬프트 생략"
  echo "  --reboot   install/all 에서 설치 직후 재부팅"
}

MODE="all"
if [ $# -gt 0 ]; then
  case "$1" in
    install|ports|post-ports|all)
      MODE="$1"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
  esac
fi

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
