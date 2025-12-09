#!/bin/bash

echo "🕐 DDC 시간 동기화 로그 모니터링 시작..."
echo "로그 파일: packages/bushub-client/backend/logs/app.log"
echo "필터링: DDC 시간 동기화 관련 로그만 표시"
echo "종료하려면 Ctrl+C를 누르세요"
echo ""

# DDC 시간 동기화 관련 로그만 필터링하여 실시간 모니터링
tail -f packages/bushub-client/backend/logs/app.log | grep -E "(DDC.*시간|ModbusQueue.*DDC|시간.*동기화|🕐|✅|❌|⚠️)"
