#!/bin/bash
set -e

echo "🔄 USB에서 업데이트 시작..."

# 기존 서비스 중지
echo "서비스 중지..."
sudo systemctl stop bushub-frontend bushub-backend bushub-nginx bushub-mongodb

# 백업 생성
echo "백업 생성..."
sudo cp -r /opt/bushub /opt/bushub.backup.$(date +%Y%m%d_%H%M%S)

# 새 파일 복사
echo "새 파일 복사..."
sudo cp -r frontend/* /opt/bushub/frontend/
sudo cp -r backend/* /opt/bushub/backend/
sudo cp -r mongodb/* /opt/bushub/mongodb/
sudo cp -r nginx/* /opt/bushub/nginx/
sudo cp -r config/* /opt/bushub/config/

# 권한 설정
sudo chmod +x /opt/bushub/mongodb/*
sudo chmod +x /opt/bushub/nginx/*
sudo chown -R 999:999 /opt/bushub/data  # MongoDB 권한
sudo chown -R root:root /opt/bushub/frontend
sudo chown -R root:root /opt/bushub/backend

# 서비스 시작
echo "서비스 시작..."
sudo systemctl start bushub-mongodb bushub-nginx bushub-backend bushub-frontend

echo "✅ 업데이트 완료!"
echo "다음 단계: ./scripts/main-03-status.sh (상태 확인)"
