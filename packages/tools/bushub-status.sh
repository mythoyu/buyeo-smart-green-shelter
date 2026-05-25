#!/bin/bash
set -e

echo "🐳 Docker 컨테이너 상태:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🖥️ Network Control API(systemd) 상태:"
echo -n "자동 시작: "
systemctl is-enabled bushub-network-control-api.service || true
systemctl status bushub-network-control-api --no-pager -l || true


