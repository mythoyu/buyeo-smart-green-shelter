#!/bin/bash
# =================================================================
# MongoDB 로컬 개발 — docker-compose.usb485.yml db 서비스 중지
# =================================================================

set -e

DB_CONTAINER="${BUSHUB_DEV_DB_CONTAINER:-sw-by-bushub-db}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.development"
COMPOSE_FILE="$REPO_ROOT/docker-compose.usb485.yml"
REMOVE_DATA=false

if [ "${1:-}" = "--remove-data" ]; then
  REMOVE_DATA=true
fi

echo "🛑 MongoDB 개발 (usb485 compose db) 중지..."

for legacy in mongodb-dev bushub-db sw-gn-bushub-db; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$legacy"; then
    docker stop "$legacy" 2>/dev/null || true
    docker rm "$legacy" 2>/dev/null || true
    echo "ℹ️  레거시 컨테이너 제거: $legacy"
  fi
done

if [ -f "$COMPOSE_FILE" ] && [ -f "$ENV_FILE" ]; then
  cd "$REPO_ROOT"
  docker compose --env-file "$ENV_FILE" -f docker-compose.usb485.yml stop db 2>/dev/null || true
  docker compose --env-file "$ENV_FILE" -f docker-compose.usb485.yml rm -f db 2>/dev/null || true
  echo "✅ compose db 서비스 중지/제거"
elif docker ps -a --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  docker stop "$DB_CONTAINER" 2>/dev/null || true
  docker rm "$DB_CONTAINER" 2>/dev/null || true
  echo "✅ $DB_CONTAINER 중지/제거"
else
  echo "ℹ️  실행 중인 $DB_CONTAINER 가 없습니다."
fi

if [ "$REMOVE_DATA" = true ]; then
  echo "⚠️  compose 볼륨 db_data 삭제..."
  read -p "MongoDB 데이터(db_data)를 삭제할까요? (y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    PROJECT_NAME="${COMPOSE_PROJECT_NAME:-$(basename "$REPO_ROOT")}"
    docker volume rm "${PROJECT_NAME}_db_data" 2>/dev/null || \
      docker volume rm "buyeo-smart-green-shelter_db_data" 2>/dev/null || \
      docker volume rm "smartcity_db_data" 2>/dev/null || \
      echo "ℹ️  db_data 볼륨을 찾지 못했습니다. docker volume ls 로 확인하세요."
    echo "🗑️  볼륨 삭제 시도 완료"
  fi
fi

echo "✅ 완료. 다시 시작: ./packages/start-mongodb-dev.sh"
