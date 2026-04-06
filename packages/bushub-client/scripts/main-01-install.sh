#!/bin/bash
# Docker Compose 전용: 호스트에 /opt/bushub 를 두고 systemd 로 서비스를 띄우지 않습니다.
# USB 패키지에서는 deploy-hybrid.sh 가 이미지 로드 + compose 기동까지 수행합니다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

chmod +x "$SCRIPT_DIR"/*.sh 2>/dev/null || true

if [ ! -f "$ROOT_DIR/deploy-hybrid.sh" ]; then
  echo "❌ deploy-hybrid.sh 를 찾을 수 없습니다: $ROOT_DIR"
  exit 1
fi

echo "🚀 1단계: Docker Compose 기반 설치 (deploy-hybrid.sh)"
echo "   디렉터리: $ROOT_DIR"
sudo bash "$ROOT_DIR/deploy-hybrid.sh"

echo "✅ 1단계 완료"
echo "   상태: ./scripts/main-03-status.sh"
echo "   재기동만: ./scripts/main-02-start.sh (이미지는 이미 로드된 경우)"
