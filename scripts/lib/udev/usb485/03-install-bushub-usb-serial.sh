#!/usr/bin/env bash
# usb485: 컨트롤러 + PeopleCounter udev 설치(공통 구현 호출)
exec "$(cd "$(dirname "$0")" && pwd)/../common/03-install-bushub-serial.sh" "$@"
