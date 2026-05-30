#!/usr/bin/env bash
# 현장 .env — PEOPLE_COUNTER_COUNT 등 마법사 기록용 (Mongo/JWT 는 compose YAML 고정)
#
# 사용:
#   REPO_ROOT=/path/to/repo ./scripts/lib/ensure-field-env.sh
set -euo pipefail

# shellcheck source=field-guard.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/field-guard.sh"

SCRIPT_PATH="${BASH_SOURCE[0]}"
if [ -L "$SCRIPT_PATH" ]; then
  _LIB_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  _LIB_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi

REPO_ROOT="${REPO_ROOT:-$(cd "$_LIB_DIR/../.." && pwd)}"
TEMPLATE="$REPO_ROOT/.env.prod"
ENV_FILE="$REPO_ROOT/.env"

if [ ! -f "$TEMPLATE" ]; then
  echo "❌ .env.prod 없음: $TEMPLATE" >&2
  exit 1
fi

if [ -f "$ENV_FILE" ]; then
  exit 0
fi

{
  echo "# install-field — PEOPLE_COUNTER 등 (Mongo/JWT 는 compose YAML 고정, .env.prod 참고)"
  grep -E '^[[:space:]]*PEOPLE_COUNTER_COUNT=' "$TEMPLATE" | tail -n1 || echo "PEOPLE_COUNTER_COUNT=0"
} >"$ENV_FILE"

echo "📝 $ENV_FILE 생성 (PEOPLE_COUNTER_COUNT — ports 마법사에서 갱신)"
