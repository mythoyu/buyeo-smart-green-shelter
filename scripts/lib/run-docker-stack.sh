#!/usr/bin/env bash
# Docker Compose 공통 기동 (직접 호출 금지)
# start-docker-compose-integrated.sh 또는 start-docker-compose-usb485.sh 가 설정한
# BUSHUB_COMPOSE_MODE 만 사용합니다.
# 현장 전체 설치는 모노레포 루트의 ./scripts/install-field.sh 를 사용합니다.
#
# 위치: 모노레포 scripts/lib — compose 파일은 레포 루트, nginx 설정은 packages/nginx
set -euo pipefail

# shellcheck source=field-guard.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/field-guard.sh"

MODE="${BUSHUB_COMPOSE_MODE:-}"
if [ -z "$MODE" ]; then
  echo "❌ 직접 실행하지 마세요."
  echo "   ./scripts/lib/start-docker-compose-integrated.sh   (내장 RS-485)"
  echo "   ./scripts/lib/start-docker-compose-usb485.sh       (USB-RS485)"
  exit 1
fi

SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

case "$MODE" in
  integrated)
    COMPOSE_FILE="docker-compose.integrated.yml"
    ;;
  usb485)
    COMPOSE_FILE="docker-compose.usb485.yml"
    ;;
  *)
    echo "❌ 내부 오류: 알 수 없는 BUSHUB_COMPOSE_MODE=$MODE"
    exit 1
    ;;
esac

echo "📎 스택 모드: $MODE → $COMPOSE_FILE"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ $REPO_ROOT/$COMPOSE_FILE 없음"
  exit 1
fi

COMPOSE_FILES=("$COMPOSE_FILE")
if [ -z "${PEOPLE_COUNTER_COUNT:-}" ] && [ -f "$REPO_ROOT/.env" ]; then
  _pc_line="$(grep -E '^[[:space:]]*PEOPLE_COUNTER_COUNT=' "$REPO_ROOT/.env" | tail -n1 || true)"
  if [ -n "$_pc_line" ]; then
    PEOPLE_COUNTER_COUNT="${_pc_line#*=}"
    PEOPLE_COUNTER_COUNT="${PEOPLE_COUNTER_COUNT//[\"\']/}"
    PEOPLE_COUNTER_COUNT="$(printf '%s' "$PEOPLE_COUNTER_COUNT" | tr -d '\r' | xargs)"
    export PEOPLE_COUNTER_COUNT
  fi
fi
PC_COUNT="${PEOPLE_COUNTER_COUNT:-0}"
export PEOPLE_COUNTER_COUNT="$PC_COUNT"

if ! [[ "$PC_COUNT" =~ ^[0-3]$ ]]; then
  echo "❌ PEOPLE_COUNTER_COUNT는 0~3 정수여야 합니다. 현재: $PC_COUNT"
  exit 1
fi

if [ "$PC_COUNT" -ge 1 ]; then
  PC_OVERRIDE="docker-compose.common.people-counter.yml"
  if [ ! -f "$PC_OVERRIDE" ]; then
    echo "❌ $REPO_ROOT/$PC_OVERRIDE 없음 (PEOPLE_COUNTER_COUNT=$PC_COUNT)"
    exit 1
  fi
  COMPOSE_FILES+=("$PC_OVERRIDE")
  for _pci in $(seq 1 "$PC_COUNT"); do
    PC_DEV_FILE="docker-compose.common.pc-dev-${_pci}.yml"
    if [ ! -f "$PC_DEV_FILE" ]; then
      echo "❌ $REPO_ROOT/$PC_DEV_FILE 없음 (PEOPLE_COUNTER_COUNT=$PC_COUNT)"
      exit 1
    fi
    COMPOSE_FILES+=("$PC_DEV_FILE")
  done

  if [ -z "${PEOPLE_COUNTER_PORTS:-}" ]; then
    skip_pc_ports_auto=0
    _env_file=""
    for _candidate in "$REPO_ROOT/.env" "$REPO_ROOT/.env.development"; do
      if [ -f "$_candidate" ] && grep -Eq '^[[:space:]]*PEOPLE_COUNTER_PORTS=' "$_candidate" 2>/dev/null; then
        _env_file="$_candidate"
        break
      fi
    done
    if [ -n "$_env_file" ]; then
      skip_pc_ports_auto=1
    fi
    if [ "$skip_pc_ports_auto" -eq 0 ]; then
      pc_ports=""
      for _i in $(seq 1 "$PC_COUNT"); do
        [ -n "$pc_ports" ] && pc_ports+=","
        pc_ports+="/dev/bushub-people-counter-${_i}"
      done
      export PEOPLE_COUNTER_PORTS="$pc_ports"
      echo "🔌 PEOPLE_COUNTER_PORTS 자동 설정 (PEOPLE_COUNTER_COUNT=$PC_COUNT): $PEOPLE_COUNTER_PORTS"
    else
      echo "🔌 PEOPLE_COUNTER_PORTS 는 .env 에 정의됨 — 자동 생성 생략 (compose 치환 사용)"
    fi
  else
    echo "🔌 PEOPLE_COUNTER_PORTS 이미 설정됨: $PEOPLE_COUNTER_PORTS"
  fi
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ docker compose 를 사용할 수 없습니다. ./scripts/lib/setup-host-ubuntu24.sh 실행 여부를 확인하세요."
  exit 1
fi

# shellcheck source=scripts/lib/resolve-github-ref-name.sh
source "$SCRIPT_DIR/resolve-github-ref-name.sh"
resolve_github_ref_name

export REPO_ROOT
bash "$SCRIPT_DIR/load-docker-images.sh"

COMPOSE_ENV_FILE_ARGS=()
if [ -f "$REPO_ROOT/.env" ]; then
  COMPOSE_ENV_FILE_ARGS=(--env-file "$REPO_ROOT/.env")
elif [ -f "$REPO_ROOT/.env.development" ]; then
  echo "ℹ️  .env 없음 — compose 치환에 .env.development 사용 (현장은 .env 권장)"
  COMPOSE_ENV_FILE_ARGS=(--env-file "$REPO_ROOT/.env.development")
fi

compose_args=()
for f in "${COMPOSE_FILES[@]}"; do
  compose_args+=("-f" "$f")
done

echo "📎 compose 파일:"
for f in "${COMPOSE_FILES[@]}"; do
  echo "   - $f"
done

echo "🚀 docker compose ${COMPOSE_ENV_FILE_ARGS[*]} ${compose_args[*]} down --remove-orphans → up -d"
docker compose "${COMPOSE_ENV_FILE_ARGS[@]}" "${compose_args[@]}" down --remove-orphans || true
docker compose "${COMPOSE_ENV_FILE_ARGS[@]}" "${compose_args[@]}" up -d

echo ""
echo "🐳 컨테이너:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "🔍 헬스체크 (잠시 대기)..."
sleep 5
if curl -sSf "http://localhost:3000/health" >/dev/null 2>&1; then
  echo "✅ Backend API"
else
  echo "❌ Backend API"
fi
if curl -sSf "http://localhost:8080" >/dev/null 2>&1; then
  echo "✅ Frontend"
else
  echo "❌ Frontend"
fi
if curl -sSf "http://localhost" >/dev/null 2>&1; then
  echo "✅ Nginx"
else
  echo "❌ Nginx"
fi

echo ""
echo "🎉 기동 완료"
echo "   중지: cd $REPO_ROOT && docker compose ${COMPOSE_ENV_FILE_ARGS[*]} ${compose_args[*]} down --remove-orphans"
