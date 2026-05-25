#!/usr/bin/env bash
# 현장(install-field) 스크립트 공통 — Ubuntu Linux 호스트에서만 실행 (Windows/Git Bash 거부)
# 사용: source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/field-guard.sh"
_GUARD_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=require-linux-host.sh
source "$_GUARD_DIR/require-linux-host.sh"
require_linux_host || exit 1
