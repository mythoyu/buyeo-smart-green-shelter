#!/bin/bash
set -e

echo "🛑 USB에서 서비스 중지..."

# 서비스 중지 (역순)
echo "Frontend 중지..."
sudo systemctl stop bushub-frontend
sleep 1

echo "Backend 중지..."
sudo systemctl stop bushub-backend
sleep 1

echo "Nginx 중지..."
sudo systemctl stop bushub-nginx
sleep 1

echo "MongoDB 중지..."
sudo systemctl stop bushub-mongodb
sleep 1

echo "✅ 모든 서비스가 중지되었습니다!"
echo "다음 단계: ./scripts/main-02-start.sh (다시 시작)"
