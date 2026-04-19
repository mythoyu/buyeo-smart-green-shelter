#!/usr/bin/env bash
# Docker Compose 공통 기동 (직접 호출 금지)
# start-docker-compose-integrated.sh 또는 start-docker-compose-usb485.sh 가 설정한
# BUSHUB_COMPOSE_MODE 만 사용합니다.
# 현장 전체 설치는 모노레포 루트의 ./scripts/install-field.sh 를 사용합니다.
#
# 위치: 모노레포 scripts/lib — compose 파일은 레포 루트, nginx 설정은 bushub-client/nginx
set -euo pipefail

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
# COMPOSE_PROJECT_NAME 은 레포 루트 .env 또는 셸에서 지정 가능. 미설정 시 디렉터리명 기준(예: project_*).
# 재기 동일 PC에서 볼륨·네트워크 접두사를 맞추려면 .env 에 COMPOSE_PROJECT_NAME=myname 등으로 고정 권장.

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

# PeopleCounter(0~3대): usb485 / integrated 공통 compose 조각(docker-compose.common.*)
# - PEOPLE_COUNTER_COUNT=0 이면 people-counter override를 사용하지 않는다(없는 /dev 마운트로 인한 실패 방지)
# - PEOPLE_COUNTER_COUNT>=1 이면 override compose를 추가한다.
# 기본값: integrated=0(미설정 시), usb485=1(기존 현장 호환)
COMPOSE_FILES=("$COMPOSE_FILE")
PC_COUNT="${PEOPLE_COUNTER_COUNT:-}"
if [ -z "$PC_COUNT" ]; then
  if [ "$MODE" = "integrated" ]; then
    PC_COUNT=0
  else
    PC_COUNT=1
  fi
fi
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

  # 백엔드 ServiceContainer u001..uN: PEOPLE_COUNTER_PORTS 가 셸에 없을 때만 udev 심볼릭 경로를 개수만큼 자동 생성
  # (.env 에 PEOPLE_COUNTER_PORTS 가 있으면 compose 가 치환 시 사용 — 셸에서 중복 export 하지 않음)
  if [ -z "${PEOPLE_COUNTER_PORTS:-}" ]; then
    skip_pc_ports_auto=0
    if [ -f "$REPO_ROOT/.env" ] && grep -Eq '^[[:space:]]*PEOPLE_COUNTER_PORTS=' "$REPO_ROOT/.env" 2>/dev/null; then
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

# 이미지 태그: GITHUB_REF_NAME 또는 docker-images/bushub-backend.*.tar 에서 추론
# tar 가 여러 개면 수정 시각이 가장 최근인 파일 기준
if [ -z "${GITHUB_REF_NAME:-}" ]; then
  if ls docker-images/bushub-backend.*.tar >/dev/null 2>&1; then
    LATEST_TAR="$(ls -t docker-images/bushub-backend.*.tar 2>/dev/null | head -n1)"
    TAG_FROM_FILE="$(printf '%s\n' "$LATEST_TAR" | sed -n 's/.*bushub-backend\.\(.*\)\.tar/\1/p')"
    if [ -n "$TAG_FROM_FILE" ]; then
      export GITHUB_REF_NAME="$TAG_FROM_FILE"
      echo "🔖 이미지 태그 자동 설정: $GITHUB_REF_NAME"
    else
      export GITHUB_REF_NAME="latest"
    fi
  else
    export GITHUB_REF_NAME="latest"
  fi
else
  echo "🔖 이미지 태그 지정됨: $GITHUB_REF_NAME"
fi

if [ -d "docker-images" ]; then
  echo "📦 Docker 이미지 로드 (docker-images/*.tar)..."
  for image_file in docker-images/*.tar; do
    if [ -f "$image_file" ]; then
      echo "   로드: $image_file"
      docker load -i "$image_file"
    fi
  done
else
  echo "ℹ️  docker-images/ 없음 — 레지스트리 pull 또는 사전에 이미지가 있어야 합니다."
fi

compose_args=()
for f in "${COMPOSE_FILES[@]}"; do
  compose_args+=("-f" "$f")
done

echo "📎 compose 파일:"
for f in "${COMPOSE_FILES[@]}"; do
  echo "   - $f"
done

echo "🚀 docker compose ${compose_args[*]} down --remove-orphans → up -d"
docker compose "${compose_args[@]}" down --remove-orphans || true
docker compose "${compose_args[@]}" up -d

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
echo "   중지: cd $REPO_ROOT && docker compose ${compose_args[*]} down --remove-orphans"
