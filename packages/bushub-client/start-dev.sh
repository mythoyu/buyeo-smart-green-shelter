#!/bin/bash

# 개발환경 실행 스크립트
echo "🚀 개발환경 시작 중..."

# Docker Compose로 개발환경 실행
docker compose -f docker-compose.dev.yml up --build -d

echo "✅ 개발환경이 시작되었습니다!"
echo ""
echo "📱 접근 방법:"
echo "  Frontend (Vite): http://localhost:4173"
echo "  Backend API:     http://localhost:3000"
echo "  Nginx 프록시:    http://localhost:8081"
echo "  MongoDB:         localhost:27018"
echo ""
echo "🔧 관리 명령어:"
echo "  로그 확인:       docker compose -f docker-compose.dev.yml logs -f"
echo "  중지:           docker compose -f docker-compose.dev.yml down"
echo "  재시작:         docker compose -f docker-compose.dev.yml restart"
