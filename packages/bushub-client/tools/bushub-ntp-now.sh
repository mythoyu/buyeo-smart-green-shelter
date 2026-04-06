#!/bin/bash
set -e

echo "⏱️ NTP 즉시 동기 요청(호스트 OS)"

# Network Control API 제거 후: 호스트 NTP 동기화를 시도합니다.
# systemd-timesyncd 기반이 가장 흔하므로 우선 timedatectl을 사용합니다.
sudo timedatectl set-ntp true || { echo "\n❌ timedatectl 실패"; exit 1; }

echo "\n✅ 완료"


