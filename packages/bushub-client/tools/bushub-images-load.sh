#!/bin/bash
set -e

DIR="packages/bushub-client/docker-images"

if [ ! -d "$DIR" ]; then
  echo "❌ $DIR 디렉터리가 없습니다. USB_ROOT에서 실행하세요."
  exit 1
fi

for image_file in "$DIR"/*.tar; do
  [ -f "$image_file" ] || continue
  echo "📦 로드 중: $image_file"
  docker load -i "$image_file"
done

echo "✅ Docker 이미지 로드 완료"


