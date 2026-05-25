# scripts (이전 위치)

레거시 `/opt/bushub` systemd 설치 스크립트와 `network-control-api` 관련 파일은 제거되었습니다.

현장 설치·udev·Docker compose는 **모노레포 루트**를 사용하세요:

- [`../../scripts/install-field.sh`](../../scripts/install-field.sh)
- [`../../scripts/README.md`](../../scripts/README.md)

Docker 운영 유틸은 [`../tools/`](../tools/) 입니다.
