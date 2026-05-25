#!/bin/bash
set -e

echo "🔄 USB에서 서비스 재시작..."

# 서비스 재시작
echo "MongoDB 재시작..."
sudo systemctl restart bushub-mongodb
sleep 3

echo "Nginx 재시작..."
sudo systemctl restart bushub-nginx
sleep 2

echo "Backend 재시작..."
sudo systemctl restart bushub-backend
sleep 2

echo "Frontend 재시작..."
sudo systemctl restart bushub-frontend
sleep 2

echo "✅ 재시작 완료!"
echo "다음 단계: ./scripts/main-03-status.sh (상태 확인)"
