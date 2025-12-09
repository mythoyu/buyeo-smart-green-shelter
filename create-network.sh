#!/bin/bash

echo "🌐 Bushub Client Docker 네트워크를 생성합니다..."
echo "=========================================="

# 기존 네트워크 확인
echo "📋 기존 네트워크 목록:"
docker network ls --filter "name=bushub" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}\t{{.IPAM.Config}}"

echo ""
echo "🔧 bushub-network 생성 중..."

# 네트워크 생성 (이미 존재하면 무시)
if docker network create bushub-network 2>/dev/null; then
    echo "✅ bushub-network가 성공적으로 생성되었습니다!"
else
    echo "ℹ️ bushub-network가 이미 존재합니다."
fi

echo ""
echo "📊 생성된 네트워크 정보:"
docker network inspect bushub-network --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}\t{{.IPAM.Config}}"

echo ""
echo "🔗 네트워크 세부 정보:"
docker network inspect bushub-network --format "{{.Name}}: {{.Driver}} 네트워크 ({{.Scope}}) - {{.IPAM.Config}}"

echo ""
echo "🎯 이제 다른 서비스들을 실행할 수 있습니다!"
echo "   예: ./start-db.sh, ./start-backend.sh 등" 