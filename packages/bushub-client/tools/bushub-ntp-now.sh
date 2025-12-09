#!/bin/bash
set -e

echo "⏱️ NTP 즉시 동기 요청(Network Control API)"
curl -fsS -X POST http://localhost:3001/api/network/ntp/sync && echo "\n✅ 완료" || { echo "\n❌ 실패"; exit 1; }


