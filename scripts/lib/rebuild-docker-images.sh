#!/usr/bin/env bash
# 호스트 dist 제거 + 백엔드·프론트 프로덕션 이미지를 --no-cache 로 재빌드
# 직접 실행하지 말고 rebuild-and-up-usb485.sh / rebuild-and-up-integrated.sh 사용
#
# 위치: 모노레포 scripts/lib
set -euo pipefail

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
ROOT_DIR="$(cd "$SCRIPT_DIR/../../bushub-client" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

TAG="${GITHUB_REF_NAME:-latest}"

echo "🔖 이미지 태그: $TAG"
echo "📂 모노레포 루트: $REPO_ROOT"
echo "📂 bushub-client: $ROOT_DIR"

echo "🧹 빌드 산출물(dist) 제거…"
rm -rf "$ROOT_DIR/backend/dist" "$ROOT_DIR/frontend/dist"

echo "🐳 Docker 이미지 재빌드 (--no-cache, 수 분 걸릴 수 있음)…"
cd "$REPO_ROOT"
docker build --no-cache \
  -f bushub-client/backend/Dockerfile \
  --target production \
  -t "bushub-backend:${TAG}" .
docker build --no-cache \
  -f bushub-client/frontend/Dockerfile \
  --target production \
  -t "bushub-frontend:${TAG}" .

echo "✅ 이미지 빌드 완료: bushub-backend:${TAG}, bushub-frontend:${TAG}"
