#!/bin/bash
set -e

echo "📊 3단계: USB에서 서비스 상태 확인..."

echo "=== 서비스 상태 ==="
sudo systemctl status bushub-mongodb --no-pager -l
echo ""
sudo systemctl status bushub-nginx --no-pager -l
echo ""
sudo systemctl status bushub-backend --no-pager -l
echo ""
sudo systemctl status bushub-frontend --no-pager -l

echo ""
echo "=== 포트 확인 ==="
netstat -tlnp | grep -E ":(27017|80|3000|8080)" || echo "포트가 열려있지 않습니다."

echo ""
echo "=== 프로세스 확인 ==="
ps aux | grep -E "(mongod|nginx|node|python3)" | grep -v grep || echo "프로세스가 실행되지 않았습니다."

echo ""
echo "=== 웹 접속 테스트 ==="
if curl -s http://localhost > /dev/null; then
    echo "✅ 웹 접속 성공: http://localhost"
else
    echo "❌ 웹 접속 실패"
fi

if curl -s http://localhost/api/health > /dev/null; then
    echo "✅ API 접속 성공: http://localhost/api/health"
else
    echo "❌ API 접속 실패"
fi

echo "✅ 3단계: 상태 확인 완료!"
echo "다음 단계: ./scripts/main-04-logs.sh (로그 확인)"
