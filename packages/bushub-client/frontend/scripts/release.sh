#!/bin/bash

# 릴리즈 스크립트
# 사용법: ./scripts/release.sh [버전]

set -e

# 버전 확인
if [ -z "$1" ]; then
    echo "사용법: $0 [버전] (예: 1.0.1)"
    exit 1
fi

VERSION=$1
TAG="v$VERSION"

echo "🚀 릴리즈 준비 중: $TAG"

# 1. package.json 버전 업데이트
echo "📝 package.json 버전 업데이트..."
npm version $VERSION --no-git-tag-version

# 2. 변경사항 커밋
echo "💾 변경사항 커밋..."
git add package.json
git commit -m "chore: bump version to $VERSION"

# 3. Git 태그 생성
echo "🏷️ Git 태그 생성..."
git tag $TAG

# 4. 푸시
echo "📤 원격 저장소에 푸시..."
git push origin main
git push origin $TAG

# 5. 빌드 테스트
echo "🔨 빌드 테스트..."
pnpm build

echo "✅ 릴리즈 완료: $TAG"
echo "📋 버전 정보가 '$TAG'로 표시됩니다."
