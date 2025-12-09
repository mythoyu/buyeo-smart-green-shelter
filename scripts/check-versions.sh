#!/usr/bin/env bash
set -euo pipefail

ROOT_VER=$(node -p "require('./package.json').version")
FE_VER=$(node -p "require('./packages/bushub-client/frontend/package.json').version")
BE_VER=$(node -p "require('./packages/bushub-client/backend/package.json').version")

echo "Root:     ${ROOT_VER}"
echo "Frontend: ${FE_VER}"
echo "Backend:  ${BE_VER}"

if [[ "${ROOT_VER}" == "${FE_VER}" && "${ROOT_VER}" == "${BE_VER}" ]]; then
  echo "✅ 모든 버전이 일치합니다."
  exit 0
else
  echo "❌ 버전이 일치하지 않습니다. sync-versions.sh를 실행하세요." >&2
  exit 2
fi


