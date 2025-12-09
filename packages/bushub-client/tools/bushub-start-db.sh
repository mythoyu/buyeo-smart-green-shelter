#!/bin/bash
set -e

echo "🚀 MongoDB 컨테이너 시작 중..."

# 컨테이너가 존재하는지 확인
if sudo docker ps -a --format "table {{.Names}}" | grep -q "^bushub-db$"; then
  echo "📦 기존 MongoDB 컨테이너를 시작합니다..."
  sudo docker start bushub-db
  echo "✅ MongoDB 컨테이너 시작 완료"
  echo "🗄️ MongoDB 접속: mongodb://localhost:27017/bushub_client"
else
  echo "❌ MongoDB 컨테이너가 존재하지 않습니다."
  echo "💡 먼저 컨테이너를 생성하거나 전체 시스템을 시작하세요:"
  echo "   ./bushub-menu.sh restart"
  echo "   또는"
  echo "   sudo docker compose -f docker-compose.integrated.yml up -d"
  exit 1
fi
