#!/bin/bash
set -e

COMPOSE_FILE="packages/bushub-client/docker-compose.integrated.yml"

if [ -f "$COMPOSE_FILE" ]; then
  echo "🛑 Docker Compose down..."
  docker compose -f "$COMPOSE_FILE" down || true
else
  echo "⚠️ $COMPOSE_FILE 를 찾을 수 없습니다. (USB_ROOT에서 실행 중인지 확인)"
fi

echo "✅ 완료"


