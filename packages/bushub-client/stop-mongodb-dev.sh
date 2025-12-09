#!/bin/bash
# =================================================================
# MongoDB 개발환경 중지 스크립트
# =================================================================
#
# MongoDB 개발 컨테이너를 중지하고 제거합니다.
#
# 사용법:
# ./stop-mongodb-dev.sh
#
# 옵션:
# ./stop-mongodb-dev.sh --remove-data  # 데이터까지 삭제
#

echo "🛑 MongoDB 개발환경 중지..."
echo "================================="

# 옵션 확인
REMOVE_DATA=false
if [ "$1" = "--remove-data" ]; then
    REMOVE_DATA=true
fi

# MongoDB 컨테이너 중지
echo "⏹️  MongoDB 컨테이너 중지 중..."
if docker ps | grep -q "mongodb-dev"; then
    docker stop mongodb-dev
    echo "✅ MongoDB 컨테이너가 중지되었습니다."
else
    echo "ℹ️  실행 중인 mongodb-dev 컨테이너가 없습니다."
fi

# MongoDB 컨테이너 제거
echo "🗑️  MongoDB 컨테이너 제거 중..."
if docker ps -a | grep -q "mongodb-dev"; then
    docker rm mongodb-dev
    echo "✅ MongoDB 컨테이너가 제거되었습니다."
else
    echo "ℹ️  제거할 mongodb-dev 컨테이너가 없습니다."
fi

# 데이터 삭제 옵션
if [ "$REMOVE_DATA" = true ]; then
    echo "⚠️  데이터 삭제를 진행합니다..."
    read -p "정말로 모든 MongoDB 데이터를 삭제하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
        if [ -d "$SCRIPT_DIR/db/data" ]; then
            rm -rf "$SCRIPT_DIR/db/data"
            mkdir -p "$SCRIPT_DIR/db/data"
            echo "🗑️  MongoDB 데이터가 삭제되었습니다."
        fi
        if [ -d "$SCRIPT_DIR/logs" ]; then
            rm -rf "$SCRIPT_DIR/logs"
            mkdir -p "$SCRIPT_DIR/logs"
            echo "🗑️  MongoDB 로그가 삭제되었습니다."
        fi
    else
        echo "ℹ️  데이터 삭제가 취소되었습니다."
    fi
fi

# 남은 MongoDB 관련 컨테이너 확인
MONGO_CONTAINERS=$(docker ps -a --filter "name=mongo" --format "{{.Names}}" | grep -v mongodb-dev || true)
if [ ! -z "$MONGO_CONTAINERS" ]; then
    echo ""
    echo "ℹ️  다른 MongoDB 관련 컨테이너가 있습니다:"
    echo "$MONGO_CONTAINERS"
fi

echo ""
echo "========================================="
echo "✅ MongoDB 개발환경 정리 완료!"
echo ""
echo "🔄 다시 시작하려면:"
echo "  ./start-mongodb-dev.sh"
echo ""
echo "📂 데이터 유지됨: $(dirname "${BASH_SOURCE[0]}")/db/data"
echo "========================================="

