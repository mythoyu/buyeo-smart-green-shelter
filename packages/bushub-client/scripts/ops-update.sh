#!/bin/bash
# 새 tar 이미지를 docker load 한 뒤 컨테이너를 재생성합니다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${BUSHUB_COMPOSE_FILE:-docker-compose.integrated.yml}"
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $ROOT_DIR/$COMPOSE_FILE 없음"
  exit 1
fi

echo "🔄 Docker Compose 업데이트: $COMPOSE_FILE"

if [ -d "$ROOT_DIR/docker-images" ]; then
  echo "📦 docker-images/*.tar 로드..."
  shopt -s nullglob
  for image_file in "$ROOT_DIR"/docker-images/*.tar; do
    echo "   로드: $image_file"
    docker load -i "$image_file"
  done
  shopt -u nullglob
else
  echo "ℹ️  docker-images/ 없음 — 이미지는 이미 있는 상태여야 합니다."
fi

docker compose -f "$COMPOSE_FILE" up -d --force-recreate

echo "✅ 업데이트 완료"
echo "   상태: ./scripts/main-03-status.sh"
