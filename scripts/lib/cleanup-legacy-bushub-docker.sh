#!/usr/bin/env bash
# 버전별 compose 프로젝트명(폴더명) 잔재 정리 — post-ports / run-docker-stack 기동 전
# 볼륨(bushub_db_data 등)은 삭제하지 않음. 없으면 구 프로젝트 volume → 고정 이름으로 1회 복사.
set -euo pipefail

BUSHUB_COMPOSE_PROJECT="${BUSHUB_COMPOSE_PROJECT:-bushub-field}"
BUSHUB_DB_VOLUME="${BUSHUB_DB_VOLUME:-bushub_db_data}"
BUSHUB_LOGS_VOLUME="${BUSHUB_LOGS_VOLUME:-bushub_backend_logs}"
BUSHUB_NETWORK_NAME="${BUSHUB_NETWORK_NAME:-bushub_network}"

# integrated / usb485 / 레거시 dev DB
BUSHUB_CONTAINER_NAMES=(
  bushub-backend
  bushub-frontend
  bushub-nginx
  bushub-db
  sw-by-bushub-db
  mongodb-dev
  sw-gn-bushub-db
)

migrate_named_volume() {
  local target_name="$1"
  local legacy_grep="$2"

  if docker volume inspect "$target_name" >/dev/null 2>&1; then
    return 0
  fi

  local old_vol=""
  while IFS= read -r v; do
    [ -z "$v" ] && continue
    if [[ "$v" == "$target_name" ]]; then
      continue
    fi
    if [[ "$v" =~ $legacy_grep ]]; then
      old_vol="$v"
      break
    fi
  done < <(docker volume ls -q 2>/dev/null || true)

  if [ -z "$old_vol" ]; then
    return 0
  fi

  echo "📦 볼륨 마이그레이션: $old_vol → $target_name"
  docker volume create "$target_name" >/dev/null
  local migrate_image="node:20-alpine"
  if ! docker image inspect "$migrate_image" >/dev/null 2>&1; then
    migrate_image="alpine:3.20"
  fi
  docker run --rm \
    -v "${old_vol}:/from:ro" \
    -v "${target_name}:/to" \
    "$migrate_image" \
    sh -c 'cp -a /from/. /to/'
  echo "✅ 볼륨 마이그레이션 완료: $target_name"
}

remove_stale_bushub_networks() {
  local net attached
  while IFS= read -r net; do
    [ -z "$net" ] && continue
    if [ "$net" = "$BUSHUB_NETWORK_NAME" ]; then
      continue
    fi
    if [[ "$net" != *_bushub-network ]] && [[ "$net" != buyeo-smart-green-shelter-* ]]; then
      continue
    fi
    attached="$(docker network inspect "$net" -f '{{len .Containers}}' 2>/dev/null || echo 1)"
    if [ "${attached:-1}" != "0" ]; then
      echo "⚠️  네트워크 $net — 컨테이너 연결됨, 컨테이너 정리 후 재시도"
      continue
    fi
    echo "🧹 레거시 네트워크 제거: $net"
    docker network rm "$net" 2>/dev/null || true
  done < <(docker network ls --format '{{.Name}}' 2>/dev/null || true)
}

echo "🧹 Bushub Docker 레거시 정리 (프로젝트: $BUSHUB_COMPOSE_PROJECT)"

migrate_named_volume "$BUSHUB_DB_VOLUME" '_db_data$'
migrate_named_volume "$BUSHUB_LOGS_VOLUME" '_backend_logs$'

for c in "${BUSHUB_CONTAINER_NAMES[@]}"; do
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$c"; then
    echo "🛑 컨테이너 제거: $c"
    docker stop "$c" 2>/dev/null || true
    docker rm "$c" 2>/dev/null || true
  fi
done

remove_stale_bushub_networks

echo "✅ 레거시 정리 완료"
