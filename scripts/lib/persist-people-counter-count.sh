#!/usr/bin/env bash
# 레포 루트 .env 에 PEOPLE_COUNTER_COUNT 저장 (post-ports / compose 재기동 시 유지)
set -euo pipefail

# shellcheck source=field-guard.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/field-guard.sh"

REPO_ROOT="${1:?repo root required}"
COUNT="${2:?count required}"

if ! [[ "$COUNT" =~ ^[0-3]$ ]]; then
  echo "❌ PEOPLE_COUNTER_COUNT는 0~3 이어야 합니다: $COUNT" >&2
  exit 1
fi

ENV_FILE="$REPO_ROOT/.env"
touch "$ENV_FILE"
if grep -qE '^[[:space:]]*PEOPLE_COUNTER_COUNT=' "$ENV_FILE" 2>/dev/null; then
  sed -i "s/^[[:space:]]*PEOPLE_COUNTER_COUNT=.*/PEOPLE_COUNTER_COUNT=$COUNT/" "$ENV_FILE"
else
  printf '\n# install-field ports 마법사에서 설정\nPEOPLE_COUNTER_COUNT=%s\n' "$COUNT" >>"$ENV_FILE"
fi
echo "📝 $ENV_FILE → PEOPLE_COUNTER_COUNT=$COUNT"
