#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.integrated.yml"

TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="diagnostics"
OUT_FILE="$OUT_DIR/bushub-$TS.tar.gz"

mkdir -p "$OUT_DIR"

tmpdir=$(mktemp -d)

(
  echo "# System" > "$tmpdir/sys.txt"
  { df -h; free -h; uptime; timedatectl; } >> "$tmpdir/sys.txt" 2>&1
  { ip a; nmcli dev status; } > "$tmpdir/network.txt" 2>&1 || true

  echo "# Docker" > "$tmpdir/docker.txt"
  { docker ps -a; docker images; docker compose -f "$COMPOSE_FILE" ps; } >> "$tmpdir/docker.txt" 2>&1 || true
  docker inspect bushub-backend > "$tmpdir/inspect-backend.json" 2>/dev/null || true
  docker inspect bushub-frontend > "$tmpdir/inspect-frontend.json" 2>/dev/null || true

  docker logs --since=30m bushub-backend > "$tmpdir/logs-backend.txt" 2>&1 || true
  docker logs --since=30m bushub-frontend > "$tmpdir/logs-frontend.txt" 2>&1 || true
  journalctl -u bushub-network-control-api -n 1000 --no-pager > "$tmpdir/logs-nca.txt" 2>&1 || true
) 

tar -czf "$OUT_FILE" -C "$tmpdir" .
rm -rf "$tmpdir"

echo "✅ 수집 완료: $OUT_FILE"


