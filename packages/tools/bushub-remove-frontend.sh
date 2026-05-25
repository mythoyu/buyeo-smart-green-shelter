#!/bin/bash
set -e

echo "🛑 Frontend 컨테이너 정지 중..."
sudo docker stop bushub-frontend || true

echo "🗑️ Frontend 컨테이너 제거 중..."
sudo docker rm bushub-frontend || true

echo "✅ Frontend 컨테이너 완전 제거 완료"
echo "💡 컨테이너를 다시 시작하려면: ./bushub-menu.sh start-frontend"
