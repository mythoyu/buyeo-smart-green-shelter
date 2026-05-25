#!/bin/bash
set -e

echo "🚀 1단계: USB에서 시스템 설치 시작..."

# USB 루트 디렉토리에서 실행하세요

# 시스템 디렉토리 생성
echo "📁 시스템 디렉토리 생성..."
sudo mkdir -p /opt/bushub/{frontend,backend,mongodb,nginx,logs,data,config}

# 파일 복사
echo "📋 파일 복사..."
sudo cp -r frontend/* /opt/bushub/frontend/
sudo cp -r backend/* /opt/bushub/backend/
sudo cp -r mongodb/* /opt/bushub/mongodb/
sudo cp -r nginx/* /opt/bushub/nginx/
sudo cp -r config/* /opt/bushub/config/

# 권한 설정
echo "🔐 권한 설정..."
sudo chmod +x /opt/bushub/mongodb/*
sudo chmod +x /opt/bushub/nginx/*
sudo chown -R 999:999 /opt/bushub/data  # MongoDB 권한
sudo chown -R root:root /opt/bushub/frontend
sudo chown -R root:root /opt/bushub/backend

# systemd 서비스 생성
echo "⚙️ systemd 서비스 생성..."
sudo cp scripts/bushub-mongodb.service /etc/systemd/system/
sudo cp scripts/bushub-nginx.service /etc/systemd/system/
sudo cp scripts/bushub-backend.service /etc/systemd/system/
sudo cp scripts/bushub-frontend.service /etc/systemd/system/
sudo cp scripts/bushub-network-control-api.service /etc/systemd/system/

# 서비스 활성화
echo "🔄 서비스 활성화..."
sudo systemctl daemon-reload
sudo systemctl enable bushub-mongodb
sudo systemctl enable bushub-nginx
sudo systemctl enable bushub-backend
sudo systemctl enable bushub-frontend
sudo systemctl enable bushub-network-control-api

echo "✅ 1단계: 설치 완료!"
echo "다음 단계: ./scripts/main-02-start.sh"
