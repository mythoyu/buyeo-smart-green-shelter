#!/bin/bash
# Docker Compose 공통 기동 (직접 호출 금지)
# start-docker-compose-integrated.sh 또는 start-docker-compose-usb485.sh 가 설정한
# BUSHUB_COMPOSE_MODE 만 사용합니다.
# 현장 전체 설치는 모노레포 루트의 ./scripts/install-field.sh 를 사용합니다.
#
# 위치: 모노레포 scripts/lib — compose 파일은 레포 루트, nginx 설정은 bushub-client/nginx
set -euo pipefail

MODE="${BUSHUB_COMPOSE_MODE:-}"
if [ -z "$MODE" ]; then
  echo "❌ 직접 실행하지 마세요."
  echo "   ./scripts/lib/start-docker-compose-integrated.sh   (내장 RS-485)"
  echo "   ./scripts/lib/start-docker-compose-usb485.sh       (USB-RS485)"
  exit 1
fi

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

case "$MODE" in
  integrated)
    COMPOSE_FILE="docker-compose.integrated.yml"
    ;;
  usb485)
    COMPOSE_FILE="docker-compose.usb485.yml"
    ;;
  *)
    echo "❌ 내부 오류: 알 수 없는 BUSHUB_COMPOSE_MODE=$MODE"
    exit 1
    ;;
esac

echo "📎 스택 모드: $MODE → $COMPOSE_FILE"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $REPO_ROOT/$COMPOSE_FILE 없음"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ docker compose 를 사용할 수 없습니다. ./scripts/lib/setup-host-ubuntu24.sh 실행 여부를 확인하세요."
  exit 1
fi

# 이미지 태그: GITHUB_REF_NAME 또는 docker-images/bushub-backend.*.tar 에서 추론
if [ -z "${GITHUB_REF_NAME:-}" ]; then
  if ls docker-images/bushub-backend.*.tar >/dev/null 2>&1; then
    TAG_FROM_FILE=$(ls docker-images/bushub-backend.*.tar | sed -n 's/.*bushub-backend\.\(.*\)\.tar/\1/p' | head -n1)
    if [ -n "$TAG_FROM_FILE" ]; then
      export GITHUB_REF_NAME="$TAG_FROM_FILE"
      echo "🔖 이미지 태그 자동 설정: $GITHUB_REF_NAME"
    else
      export GITHUB_REF_NAME="latest"
    fi
  else
    export GITHUB_REF_NAME="latest"
  fi
else
  echo "🔖 이미지 태그 지정됨: $GITHUB_REF_NAME"
fi

if [ -d "docker-images" ]; then
  echo "📦 Docker 이미지 로드 (docker-images/*.tar)..."
  for image_file in docker-images/*.tar; do
    if [ -f "$image_file" ]; then
      echo "   로드: $image_file"
      docker load -i "$image_file"
    fi
  done
else
  echo "ℹ️  docker-images/ 없음 — 레지스트리 pull 또는 사전에 이미지가 있어야 합니다."
fi

echo "🚀 docker compose -f $COMPOSE_FILE up -d"
docker compose -f "$COMPOSE_FILE" down || true
docker compose -f "$COMPOSE_FILE" up -d

echo ""
echo "🐳 컨테이너:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔍 헬스체크 (잠시 대기)..."
sleep 5
if curl -sSf "http://localhost:3000/health" >/dev/null 2>&1; then
  echo "✅ Backend API"
else
  echo "❌ Backend API"
fi
if curl -sSf "http://localhost:8080" >/dev/null 2>&1; then
  echo "✅ Frontend"
else
  echo "❌ Frontend"
fi
if curl -sSf "http://localhost" >/dev/null 2>&1; then
  echo "✅ Nginx"
else
  echo "❌ Nginx"
fi

echo ""
echo "🎉 기동 완료: $COMPOSE_FILE"
echo "   중지: cd $REPO_ROOT && docker compose -f $COMPOSE_FILE down"
