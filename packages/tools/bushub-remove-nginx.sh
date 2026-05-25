#!/bin/bash
set -e

echo "🛑 Nginx 컨테이너 정지 중..."
sudo docker stop bushub-nginx || true

echo "🗑️ Nginx 컨테이너 제거 중..."
sudo docker rm bushub-nginx || true

echo "✅ Nginx 컨테이너 완전 제거 완료"
echo "💡 컨테이너를 다시 시작하려면: ./bushub-menu.sh start-nginx"
