#!/usr/bin/env bash
exec bash "$(cd "$(dirname "$0")" && pwd)/../common/02-probe-pc-bushub-usb-serial.sh" "$@"
