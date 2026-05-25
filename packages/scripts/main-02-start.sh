#!/bin/bash
set -e

echo "🚀 2단계: Bushub 서비스 시작..."

# 서비스 시작
echo "🔄 서비스 시작..."
sudo systemctl start bushub-mongodb
sudo systemctl start bushub-backend
sudo systemctl start bushub-frontend
sudo systemctl start bushub-nginx
sudo systemctl start bushub-network-control-api

# 서비스 상태 확인
echo "📊 서비스 상태 확인..."
sudo systemctl status bushub-mongodb --no-pager
sudo systemctl status bushub-backend --no-pager
sudo systemctl status bushub-frontend --no-pager
sudo systemctl status bushub-nginx --no-pager
sudo systemctl status bushub-network-control-api --no-pager

echo "✅ 2단계: 서비스 시작 완료!"
echo "🌐 웹 인터페이스: http://localhost"
echo "📚 API 문서: http://localhost:3001/docs"
echo "🔍 상태 확인: sudo systemctl status bushub-*"
