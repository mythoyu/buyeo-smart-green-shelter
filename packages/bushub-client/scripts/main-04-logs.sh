#!/bin/bash
# 컨테이너 로그 (journalctl bushub-* 대신 docker logs)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

TAIL="${1:-40}"

echo "📋 4단계: 컨테이너 로그 (각 마지막 ${TAIL}줄)"

for c in bushub-db bushub-nginx bushub-backend bushub-frontend; do
  if docker ps -a --format '{{.Names}}' | grep -qx "$c"; then
    echo ""
    echo "=== $c ==="
    docker logs "$c" --tail "$TAIL" 2>&1 || true
  else
    echo ""
    echo "=== $c (없음) ==="
  fi
done

echo ""
echo "✅ 4단계 완료"
echo "   중지: ./scripts/ops-stop.sh | 재시작: ./scripts/ops-restart.sh"
