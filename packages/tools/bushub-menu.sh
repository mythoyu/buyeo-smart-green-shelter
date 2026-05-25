#!/bin/bash
set -e

# Determine USB root (tools is at USB_ROOT/tools)
SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

usage() {
  echo "사용법: $0 {status|logs|restart|stop|health|diag|images|prune|ntp|ddc|polling|start-{nginx|frontend|backend|db}|stop-{nginx|frontend|backend|db}|remove-{nginx|frontend|backend|db}} {status|start|stop}"
  echo ""
  echo "개별 컨테이너 제어:"
  echo "  start-nginx     Nginx 컨테이너 시작"
  echo "  start-frontend  Frontend 컨테이너 시작"
  echo "  start-backend   Backend 컨테이너 시작"
  echo "  start-db        MongoDB 컨테이너 시작"
  echo "  stop-nginx      Nginx 컨테이너 정지 (컨테이너 유지)"
  echo "  stop-frontend   Frontend 컨테이너 정지 (컨테이너 유지)"
  echo "  stop-backend    Backend 컨테이너 정지 (컨테이너 유지)"
  echo "  stop-db         MongoDB 컨테이너 정지 (컨테이너 유지)"
  echo "  remove-nginx    Nginx 컨테이너 완전 제거"
  echo "  remove-frontend Frontend 컨테이너 완전 제거"
  echo "  remove-backend  Backend 컨테이너 완전 제거"
  echo "  remove-db       MongoDB 컨테이너 완전 제거"
}

case "$1" in
  status)  "$SCRIPT_DIR/bushub-status.sh" ;;
  logs)    "$SCRIPT_DIR/bushub-logs.sh" ;;
  restart) "$SCRIPT_DIR/bushub-restart.sh" ;;
  stop)    "$SCRIPT_DIR/bushub-stop.sh" ;;
  health)  "$SCRIPT_DIR/bushub-healthcheck.sh" ;;
  diag)    "$SCRIPT_DIR/bushub-diagnostics.sh" ;;
  images)  "$SCRIPT_DIR/bushub-images-load.sh" ;;
  prune)   "$SCRIPT_DIR/bushub-prune.sh" ;;
  ntp)     "$SCRIPT_DIR/bushub-ntp-now.sh" ;;
  ddc)     "$SCRIPT_DIR/bushub-ddc-sync-now.sh" ;;
  start-nginx)     "$SCRIPT_DIR/bushub-start-nginx.sh" ;;
  start-frontend)  "$SCRIPT_DIR/bushub-start-frontend.sh" ;;
  start-backend)   "$SCRIPT_DIR/bushub-start-backend.sh" ;;
  start-db)        "$SCRIPT_DIR/bushub-start-db.sh" ;;
  stop-nginx)      "$SCRIPT_DIR/bushub-stop-nginx.sh" ;;
  stop-frontend)   "$SCRIPT_DIR/bushub-stop-frontend.sh" ;;
  stop-backend)    "$SCRIPT_DIR/bushub-stop-backend.sh" ;;
  stop-db)         "$SCRIPT_DIR/bushub-stop-db.sh" ;;
  remove-nginx)    "$SCRIPT_DIR/bushub-remove-nginx.sh" ;;
  remove-frontend) "$SCRIPT_DIR/bushub-remove-frontend.sh" ;;
  remove-backend)  "$SCRIPT_DIR/bushub-remove-backend.sh" ;;
  remove-db)       "$SCRIPT_DIR/bushub-remove-db.sh" ;;
  polling)
    shift
    "$SCRIPT_DIR/bushub-polling.sh" "$@"
    ;;
  *)
    usage
    exit 1
    ;;
esac


