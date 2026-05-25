#!/bin/bash
# =================================================================
# MongoDB 로컬 개발 — docker-compose.usb485.yml 의 db 서비스만 기동
# =================================================================
#
# 현장 usb485 스택과 동일한 db (mongo:6.0.15, sw-by-bushub-db, :27017, 인증).
# 루트 .env.development 의 MONGO_ROOT_* / JWT_SECRET 을 compose 에 전달합니다.
#
# 사용법:
#   루트 .env.development 에 MONGO_ROOT_USER, MONGO_ROOT_PASSWORD, JWT_SECRET 설정 후
#   ./packages/start-mongodb-dev.sh
#
# 중지: ./packages/stop-mongodb-dev.sh
# 데이터 삭제: ./packages/stop-mongodb-dev.sh --remove-data
#

set -e

DB_CONTAINER="${BUSHUB_DEV_DB_CONTAINER:-sw-by-bushub-db}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.development"
COMPOSE_FILE="$REPO_ROOT/docker-compose.usb485.yml"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ $ENV_FILE 이 없습니다."
  echo "   루트 .env.development 에 MONGO_ROOT_USER, MONGO_ROOT_PASSWORD, JWT_SECRET 을 설정하세요."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $COMPOSE_FILE 을 찾을 수 없습니다."
  exit 1
fi

# 레거시 컨테이너 이름 정리 (포트 27017 충돌 방지)
for legacy in mongodb-dev bushub-db sw-gn-bushub-db; do
  if [ "$legacy" != "$DB_CONTAINER" ] && docker ps -a --format '{{.Names}}' | grep -qx "$legacy"; then
    echo "⚠️  레거시 컨테이너 제거: $legacy"
    docker stop "$legacy" 2>/dev/null || true
    docker rm "$legacy" 2>/dev/null || true
  fi
done

echo "🚀 MongoDB 개발 (docker-compose.usb485.yml → db, container=$DB_CONTAINER)..."
cd "$REPO_ROOT"

NET_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$REPO_ROOT")}_bushub-network"
if docker network inspect "$NET_NAME" >/dev/null 2>&1; then
  if ! docker ps -a --filter "network=$NET_NAME" --format '{{.Names}}' | grep -q .; then
    docker network rm "$NET_NAME" 2>/dev/null || true
  fi
fi

docker compose --env-file "$ENV_FILE" -f docker-compose.usb485.yml up -d db

echo "⏳ 기동 대기..."
sleep 5

if docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  health="$(docker inspect --format '{{.State.Health.Status}}' "$DB_CONTAINER" 2>/dev/null || echo none)"
  if [ "$health" = "unhealthy" ]; then
    echo "⚠️  $DB_CONTAINER 는 실행 중이나 healthcheck 가 실패했습니다."
    echo "   (기존 볼륨에 root 사용자/비밀번호가 없거나 .env 와 불일치할 수 있음)"
    echo "   해결: ./packages/stop-mongodb-dev.sh --remove-data 후 재기동"
    docker compose --env-file "$ENV_FILE" -f docker-compose.usb485.yml logs db --tail 15
    echo ""
  fi
  echo "✅ $DB_CONTAINER 가 실행 중입니다."
  echo ""
  echo "  URI: mongodb://<user>:***@localhost:27017/bushub_client?authSource=admin"
  echo "  포트: 27017"
  echo "  로그: docker logs $DB_CONTAINER"
  echo "  중지: ./packages/stop-mongodb-dev.sh"
  echo "  비밀번호 변경 시: ./packages/stop-mongodb-dev.sh --remove-data 후 재기동"
else
  echo "❌ db 기동 실패. docker compose -f docker-compose.usb485.yml logs db"
  exit 1
fi
