#!/bin/bash
# =================================================================
# MongoDB 개발환경 시작 스크립트
# =================================================================
#
# 기존 db 폴더의 데이터를 사용하여 MongoDB를 Docker로 실행합니다.
#
# 사용법:
# ./start-mongodb-dev.sh
#
# 중지:
# ./stop-mongodb-dev.sh
#

echo "🚀 MongoDB 개발환경 시작..."
echo "================================="

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📂 작업 디렉토리: $SCRIPT_DIR"

# db 폴더 존재 확인
if [ ! -d "$SCRIPT_DIR/db/data" ]; then
    echo "❌ db/data 폴더가 없습니다. 생성합니다..."
    mkdir -p "$SCRIPT_DIR/db/data"
fi

# 기존 MongoDB 컨테이너 확인 및 정리
echo "🔍 기존 MongoDB 컨테이너 확인..."
if docker ps -a | grep -q "mongodb-dev"; then
    echo "⚠️  기존 mongodb-dev 컨테이너를 중지하고 제거합니다..."
    docker stop mongodb-dev 2>/dev/null || true
    docker rm mongodb-dev 2>/dev/null || true
fi

# MongoDB 컨테이너 실행 (인증 없음 - 개발용)
echo "🐳 MongoDB 컨테이너 시작..."
docker run -d \
    --name mongodb-dev \
    -p 27017:27017 \
    -v "$SCRIPT_DIR/db/data:/data/db" \
    -v "$SCRIPT_DIR/logs:/var/log/mongodb" \
    --restart unless-stopped \
    mongo:6.0.15 --noauth

# 컨테이너 시작 대기
echo "⏳ MongoDB 시작 대기중..."
sleep 5

# 컨테이너 상태 확인
if docker ps | grep -q "mongodb-dev"; then
    echo "✅ MongoDB 개발환경이 성공적으로 시작되었습니다!"
    echo ""
    echo "========================================="
    echo "📋 연결 정보:"
    echo "  - MongoDB URI: mongodb://localhost:27017/bushub_client"
    echo "  - 포트: 27017"
    echo "  - 인증: 없음 (개발용)"
    echo "  - 데이터베이스: bushub_client"
    echo ""
    echo "🔧 유용한 명령어:"
    echo "  - 로그 확인: docker logs mongodb-dev"
    echo "  - MongoDB Shell: docker exec -it mongodb-dev mongosh"
    echo "  - 컨테이너 중지: docker stop mongodb-dev"
    echo "  - 컨테이너 제거: docker rm mongodb-dev"
    echo ""
    echo "📂 데이터 위치: $SCRIPT_DIR/db/data"
    echo "📝 로그 위치: $SCRIPT_DIR/logs"
    echo "========================================="
else
    echo "❌ MongoDB 시작에 실패했습니다."
    echo "🔍 로그를 확인해보세요: docker logs mongodb-dev"
    exit 1
fi
