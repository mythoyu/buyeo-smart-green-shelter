#!/usr/bin/env bash
# 현장 NTP: systemd-timesyncd + packages/backend/scripts/ntp.sh
set -euo pipefail

# shellcheck source=../field-guard.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/field-guard.sh"

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi

ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
NTP_HELPER="$ROOT_DIR/packages/backend/scripts/ntp.sh"

# 현장 기본 NTP
FIELD_NTP_SERVER="129.6.15.28"

require_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    echo "❌ root 로 실행하지 말고, 일반 사용자에서 sudo 로 진행하세요." >&2
    exit 1
  fi
  if ! sudo -n true 2>/dev/null; then
    echo "🔑 관리자 권한이 필요합니다 (sudo)."
    sudo -v
  fi
}

ensure_timesyncd() {
  if ! systemctl list-unit-files systemd-timesyncd.service &>/dev/null; then
    echo "📦 systemd-timesyncd 설치 중..."
    sudo apt install -y systemd-timesyncd
  fi
  sudo systemctl enable systemd-timesyncd
  sudo systemctl start systemd-timesyncd
}

read_config_ntp() {
  local config_file="/etc/systemd/timesyncd.conf"
  if [ ! -f "$config_file" ]; then
    echo ""
    return
  fi
  grep -E '^\s*NTP=' "$config_file" 2>/dev/null | head -1 | sed 's/^[[:space:]]*NTP=//' | tr -d '[:space:]' || true
}

read_timedatectl_ntp_server() {
  timedatectl status 2>/dev/null | grep -i 'NTP server' | head -1 | awk '{print $3}' || echo ""
}

read_sync_yes_no() {
  local line
  line="$(timedatectl status 2>/dev/null | grep -E 'System clock synchronized|NTP synchronized' | head -1 || true)"
  if echo "$line" | grep -qi 'yes'; then
    echo "yes"
  elif echo "$line" | grep -qi 'no'; then
    echo "no"
  else
    echo "unknown"
  fi
}

do_set() {
  require_sudo

  if [ ! -f "$NTP_HELPER" ]; then
    echo "❌ NTP 헬퍼 스크립트가 없습니다: $NTP_HELPER" >&2
    exit 1
  fi

  ensure_timesyncd

  echo "⏱️  NTP 서버 설정: $FIELD_NTP_SERVER"
  if ! sudo bash "$NTP_HELPER" set_server "$FIELD_NTP_SERVER"; then
    echo "❌ NTP 서버 설정 실패" >&2
    exit 1
  fi

  echo ""
  echo "✅ NTP 서버가 적용되었습니다."
  echo "   확인: ./scripts/install-field.sh status-ntp"
}

do_status() {
  local config_ntp current_ntp service_active service_enabled sync_status
  local fail=0

  echo "=========================================="
  echo " Bushub NTP 상태 (현장)"
  echo "=========================================="

  config_ntp="$(read_config_ntp)"
  current_ntp="$(read_timedatectl_ntp_server)"
  service_active="$(systemctl is-active systemd-timesyncd 2>/dev/null || echo "unknown")"
  service_enabled="$(systemctl is-enabled systemd-timesyncd 2>/dev/null || echo "unknown")"
  sync_status="$(read_sync_yes_no)"

  echo "  기대 서버:       $FIELD_NTP_SERVER"
  echo "  설정 파일 NTP:   ${config_ntp:-(없음)}"
  echo "  연결 NTP:        ${current_ntp:-(알 수 없음)}"
  echo "  timesyncd:       $service_active (enabled: $service_enabled)"
  echo "  동기화:          $sync_status"
  echo "=========================================="

  if [ "$service_active" != "active" ]; then
    echo "❌ systemd-timesyncd 가 active 가 아닙니다." >&2
    fail=1
  fi

  if [ "$service_enabled" != "enabled" ]; then
    echo "❌ systemd-timesyncd 가 enabled 가 아닙니다." >&2
    fail=1
  fi

  if [ "$config_ntp" != "$FIELD_NTP_SERVER" ]; then
    echo "❌ timesyncd.conf 의 NTP 가 기대값과 다릅니다." >&2
    echo "   적용: ./scripts/install-field.sh set-ntp" >&2
    fail=1
  fi

  if [ "$sync_status" != "yes" ]; then
    echo "⚠️  아직 NTP 동기화가 완료되지 않았습니다 (망 단절·방화벽·서버 가동 직후일 수 있음)."
    if [ "$fail" -eq 0 ]; then
      echo "   설정은 올바릅니다. 잠시 후 다시 status-ntp 를 실행하세요."
    fi
  fi

  if [ "$fail" -ne 0 ]; then
    exit 1
  fi

  if [ "$sync_status" = "yes" ]; then
    echo "✅ NTP 설정·동기화가 정상입니다."
  else
    echo "✅ NTP 설정이 기대와 일치합니다 (동기화는 대기 중일 수 있음)."
  fi
}

usage() {
  echo "사용법: $0 {set|status} [-h|--help]"
  echo ""
  echo "  set     현장 NTP 서버 적용 ($FIELD_NTP_SERVER)"
  echo "  status  NTP 설치·설정 상태 확인"
}

MODE="${1:-}"
case "$MODE" in
  set)
    do_set
    ;;
  status)
    do_status
    ;;
  -h|--help|"")
    usage
    [ -z "$MODE" ] && exit 1
    exit 0
    ;;
  *)
    echo "알 수 없는 모드: $MODE" >&2
    usage >&2
    exit 1
    ;;
esac
