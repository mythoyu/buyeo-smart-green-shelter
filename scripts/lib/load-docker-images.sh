#!/usr/bin/env bash
# infra Docker 이미지 tar 로드 (mongo, nginx, node — 현장 오프라인용)
# bushub-backend/frontend tar 는 기본 제외(앱은 post-ports 에서 소스 빌드).
#
# 탐색 순서 (각 디렉터리에서 infra-*.tar, 그 외 bushub-* 제외 *.tar):
#   1) BUSHUB_DOCKER_IMAGES_DIR
#   2) $REPO_ROOT/../docker-images   (USB: 소스 형제 폴더)
#   3) $REPO_ROOT/docker-images
#
# 사용:
#   REPO_ROOT=/path/to/repo ./scripts/lib/load-docker-images.sh
#   ./scripts/lib/load-docker-images.sh --download-if-missing   # install(핫스팟)용
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
DOWNLOAD_IF_MISSING=0
INCLUDE_APP_TARS=0

usage() {
  echo "사용법: $0 [--download-if-missing] [--include-app-tars] [-h|--help]"
  echo ""
  echo "  --download-if-missing  로컬 tar 없고 mongo:6.0.15 없으면 GitHub Release 에서 infra tar 다운로드"
  echo "  --include-app-tars     bushub-backend/frontend *.tar 도 docker load (레거시)"
}

while [ $# -gt 0 ]; do
  case "$1" in
    --download-if-missing)
      DOWNLOAD_IF_MISSING=1
      ;;
    --include-app-tars)
      INCLUDE_APP_TARS=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 인자: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

# shellcheck source=scripts/lib/resolve-github-ref-name.sh
source "$_LIB_DIR/resolve-github-ref-name.sh"

infra_image_present() {
  docker image inspect mongo:6.0.15 >/dev/null 2>&1 \
    && docker image inspect nginx:1.28.0 >/dev/null 2>&1
}

collect_image_dirs() {
  local -n _out=$1
  _out=()
  if [ -n "${BUSHUB_DOCKER_IMAGES_DIR:-}" ]; then
    _out+=("$BUSHUB_DOCKER_IMAGES_DIR")
  fi
  _out+=("$REPO_ROOT/../docker-images")
  _out+=("$REPO_ROOT/packages/docker-images")
}

should_load_tar() {
  local base="$1"
  if [ "$INCLUDE_APP_TARS" -eq 1 ]; then
    return 0
  fi
  case "$base" in
    bushub-backend.*.tar|bushub-frontend.*.tar)
      return 1
      ;;
    *)
      return 0
      ;;
  esac
}

load_tars_from_dirs() {
  local loaded=0
  local -a dirs=()
  collect_image_dirs dirs
  local dir base seen="|"

  for dir in "${dirs[@]}"; do
    [ -d "$dir" ] || continue
    echo "📂 docker-images 탐색: $dir"
    shopt -s nullglob
    for tar_path in "$dir"/*.tar "$dir"/*.tar.gz; do
      [ -f "$tar_path" ] || continue
      base="$(basename "$tar_path")"
      if ! should_load_tar "$base"; then
        echo "   ⏭️  앱 tar 스킵 (소스 빌드): $base"
        continue
      fi
      case "$seen" in
        *"|$tar_path|"*) continue ;;
      esac
      seen="${seen}${tar_path}|"
      echo "   📦 로드: $tar_path"
      docker load -i "$tar_path"
      loaded=1
    done
    shopt -u nullglob
  done
  return "$((1 - loaded))"
}

download_infra_from_release() {
  local tag="${BUSHUB_INFRA_RELEASE_TAG:-${GITHUB_REF_NAME:-}}"
  if [ -z "$tag" ]; then
    tag="$(git -C "$REPO_ROOT" describe --tags --abbrev=0 2>/dev/null || true)"
  fi
  if [ -z "$tag" ]; then
    echo "⚠️  Release 태그를 알 수 없습니다. BUSHUB_INFRA_RELEASE_TAG 또는 git tag 를 설정하세요." >&2
    return 1
  fi

  local dest="$REPO_ROOT/packages/docker-images"
  mkdir -p "$dest"
  local asset="infra-docker-images.tar"

  echo "🌐 Release 에서 infra 이미지 다운로드: $tag ($asset)"
  if command -v gh >/dev/null 2>&1; then
    (cd "$REPO_ROOT" && gh release download "$tag" -p "$asset" -D "$dest" --clobber)
    return 0
  fi

  local slug=""
  slug="$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null | sed -E 's#.*github.com[:/](.+/.+?)(\.git)?$#\1#' || true)"
  if [ -z "$slug" ]; then
    echo "❌ gh CLI 없음, origin remote 로 repo slug 를 알 수 없습니다." >&2
    return 1
  fi
  local url="https://github.com/${slug}/releases/download/${tag}/${asset}"
  echo "   curl: $url"
  curl -fsSL -o "$dest/$asset" "$url"
}

echo "=========================================="
echo " Docker infra 이미지 로드"
echo " REPO_ROOT=$REPO_ROOT"
echo "=========================================="

if ! command -v docker >/dev/null 2>&1; then
  echo "❌ docker 가 없습니다. install 단계(setup-host)를 먼저 실행하세요." >&2
  exit 1
fi

if infra_image_present; then
  echo "✅ mongo:6.0.15, nginx:1.28.0 이미 로컬에 있습니다."
else
  load_tars_from_dirs || true
fi

if ! infra_image_present && [ "$DOWNLOAD_IF_MISSING" -eq 1 ]; then
  download_infra_from_release || true
  load_tars_from_dirs || true
fi

if infra_image_present; then
  echo "✅ infra 이미지 준비 완료"
  if docker image inspect node:20-alpine >/dev/null 2>&1; then
    echo "   (node:20-alpine — 현장 docker build 용)"
  else
    echo "ℹ️  node:20-alpine 없음 — post-ports 빌드 시 네트워크 또는 infra tar 에 포함 필요"
  fi
  exit 0
fi

echo "❌ mongo:6.0.15 또는 nginx:1.28.0 이 없습니다." >&2
echo "   USB ../docker-images/infra-docker-images.tar 또는 packages/docker-images/ 에 두세요." >&2
echo "   핫스팟: $0 --download-if-missing" >&2
exit 1
