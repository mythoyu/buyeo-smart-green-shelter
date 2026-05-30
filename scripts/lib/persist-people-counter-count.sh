#!/usr/bin/env bash
# 레포 루트 .env — PEOPLE_COUNTER_COUNT 등 (Mongo/JWT 는 compose YAML 고정)
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
bash "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/ensure-field-env.sh"
if grep -qE '^[[:space:]]*PEOPLE_COUNTER_COUNT=' "$ENV_FILE" 2>/dev/null; then
  sed -i "s/^[[:space:]]*PEOPLE_COUNTER_COUNT=.*/PEOPLE_COUNTER_COUNT=$COUNT/" "$ENV_FILE"
else
  printf '\n# install-field ports 마법사에서 설정\nPEOPLE_COUNTER_COUNT=%s\n' "$COUNT" >>"$ENV_FILE"
fi
echo "📝 $ENV_FILE → PEOPLE_COUNTER_COUNT=$COUNT"
