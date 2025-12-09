#!/bin/bash

echo "🧹 Bushub Client 모든 리소스를 정리합니다..."
echo "=========================================="

# 사용자 확인
echo "⚠️ 이 작업은 다음을 삭제합니다:"
echo "   - 모든 bushub- 컨테이너"
echo "   - 모든 bushub- 이미지"
echo "   - 모든 bushub- 볼륨"
echo "   - bushub-network"
echo ""

read -p "정말로 모든 리소스를 정리하시겠습니까? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🛑 모든 컨테이너를 중지합니다..."
    docker stop $(docker ps -q --filter "name=bushub-") 2>/dev/null || echo "실행 중인 컨테이너가 없습니다."
    
    echo "🗑️ 모든 컨테이너를 삭제합니다..."
    docker rm $(docker ps -aq --filter "name=bushub-") 2>/dev/null || echo "삭제할 컨테이너가 없습니다."
    
    echo "🗑️ 모든 이미지를 삭제합니다..."
    docker rmi $(docker images -q --filter "reference=bushub-*") 2>/dev/null || echo "삭제할 이미지가 없습니다."
    
    echo "🗑️ 모든 볼륨을 삭제합니다..."
    docker volume rm $(docker volume ls -q --filter "name=bushub-") 2>/dev/null || echo "삭제할 볼륨이 없습니다."
    
    echo "🗑️ 네트워크를 삭제합니다..."
    docker network rm bushub-network 2>/dev/null || echo "삭제할 네트워크가 없습니다."
    
    echo "🧹 사용하지 않는 리소스를 정리합니다..."
    docker system prune -f
    
    echo ""
    echo "✅ 모든 리소스가 정리되었습니다!"
else
    echo "❌ 정리가 취소되었습니다."
fi

echo ""
echo "📋 남은 리소스 확인:"
echo "📦 컨테이너:"
docker ps -a --filter "name=bushub-" --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo ""
echo "🖼️ 이미지:"
docker images --filter "reference=bushub-*" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "💾 볼륨:"
docker volume ls --filter "name=bushub-" --format "table {{.Name}}\t{{.Driver}}"

echo ""
echo "🌐 네트워크:"
docker network ls --filter "name=bushub" --format "table {{.Name}}\t{{.Driver}}\t{{.Scope}}" 