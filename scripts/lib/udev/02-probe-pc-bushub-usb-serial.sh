#!/usr/bin/env bash
# 호환 래퍼: PeopleCounter USB 프로브 → common/02-probe-pc-bushub-usb-serial.sh
exec "$(cd "$(dirname "$0")" && pwd)/common/02-probe-pc-bushub-usb-serial.sh" "$@"
