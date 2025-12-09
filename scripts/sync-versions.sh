#!/usr/bin/env bash
set -euo pipefail

# 루트 버전을 하위 패키지에 반영
ROOT_VER=$(node -p "require('./package.json').version")
echo "🔗 루트 버전: ${ROOT_VER}"

for PKG in packages/bushub-client/frontend/package.json packages/bushub-client/backend/package.json; do
  if [[ -f "$PKG" ]]; then
    echo "📝 동기화: $PKG -> ${ROOT_VER}"
    node -e "const fs=require('fs');const p='${PKG}';const j=JSON.parse(fs.readFileSync(p));j.version='${ROOT_VER}';fs.writeFileSync(p, JSON.stringify(j, null, 2)+'\\n')"
  fi
done

echo "✅ 버전 동기화 완료"


