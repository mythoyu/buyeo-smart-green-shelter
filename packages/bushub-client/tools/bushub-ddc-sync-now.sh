#!/bin/bash
set -e

echo "🕒 DDC 시간 즉시 동기 요청(Backend)"
curl -fsS -X POST http://localhost:3000/api/v1/system/sync-ddc-time && echo "\n✅ 완료" || { echo "\n❌ 실패"; exit 1; }


