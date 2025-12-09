#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
COMPOSE_FILE="packages/bushub-client/docker-compose.integrated.yml"

if [ -f "$COMPOSE_FILE" ]; then
  echo "🔄 Docker Compose 서비스 재시작..."
  docker compose -f "$COMPOSE_FILE" restart || true
else
  echo "⚠️ $COMPOSE_FILE 를 찾을 수 없습니다. (USB_ROOT에서 실행 중인지 확인)"
fi

echo "🔄 Network Control API(systemd) 재시작..."
sudo systemctl restart bushub-network-control-api || true
echo "✅ 완료"


