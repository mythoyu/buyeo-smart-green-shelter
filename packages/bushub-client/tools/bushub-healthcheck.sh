#!/bin/bash
set -e

ok=0; fail=0

check() {
  local name="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "✅ $name: OK"
    ok=$((ok+1))
  else
    echo "❌ $name: FAIL"
    fail=$((fail+1))
  fi
}

sleep 2
check "Backend API" curl -s http://localhost:3000/api/v1/health
check "Frontend" curl -s http://localhost:8080
check "Network Control API" curl -s http://localhost:3001/api/health

echo "\n완료: OK=$ok, FAIL=$fail"
exit $([ $fail -eq 0 ] && echo 0 || echo 1)


