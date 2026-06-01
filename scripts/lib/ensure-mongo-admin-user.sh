#!/usr/bin/env bash
# 레거시 볼륨 마이그레이션 등으로 /data/db 는 있으나 Mongo root(admin) 가 없을 때 복구.
# run-docker-stack.sh 에서 compose 전체 up 전에 호출.
set -euo pipefail

MONGO_USER="${MONGO_USER:-admin}"
MONGO_PASS="${MONGO_PASS:-sw-smartcity-db}"
MONGO_DB_CONTAINER="${MONGO_DB_CONTAINER:-}"

usage() {
  echo "사용법: $0 --compose-file <yml> [--compose-file <yml> ...] [--db-container <name>]"
}

compose_args=()
while [ $# -gt 0 ]; do
  case "$1" in
    -f|--compose-file)
      compose_args+=("-f" "$2")
      shift 2
      ;;
    --db-container)
      MONGO_DB_CONTAINER="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "❌ 알 수 없는 인자: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ "${#compose_args[@]}" -eq 0 ]; then
  echo "❌ --compose-file 이 하나 이상 필요합니다." >&2
  exit 1
fi

if [ -z "$MONGO_DB_CONTAINER" ]; then
  case "${BUSHUB_COMPOSE_MODE:-}" in
    integrated) MONGO_DB_CONTAINER="bushub-db" ;;
    usb485) MONGO_DB_CONTAINER="sw-by-bushub-db" ;;
    *)
      echo "❌ --db-container 또는 BUSHUB_COMPOSE_MODE(integrated|usb485) 가 필요합니다." >&2
      exit 1
      ;;
  esac
fi

echo "🔐 MongoDB root 유저 확인 (컨테이너: $MONGO_DB_CONTAINER)"

echo "   db 서비스 기동..."
docker compose "${compose_args[@]}" up -d db

wait_mongod() {
  local i
  for i in $(seq 1 60); do
    if docker exec "$MONGO_DB_CONTAINER" mongosh --quiet --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

if ! wait_mongod; then
  echo "❌ MongoDB가 120초 내에 응답하지 않습니다. docker logs $MONGO_DB_CONTAINER 확인" >&2
  exit 1
fi

ensure_js="$(cat <<EOF
const u = '$MONGO_USER';
const p = '$MONGO_PASS';
const adm = db.getSiblingDB('admin');
const found = adm.getUsers({ filter: { user: u } });
if (found.users && found.users.length > 0) {
  print('SKIP: user already exists');
} else {
  adm.createUser({ user: u, pwd: p, roles: [{ role: 'root', db: 'admin' }] });
  print('CREATED: admin user');
}
EOF
)"

out="$(docker exec "$MONGO_DB_CONTAINER" mongosh --quiet --eval "$ensure_js" 2>&1)" || {
  echo "❌ mongosh 유저 확인/생성 실패:" >&2
  echo "$out" >&2
  exit 1
}

if echo "$out" | grep -q 'CREATED:'; then
  echo "✅ MongoDB root 유저 생성 완료"
elif echo "$out" | grep -q 'SKIP:'; then
  echo "✅ MongoDB root 유저 이미 존재"
else
  echo "⚠️  mongosh 출력: $out"
fi

if docker exec "$MONGO_DB_CONTAINER" mongosh --quiet \
  -u "$MONGO_USER" -p "$MONGO_PASS" \
  --authenticationDatabase admin \
  --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
  echo "✅ MongoDB 인증 ping 성공 (healthcheck와 동일)"
else
  echo "❌ admin 인증 ping 실패 — compose MONGO_INITDB_* / MONGODB_URI 와 비밀번호가 일치하는지 확인하세요." >&2
  exit 1
fi
