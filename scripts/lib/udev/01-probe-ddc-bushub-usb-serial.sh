#!/usr/bin/env bash
# 호환 래퍼: usb485 DDC 프로브 → scripts/lib/udev/usb485/01-probe-ddc-bushub-usb-serial.sh
exec bash "$(cd "$(dirname "$0")" && pwd)/usb485/01-probe-ddc-bushub-usb-serial.sh" "$@"
