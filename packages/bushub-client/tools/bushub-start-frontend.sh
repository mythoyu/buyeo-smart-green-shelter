#!/bin/bash
set -e

echo "🚀 Frontend 컨테이너 시작 중..."

# 컨테이너가 존재하는지 확인
if sudo docker ps -a --format "table {{.Names}}" | grep -q "^bushub-frontend$"; then
  echo "📦 기존 Frontend 컨테이너를 시작합니다..."
  sudo docker start bushub-frontend
  echo "✅ Frontend 컨테이너 시작 완료"
  echo "🌐 접속: http://localhost:8080"
else
  echo "❌ Frontend 컨테이너가 존재하지 않습니다."
  echo "💡 먼저 컨테이너를 생성하거나 전체 시스템을 시작하세요:"
  echo "   ./bushub-menu.sh restart"
  echo "   또는"
  echo "   sudo docker compose -f docker-compose.integrated.yml up -d"
  exit 1
fi
