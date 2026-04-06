#!/bin/bash
# Compose 스택 제거 + (선택) 볼륨 삭제. 레거시 systemd bushub-* 유닛이 있으면 함께 정리합니다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_FILE="${BUSHUB_COMPOSE_FILE:-docker-compose.integrated.yml}"

echo "🗑️ Bushub Docker 스택 제거"
if [ -f "$COMPOSE_FILE" ]; then
  read -r -p "DB 볼륨(db_data 등)까지 삭제할까요? (y/N): " reply
  if [[ ${reply:-N} =~ ^[Yy]$ ]]; then
    docker compose -f "$COMPOSE_FILE" down -v
    echo "✅ compose down -v 완료"
  else
    docker compose -f "$COMPOSE_FILE" down
    echo "✅ compose down 완료 (볼륨 유지)"
  fi
else
  echo "ℹ️  $COMPOSE_FILE 없음 — compose down 생략"
fi

echo "🧹 레거시 systemd 유닛 정리 (있을 경우만)..."
sudo rm -f /etc/systemd/system/bushub-*.service 2>/dev/null || true
sudo systemctl daemon-reload 2>/dev/null || true

echo "ℹ️  예전 /opt/bushub 호스트 설치가 있다면 수동으로 삭제하세요."
echo "✅ 제거 절차 완료"
