#!/usr/bin/env bash
# 루트 디렉토리에서
# ./scripts/release.sh <version>
#
# 예시
# ./scripts/release.sh 1.0.0
#
set -euo pipefail

if [[ -z "${1-}" ]]; then
  echo "사용법: $0 <version>  (예: 1.0.1)" >&2
  exit 1
fi

VERSION="$1"
TAG="v${VERSION}"

# 0) 안전장치: 워킹트리 깨끗한지 확인
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ 커밋되지 않은 변경사항이 있습니다. 커밋 후 다시 실행하세요." >&2
  exit 1
fi

# 1) 중복 태그 확인
if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "❌ 이미 존재하는 태그입니다: ${TAG}" >&2
  exit 1
fi

echo "🚀 릴리즈 준비: ${TAG}"

# 2) 빌드 테스트 (에러 시 중단)
echo "🔨 빌드 테스트 시작..."

# Frontend 빌드 테스트
echo "📦 Frontend 빌드 테스트..."
cd bushub-client/frontend
if ! pnpm build; then
  echo "❌ Frontend 빌드 실패. 릴리즈를 중단합니다." >&2
  exit 1
fi
cd - > /dev/null

# Backend 빌드 테스트
echo "📦 Backend 빌드 테스트..."
cd bushub-client/backend
if ! pnpm build:production; then
  echo "❌ Backend 빌드 실패. 릴리즈를 중단합니다." >&2
  exit 1
fi
cd - > /dev/null

echo "✅ 모든 빌드 테스트 통과"

# 3) 루트 버전 갱신 (태그와 동일)
echo "📝 루트 package.json 버전 업데이트 -> ${VERSION}"
node -e "const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p));j.version='${VERSION}';fs.writeFileSync(p, JSON.stringify(j, null, 2)+'\n')"

# 4) 하위 패키지 버전 동기화
for PKG in bushub-client/frontend/package.json bushub-client/backend/package.json; do
  if [[ -f "$PKG" ]]; then
    echo "📝 동기화: $PKG -> ${VERSION}"
    node -e "const fs=require('fs');const p='${PKG}';const j=JSON.parse(fs.readFileSync(p));j.version='${VERSION}';fs.writeFileSync(p, JSON.stringify(j, null, 2)+'\n')"
  fi
done

# 5) 커밋 및 푸시 (user.name / user.email 은 로컬·전역 Git 설정 사용)
echo "💾 커밋 & 푸시"
git add package.json bushub-client/frontend/package.json bushub-client/backend/package.json || true
git commit -m "chore(release): bump version to ${VERSION}"
git push origin "$(git rev-parse --abbrev-ref HEAD)"

# 6) 태그 생성 및 푸시
echo "🏷️ 태그 생성: ${TAG}"
git tag -a "${TAG}" -m "release ${TAG}"
git push origin "${TAG}"

echo "✅ 릴리즈 완료: ${TAG}"
echo ""
echo "📌 GitHub: 태그 푸시 시 Release가 자동 생성됩니다(아티팩트 없음)."
echo "📍 현장: Git 으로 ${TAG} 체크아웃한 뒤 모노레포 루트에서 소스 기준으로 이미지 빌드·기동"
echo "   ./scripts/install-field.sh   (zenity 가능 시 단계 안내 → udev → rebuild-and-up)"
echo "   (레지스트리(GHCR)에 앱 이미지를 올리지 않습니다. 현장에서 docker build 로 만듭니다.)"

