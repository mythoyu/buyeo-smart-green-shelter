#!/bin/bash
set -e

echo "📋 4단계: USB에서 로그 확인..."

echo "=== MongoDB 로그 ==="
sudo journalctl -u bushub-mongodb --no-pager -n 20

echo ""
echo "=== Nginx 로그 ==="
sudo journalctl -u bushub-nginx --no-pager -n 20

echo ""
echo "=== Backend 로그 ==="
sudo journalctl -u bushub-backend --no-pager -n 20

echo ""
echo "=== Frontend 로그 ==="
sudo journalctl -u bushub-frontend --no-pager -n 20

echo ""
echo "=== 파일 로그 ==="
if [ -f "/opt/bushub/logs/mongodb.log" ]; then
    echo "MongoDB 파일 로그 (마지막 10줄):"
    sudo tail -n 10 /opt/bushub/logs/mongodb.log
fi

echo ""
echo "=== Nginx 액세스 로그 ==="
if [ -f "/var/log/nginx/access.log" ]; then
    echo "Nginx 액세스 로그 (마지막 10줄):"
    sudo tail -n 10 /var/log/nginx/access.log
fi

echo ""
echo "=== Nginx 에러 로그 ==="
if [ -f "/var/log/nginx/error.log" ]; then
    echo "Nginx 에러 로그 (마지막 10줄):"
    sudo tail -n 10 /var/log/nginx/error.log
fi

echo "✅ 4단계: 로그 확인 완료!"
echo "다음 단계: ./scripts/ops-stop.sh (중지) 또는 ./scripts/ops-restart.sh (재시작)"
