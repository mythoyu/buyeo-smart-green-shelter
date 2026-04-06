#!/bin/bash
set -e

echo "🐳 Docker 컨테이너 상태:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"


