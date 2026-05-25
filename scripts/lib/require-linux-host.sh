# shellcheck shell=bash
# Ubuntu 현장 PC(Linux + systemd) 전용 가드.
# 직접 source 보다 scripts/lib/field-guard.sh 를 쓰는 것을 권장합니다.

require_linux_host() {
  local uname_s
  uname_s="$(uname -s 2>/dev/null || echo unknown)"

  case "${OSTYPE:-}" in
    msys*|cygwin*)
      echo "❌ Windows(Git Bash/MSYS)에서는 실행할 수 없습니다." >&2
      echo "   Ubuntu 현장 PC에서 직접 실행하거나, WSL/SSH로 해당 장비에 접속하세요." >&2
      return 1
      ;;
  esac

  case "$uname_s" in
    Linux) ;;
    MINGW*|MSYS*|CYGWIN*)
      echo "❌ Windows 환경($uname_s)에서는 실행할 수 없습니다." >&2
      echo "   Ubuntu 현장 PC에서 직접 실행하거나, WSL/SSH로 해당 장비에 접속하세요." >&2
      return 1
      ;;
    *)
      echo "❌ 지원하지 않는 OS입니다 (Ubuntu 현장 PC 전용): $uname_s" >&2
      return 1
      ;;
  esac

  if [ ! -f /etc/os-release ]; then
    echo "❌ Linux 호스트(/etc/os-release)가 아닙니다." >&2
    return 1
  fi

  if ! command -v systemctl >/dev/null 2>&1; then
    echo "❌ systemd(systemctl)가 없습니다. Ubuntu 현장 PC에서 실행하세요." >&2
    return 1
  fi

  return 0
}
