#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${BUSHUB_COMPOSE_FILE:-docker-compose.integrated.yml}"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $ROOT_DIR/$COMPOSE_FILE 없음"
  exit 1
fi

echo "🔄 Docker Compose 재시작: $COMPOSE_FILE"
docker compose -f "$COMPOSE_FILE" restart

echo "✅ 완료"
echo "   상태: ./scripts/main-03-status.sh"
