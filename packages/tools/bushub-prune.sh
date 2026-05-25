#!/bin/bash
set -e

echo "🧹 Docker 정리 중..."
docker system prune -f || true
docker volume prune -f || true
echo "✅ 완료"


