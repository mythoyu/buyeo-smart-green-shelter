#!/bin/bash
set -e

echo "🗑️ USB에서 시스템 제거..."

# 서비스 중지 및 비활성화
echo "서비스 중지 및 비활성화..."
sudo systemctl stop bushub-frontend bushub-backend bushub-nginx bushub-mongodb
sudo systemctl disable bushub-frontend bushub-backend bushub-nginx bushub-mongodb

# 서비스 파일 제거
echo "서비스 파일 제거..."
sudo rm -f /etc/systemd/system/bushub-*.service
sudo systemctl daemon-reload

# 데이터 백업 확인
echo "데이터 백업 확인..."
if [ -d "/opt/bushub/data" ]; then
    echo "⚠️ 데이터 백업을 원하시면 수동으로 백업해주세요:"
    echo "sudo cp -r /opt/bushub/data /home/backup-$(date +%Y%m%d_%H%M%S)"
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "제거가 취소되었습니다."
        exit 1
    fi
fi

# 파일 제거
echo "파일 제거..."
sudo rm -rf /opt/bushub

echo "✅ 제거 완료!"
echo "시스템이 완전히 제거되었습니다."
