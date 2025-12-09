#!/bin/bash
# =================================================================
# Bushub SmartCity USB 설치 (완전 오프라인)
# =================================================================
# 이 스크립트는 USB에 모든 파일이 포함되어 있어 인터넷 연결이 불필요합니다.

set -e

echo "🚀 Bushub SmartCity USB 설치"
echo "=============================="
echo "ℹ️ 완전 오프라인 설치 - 인터넷 연결 불필요"
echo ""

# 현재 디렉터리 확인 (USB에 압축 해제된 위치)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "📁 설치 디렉터리: $SCRIPT_DIR"

# tools 디렉터리 권한 보강 (USB_ROOT/tools 기준)
chmod 755 "$SCRIPT_DIR/tools" 2>/dev/null || true
chmod +x "$SCRIPT_DIR/tools"/*.sh 2>/dev/null || true

# packages/bushub-client 디렉터리로 이동
cd "$SCRIPT_DIR/packages/bushub-client"

# 디렉터리 존재 확인
if [ ! -f "deploy-hybrid.sh" ]; then
    echo "❌ deploy-hybrid.sh 파일을 찾을 수 없습니다."
    echo "ℹ️ USB에 올바르게 압축 해제되었는지 확인하세요."
    echo "📁 현재 디렉터리: $(pwd)"
    echo "📋 디렉터리 내용:"
    ls -la
    exit 1
fi

# 스크립트 실행 권한 부여
echo "🔧 실행 권한 설정 중..."
chmod +x *.sh

# Docker 상태 확인
echo "🐳 Docker 상태 확인 중..."
docker ps -a || echo "Docker가 설치되지 않았거나 실행 중이지 않습니다."

# 배포 실행
echo "🚀 배포 실행 중..."
sudo bash ./deploy-hybrid.sh

echo "✅ 설치 완료! http://localhost 에서 접속하세요."
