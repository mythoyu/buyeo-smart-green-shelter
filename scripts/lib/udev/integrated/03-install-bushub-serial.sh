#!/usr/bin/env bash
# integrated: APC USB만 udev 설치(Modbus는 호스트 /dev/ttyS0)
exec bash "$(cd "$(dirname "$0")" && pwd)/../common/03-install-bushub-serial.sh" --apc-only "$@"
