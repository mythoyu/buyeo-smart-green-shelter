#!/bin/bash
# Docker Compose 스택 중지 (systemd bushub-* 사용 안 함)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${BUSHUB_COMPOSE_FILE:-docker-compose.integrated.yml}"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $ROOT_DIR/$COMPOSE_FILE 없음"
  exit 1
fi

echo "🛑 Docker Compose 중지: $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" down

echo "✅ 완료"
echo "   다시 시작: ./scripts/main-02-start.sh 또는 deploy-hybrid.sh"
