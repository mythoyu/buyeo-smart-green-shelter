#!/bin/bash
# docker-compose.integrated.yml 만 기동 (이미지 tar 로드는 main-01 / deploy-hybrid 에서 수행)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
export BUSHUB_COMPOSE_MODE="${BUSHUB_COMPOSE_MODE:-integrated}"
exec "$SCRIPT_DIR/run-docker-stack.sh"
