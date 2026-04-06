#!/bin/bash
# Docker Compose / 컨테이너 상태
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${BUSHUB_COMPOSE_FILE:-docker-compose.integrated.yml}"

echo "📊 3단계: Docker 상태"
echo "=== docker compose ($COMPOSE_FILE) ==="
if [ -f "$COMPOSE_FILE" ]; then
  docker compose -f "$COMPOSE_FILE" ps
else
  echo "⚠️  $COMPOSE_FILE 없음"
fi

echo ""
echo "=== 컨테이너 (bushub-*) ==="
docker ps -a --filter "name=bushub-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || true

echo ""
echo "=== 포트 (80, 3000, 8080, 27017) ==="
if command -v ss >/dev/null 2>&1; then
  ss -tlnp 2>/dev/null | grep -E ':(80|3000|8080|27017)\b' || echo "(해당 포트 리슨 없음)"
else
  netstat -tlnp 2>/dev/null | grep -E ':(80|3000|8080|27017)\b' || echo "(netstat/ss 로 확인 불가)"
fi

echo ""
echo "=== 웹 / API (호스트) ==="
if curl -sSf "http://localhost" >/dev/null 2>&1; then
  echo "✅ http://localhost (Nginx)"
else
  echo "❌ http://localhost"
fi
if curl -sSf "http://localhost:3000/api/v1/health" >/dev/null 2>&1; then
  echo "✅ Backend health (직접 3000)"
else
  echo "❌ Backend health (직접 3000)"
fi
if curl -sSf "http://localhost/api/v1/health" >/dev/null 2>&1; then
  echo "✅ API via Nginx /api/v1/health"
else
  echo "❌ API via Nginx /api/v1/health"
fi

echo "✅ 3단계 완료 — 로그: ./scripts/main-04-logs.sh"
