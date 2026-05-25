#!/bin/bash
set -e

case "$1" in
  status|"")
    echo "📡 Polling 상태"
    curl -fsS http://localhost:3000/api/v1/system/polling/state || { echo "\n❌ 실패"; exit 1; }
    ;;
  start)
    echo "▶️ Polling 시작"
    curl -fsS -X POST http://localhost:3000/api/v1/system/polling -H 'Content-Type: application/json' -d '{"action":"start"}' && echo "\n✅ 완료" || { echo "\n❌ 실패"; exit 1; }
    ;;
  stop)
    echo "⏹️ Polling 중지"
    curl -fsS -X POST http://localhost:3000/api/v1/system/polling -H 'Content-Type: application/json' -d '{"action":"stop"}' && echo "\n✅ 완료" || { echo "\n❌ 실패"; exit 1; }
    ;;
  *)
    echo "사용법: $0 {status|start|stop}"
    exit 1
    ;;
esac


