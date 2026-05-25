#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.integrated.yml"
ENV_ARGS=()
if [ -f "$REPO_ROOT/.env" ]; then
  ENV_ARGS=(--env-file "$REPO_ROOT/.env")
fi

if [ -f "$COMPOSE_FILE" ]; then
  echo "🔄 Docker Compose 서비스 재시작..."
  docker compose "${ENV_ARGS[@]}" -f "$COMPOSE_FILE" restart || true
else
  echo "⚠️ $COMPOSE_FILE 를 찾을 수 없습니다."
fi

echo "✅ 완료"


