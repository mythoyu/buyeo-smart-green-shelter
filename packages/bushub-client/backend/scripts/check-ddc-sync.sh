#!/bin/bash

echo "🔍 DDC 시간 동기화 상태 확인..."
echo "API 엔드포인트: http://localhost:3000/api/v1/system/ddc-time-sync/status"
echo ""

# API를 통한 상태 조회
echo "📊 현재 상태:"
curl -s http://localhost:3000/api/v1/system/ddc-time-sync/status | jq '.'

echo ""
echo "📋 상태 해석:"
echo "- lastSyncTime: 마지막 동기화 시간"
echo "- nextSyncTime: 다음 예정된 동기화 시간"
echo "- syncStatus: 동기화 상태 (idle/syncing/success/failed)"
echo "- clientId: 현재 설정된 클라이언트 ID"
