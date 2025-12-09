#!/bin/bash
set -e

SINCE="${1:-10m}"

echo "📜 Backend 로그 (since=$SINCE):"
docker logs --since="$SINCE" bushub-backend 2>/dev/null | tail -n 500 || echo "(backend 컨테이너 로그 없음)"

echo "\n📜 Frontend 로그 (since=$SINCE):"
docker logs --since="$SINCE" bushub-frontend 2>/dev/null | tail -n 200 || echo "(frontend 컨테이너 로그 없음)"

echo "\n📜 Network Control API(systemd) 로그:"
journalctl -u bushub-network-control-api -n 200 --no-pager || true


