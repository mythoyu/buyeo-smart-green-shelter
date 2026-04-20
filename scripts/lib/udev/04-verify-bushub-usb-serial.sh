#!/usr/bin/env bash
# 호환 래퍼: usb485 검증 → usb485/04-verify-bushub-usb-serial.sh
exec bash "$(cd "$(dirname "$0")" && pwd)/usb485/04-verify-bushub-usb-serial.sh" "$@"
