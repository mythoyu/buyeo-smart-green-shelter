#!/usr/bin/env bash
# 호환 래퍼: usb485 전체 udev 설치 → usb485/03-install-bushub-usb-serial.sh
exec "$(cd "$(dirname "$0")" && pwd)/usb485/03-install-bushub-usb-serial.sh" "$@"
