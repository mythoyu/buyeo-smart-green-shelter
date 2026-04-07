#!/bin/bash
# 현장(on-site) 설치 진입점. 이름의 field = 영어 field(현장·말단 배포 PC), 개발용 워크스테이션과 구분.
# 모노레포 루트에서: ./scripts/install-field.sh
# 배포 태그 사용 시: git fetch origin --tags && git checkout vX.Y.Z 후 위와 동일
# 내부 플로우: scripts/lib/udev/00-wizard-…
#   Desktop: zenity 안내 + 터미널 프로브/빌드
#   SSH/서버: zenity 없으면 터미널만
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec bash "$ROOT/scripts/lib/udev/00-wizard-bushub-usb-serial.sh" "$@"
