#!/bin/bash
# Ubuntu 24.04 호스트에 Bushub Docker 스택 실행 전 필수 도구 설치
# 기존 usb-installer.sh / deploy-hybrid.sh 는 그대로 두고, 이 스크립트는 별도 경로용.
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

# Docker + Compose V2
if ! command -v docker >/dev/null 2>&1; then
  echo "🐳 Docker 설치 중..."
  sudo systemctl stop docker 2>/dev/null || true
  sudo systemctl disable docker 2>/dev/null || true
  for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
    sudo apt remove -y "$pkg" 2>/dev/null || true
  done
  sudo rm -rf /var/lib/docker ~/.docker /etc/docker /etc/apt/keyrings/docker.gpg /etc/apt/sources.list.d/docker.list 2>/dev/null || true
  sudo apt update
  sudo apt install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" |
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
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

# Node.js 18 (deploy-hybrid 와 동일 계열)
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
echo "   - PC B(USB-RS485) udev 고정(1회):"
echo "     1) Modbus용만 꽂고 ./scripts/udev/bushub-usb-serial-controller-probe.sh"
echo "     2) PeopleCounter용만 꽂고 ./scripts/udev/bushub-usb-serial-people-counter-probe.sh"
echo "     3) sudo ./scripts/udev/bushub-usb-serial-install.sh   (기존 rules 백업 포함)"
echo "     4) ./scripts/udev/bushub-usb-serial-verify.sh"
echo "   - 스택 기동: 내장 RS-485 → ./scripts/start-docker-compose-integrated.sh"
echo "                USB-RS485   → ./scripts/start-docker-compose-usb485.sh"
echo "   - USB/하이브리드 전체 배포(기존): ./deploy-hybrid.sh"
