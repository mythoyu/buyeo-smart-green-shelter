#!/bin/bash
set -e

echo "🚀 Network Control API 서비스 설치 시작..."

# network-control-api 디렉토리로 이동
cd network-control-api

# 현재 디렉토리 확인
if [ ! -f "package.json" ]; then
    echo "❌ package.json을 찾을 수 없습니다. network-control-api 디렉토리가 존재하지 않습니다."
    exit 1
fi

# 1. 의존성 설치
echo "📦 의존성 설치..."
pnpm install

# 2. 빌드
echo "🔨 프로덕션 빌드..."
pnpm run build

# 3. systemd 서비스 파일 복사
echo "⚙️ systemd 서비스 설치..."
sudo cp ../scripts/bushub-network-control-api.service /etc/systemd/system/

# 4. 서비스 활성화
echo "🔄 서비스 활성화..."
sudo systemctl daemon-reload
sudo systemctl enable bushub-network-control-api

# 5. 서비스 시작
echo "🚀 서비스 시작..."
sudo systemctl start bushub-network-control-api

# 6. 상태 확인
echo "📊 서비스 상태 확인..."
sudo systemctl status bushub-network-control-api --no-pager

echo "✅ Network Control API 서비스 설치 완료!"
echo "🌐 API 엔드포인트: http://localhost:3001"
echo "📚 API 문서: http://localhost:3001/docs"
echo "🔍 상태 확인: sudo systemctl status bushub-network-control-api"
echo "📝 로그 확인: sudo journalctl -u bushub-network-control-api -f"
