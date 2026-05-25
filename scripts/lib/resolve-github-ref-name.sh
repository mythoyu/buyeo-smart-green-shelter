#!/usr/bin/env bash
# GITHUB_REF_NAME 해석 (bushub-backend/frontend 이미지 태그)
# shellcheck disable=SC2034
resolve_github_ref_name() {
  if [ -n "${GITHUB_REF_NAME:-}" ]; then
    export GITHUB_REF_NAME
    echo "🔖 이미지 태그 (지정): $GITHUB_REF_NAME"
    return 0
  fi

  local git_tag=""
  if command -v git >/dev/null 2>&1 && [ -d "${REPO_ROOT:-.}/.git" ]; then
    git_tag="$(git -C "${REPO_ROOT}" describe --tags --exact-match HEAD 2>/dev/null || true)"
    if [ -z "$git_tag" ]; then
      git_tag="$(git -C "${REPO_ROOT}" describe --tags --abbrev=0 2>/dev/null || true)"
    fi
  fi
  if [ -n "$git_tag" ]; then
    export GITHUB_REF_NAME="$git_tag"
    echo "🔖 이미지 태그 (git): $GITHUB_REF_NAME"
    return 0
  fi

  local images_dir="${REPO_ROOT}/packages/docker-images"
  local latest_tar=""
  if [ -d "$images_dir" ]; then
    latest_tar="$(ls -t "$images_dir"/bushub-backend.*.tar 2>/dev/null | head -n1 || true)"
  fi
  if [ -n "$latest_tar" ]; then
    local tag_from_file
    tag_from_file="$(printf '%s\n' "$latest_tar" | sed -n 's/.*bushub-backend\.\(.*\)\.tar/\1/p')"
    if [ -n "$tag_from_file" ]; then
      export GITHUB_REF_NAME="$tag_from_file"
      echo "🔖 이미지 태그 (tar): $GITHUB_REF_NAME"
      return 0
    fi
  fi

  export GITHUB_REF_NAME="${GITHUB_REF_NAME:-latest}"
  echo "🔖 이미지 태그 (기본): $GITHUB_REF_NAME"
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  REPO_ROOT="${REPO_ROOT:-$(cd "$(dirname "$0")/../.." && pwd)}"
  resolve_github_ref_name
  printf '%s\n' "$GITHUB_REF_NAME"
fi
