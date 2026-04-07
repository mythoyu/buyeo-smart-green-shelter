#!/usr/bin/env bash
# Ubuntu 24.04 호스트 — 스택 실행 전 필수 도구(Docker, zenity 등) 설치
# 현장 설치: Git 소스 + 모노레포 루트 ./scripts/install-field.sh (테더링 등으로 인터넷 권장)
#
# 주의: 기존 apt Docker(docker.io 등)·관련 패키지를 제거하고 Docker 공식 저장소로 재설치할 수 있습니다.
#       개발용 워크스테이션이 아닌 전용 현장 PC에서 실행하는 것을 권장합니다.
set -euo pipefail

echo "🔧 Bushub 호스트 환경 설정 (Ubuntu 24.04 대상)"
echo "================================"

if [ -f /etc/os-release ]; then
  # shellcheck source=/dev/null
  . /etc/os-release
  if [ "${VERSION_ID:-}" != "24.04" ]; then
    echo "⚠️  Ubuntu 24.04 가 아닙니다: ${PRETTY_NAME:-unknown}"
    echo "   다른 버전에서도 동작할 수 있으나, 검증은 24.04 기준입니다."
  fi
else
  echo "⚠️  /etc/os-release 를 읽을 수 없습니다."
fi

if ! command -v apt >/dev/null 2>&1; then
  echo "❌ apt 가 없습니다. Ubuntu/Debian 계열에서 실행하세요."
  exit 1
fi

require_sudo() {
  if [ "$(id -u)" -eq 0 ]; then
    echo "❌ root 로 실행하지 말고, 일반 사용자에서 sudo 로 진행하세요."
    exit 1
  fi
  if ! sudo -n true 2>/dev/null; then
    echo "🔑 관리자 권한이 필요합니다 (sudo)."
    sudo -v
  fi
}

require_sudo

# Docker 공식 저장소가 docker.gpg / docker.asc·docker.list / docker.sources 등으로 이중 정의되면
# apt 전체가 "Conflicting values set for option Signed-By" 로 실패합니다. 선제 정리.
# 공식 문서(Engine install Ubuntu): ASCII 키 docker.asc + deb822 의 docker.sources 사용.
repair_docker_apt_signed_by_conflict() {
  echo "🔧 Docker APT Signed-By 충돌 정리 중..."
  sudo rm -f /etc/apt/sources.list.d/docker.list /etc/apt/sources.list.d/docker.sources
  local f
  shopt -s nullglob
  for f in /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
    [ -f "$f" ] || continue
    if grep -q 'download\.docker\.com' "$f" 2>/dev/null; then
      echo "   제거: $f"
      sudo rm -f "$f"
    fi
  done
  shopt -u nullglob
  sudo rm -f /etc/apt/keyrings/docker.asc /etc/apt/keyrings/docker.gpg
}

write_docker_official_apt_repo() {
  if ! command -v curl >/dev/null 2>&1; then
    sudo apt install -y ca-certificates curl
  fi
  sudo install -m 0755 -d /etc/apt/keyrings
  sudo rm -f /etc/apt/keyrings/docker.gpg /etc/apt/keyrings/docker.asc
  sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  sudo chmod a+r /etc/apt/keyrings/docker.asc
  sudo rm -f /etc/apt/sources.list.d/docker.list /etc/apt/sources.list.d/docker.sources
  # shellcheck source=/dev/null
  sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
}

restore_docker_official_apt_source() {
  if ! command -v curl >/dev/null 2>&1; then
    sudo apt install -y ca-certificates curl gnupg
  fi
  write_docker_official_apt_repo
}

ensure_apt_update_works() {
  local err
  err="$(mktemp)"
  if sudo apt update 2>"$err"; then
    if grep -q 'NO_PUBKEY' "$err" && grep -q 'download\.docker\.com' "$err"; then
      echo "🔧 Docker 저장소 서명 검증 실패(NO_PUBKEY) → 공식 키·소스(docker.asc + docker.sources)를 다시 설치합니다."
      rm -f "$err"
      if ! command -v curl >/dev/null 2>&1; then
        sudo apt install -y ca-certificates curl gnupg
      fi
      write_docker_official_apt_repo
      if ! sudo apt update; then
        echo "❌ apt update 가 키·소스 재설치 후에도 실패했습니다." >&2
        exit 1
      fi
      return 0
    fi
    rm -f "$err"
    return 0
  fi
  if grep -q 'Conflicting values set for option Signed-By' "$err" && grep -q 'docker' "$err"; then
    echo "⚠️  apt: Docker 저장소 Signed-By 충돌이 감지되었습니다. 단일 소스로 정리합니다."
    rm -f "$err"
    repair_docker_apt_signed_by_conflict
    if ! command -v curl >/dev/null 2>&1; then
      sudo apt install -y ca-certificates curl gnupg
    fi
    write_docker_official_apt_repo
    if ! sudo apt update; then
      echo "❌ apt update 가 충돌 제거 후에도 실패했습니다." >&2
      exit 1
    fi
    return 0
  fi
  cat "$err" >&2
  rm -f "$err"
  echo "❌ apt update 실패. 네트워크 및 /etc/apt 를 확인하세요." >&2
  exit 1
}

ensure_apt_update_works

# 현장 설치 마법사 등 GUI 안내용 (대화상자)
if ! command -v zenity >/dev/null 2>&1; then
  echo "🪟 zenity 설치 중..."
  sudo apt install -y zenity
fi

# udev 마법사: tty 목록(yad --list) 및 JSON 파싱(python3)
if ! command -v yad >/dev/null 2>&1; then
  echo "🪟 yad 설치 중 (USB 시리얼 tty 선택)..."
  sudo apt install -y yad
fi
if ! command -v python3 >/dev/null 2>&1; then
  echo "🐍 python3 설치 중 (tty 목록 JSON)..."
  sudo apt install -y python3
fi

# Docker + Compose V2
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Docker 설치 중..."
  sudo systemctl stop docker 2>/dev/null || true
  sudo systemctl disable docker 2>/dev/null || true
  for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    sudo apt remove -y "$pkg" 2>/dev/null || true
  done
  sudo rm -rf /var/lib/docker ~/.docker /etc/docker \
    /etc/apt/keyrings/docker.gpg /etc/apt/keyrings/docker.asc \
    /etc/apt/sources.list.d/docker.list /etc/apt/sources.list.d/docker.sources 2>/dev/null || true
  sudo apt update
  sudo apt install -y ca-certificates curl gnupg
  write_docker_official_apt_repo
  sudo apt update
  sudo apt remove -y docker-compose 2>/dev/null || true
  sudo apt purge -y docker-compose 2>/dev/null || true
  sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
  sudo usermod -aG docker "$USER"
  echo "✅ Docker 설치 완료 (그룹 docker 적용: 재로그인 또는 newgrp docker)"
else
  echo "✅ Docker 이미 설치됨"
  if ! docker compose version >/dev/null 2>&1; then
    echo "📦 docker compose 플러그인 설치 중..."
    sudo apt install -y docker-compose-plugin
  fi
fi

# curl
if ! command -v curl >/dev/null 2>&1; then
  echo "📡 curl 설치 중..."
  sudo apt install -y curl
fi

# NetworkManager (nmcli)
if ! command -v nmcli >/dev/null 2>&1; then
  echo "🌐 NetworkManager 설치 중..."
  sudo apt install -y network-manager
  sudo systemctl enable NetworkManager
  sudo systemctl start NetworkManager
fi

# Node.js 18 (호스트 도구·번들 스크립트 호환용)
if ! command -v node >/dev/null 2>&1; then
  echo "📦 Node.js 18 설치 중..."
  sudo apt remove -y nodejs npm 2>/dev/null || true
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# pnpm
if ! command -v pnpm >/dev/null 2>&1; then
  echo "📦 pnpm 설치 중..."
  if command -v npm >/dev/null 2>&1; then
    sudo npm install -g pnpm
  else
    echo "❌ npm 이 없어 pnpm 을 설치할 수 없습니다."
    exit 1
  fi
fi

# 시리얼(Modbus) 호스트 디버깅용
if ! id -nG | grep -q '\bdialout\b'; then
  echo "🔌 dialout 그룹에 현재 사용자 추가..."
  sudo usermod -aG dialout "$USER"
  echo "   적용: 재로그인 또는 newgrp dialout"
fi

if ! systemctl is-active --quiet docker; then
  sudo systemctl start docker
fi

echo ""
echo "✅ 호스트 환경 설정 완료"
echo "   - Docker 그룹: 재로그인 후 docker ps 로 확인"
echo "   - 현장 설치(권장): 모노레포 루트에서 ./scripts/install-field.sh"
echo "     (호스트·udev·rebuild-and-up 까지 마법사로 안내)"
echo "   - udev 만 단계별: ./scripts/lib/udev/ 01 → 02 → sudo 03 → 04"
echo "   - 스택 재기동만(이미 빌드됨): ./scripts/lib/start-docker-compose-integrated.sh | ...usb485.sh"
echo "   - 운영: docker compose -f <compose.yml> ps / logs / restart"
echo "   - 번들(USB) 배포 경로는 사용하지 않습니다. 소스 + ./scripts/install-field.sh 만 사용하세요."
