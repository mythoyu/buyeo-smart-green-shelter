#!/bin/bash
set -e

# 스크립트 디렉터리 자동 감지 (심볼릭 링크 지원)
SCRIPT_PATH="$0"
if [ -L "$SCRIPT_PATH" ]; then
    # 심볼릭 링크인 경우 실제 파일 경로 추적
    SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$SCRIPT_PATH")")" && pwd)"
else
    # 일반 파일인 경우
    SCRIPT_DIR="$(cd "$(dirname "$SCRIPT_PATH")" && pwd)"
fi
echo "📂 작업 디렉터리: $SCRIPT_DIR"

# =================================================================
# 의존성 체크 및 설치
# =================================================================
echo "🔍 의존성 프로그램 체크 중..."

# 필수 명령어 목록 (공백으로 구분)
REQUIRED_COMMANDS="docker curl systemctl nmcli node pnpm"

# 누락된 명령어 추적
MISSING_COMMANDS=""

# 명령어 존재 여부 체크
for cmd in $REQUIRED_COMMANDS; do
    if ! command -v "$cmd" >/dev/null 2>&1; then
        MISSING_COMMANDS="$MISSING_COMMANDS $cmd"
        echo "❌ $cmd: 설치되지 않음"
    else
        echo "✅ $cmd: 설치됨"
    fi
done

# Docker Compose V2 체크 (docker compose 명령어)
if ! docker compose version >/dev/null 2>&1; then
    MISSING_COMMANDS="$MISSING_COMMANDS docker-compose"
    echo "❌ docker compose: 설치되지 않음"
else
    echo "✅ docker compose: 설치됨"
fi

# 누락된 명령어가 있으면 설치
if [ -n "$MISSING_COMMANDS" ]; then
    echo ""
    echo "⚠️ 누락된 프로그램들을 설치합니다..."
    
    # 패키지 매니저 확인
    if command -v apt &> /dev/null; then
        PKG_MANAGER="apt"
    elif command -v yum &> /dev/null; then
        PKG_MANAGER="yum"
    elif command -v dnf &> /dev/null; then
        PKG_MANAGER="dnf"
    else
        echo "❌ 지원되지 않는 패키지 매니저입니다."
        exit 1
    fi
    
    # 누락된 프로그램별 설치
    for cmd in $MISSING_COMMANDS; do
        case "$cmd" in
            "docker")
                echo "🐳 Docker 설치 중..."
                if [ "$PKG_MANAGER" = "apt" ]; then
                    # Docker 공식 저장소 추가 (install-docker.sh 방식)
                    echo "🔧 Docker 공식 저장소 추가 중..."
                    
                    # 기존 Docker 설치 제거
                    echo "🧹 기존 Docker 설치 제거 중..."
                    sudo systemctl stop docker 2>/dev/null || true
                    sudo systemctl disable docker 2>/dev/null || true
                    for pkg in docker.io docker-doc docker-compose docker-compose-v2 podman-docker containerd runc; do
                        sudo apt remove -y $pkg 2>/dev/null || true
                    done
                    sudo rm -rf /var/lib/docker ~/.docker /etc/docker /etc/apt/keyrings/docker.gpg /etc/apt/sources.list.d/docker.list
                    sudo apt update
                    
                    # 필수 도구 설치
                    echo "📦 필수 도구 설치 중..."
                    sudo apt install -y ca-certificates curl gnupg || { echo "❌ 필수 도구 설치 실패"; exit 1; }
                    
                    # GPG 키 디렉터리 생성
                    echo "🔑 Docker GPG 키 디렉터리 생성 중..."
                    sudo install -m 0755 -d /etc/apt/keyrings || { echo "❌ GPG 키 디렉터리 생성 실패"; exit 1; }
                    
                    # Docker GPG 키 추가
                    echo "🔑 Docker GPG 키 추가 중..."
                    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg || { echo "❌ Docker GPG 키 추가 실패"; exit 1; }
                    
                    # Docker APT 저장소 설정
                    echo "📝 Docker APT 저장소 설정 중..."
                    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null || { echo "❌ Docker 저장소 설정 실패"; exit 1; }
                    
                    # 패키지 인덱스 업데이트
                    echo "🔄 패키지 인덱스 업데이트 중..."
                    sudo apt update || { echo "❌ 패키지 인덱스 업데이트 실패"; exit 1; }
                    
                    # 기존 Docker Compose V1 완전 제거
                    echo "🧹 기존 Docker Compose V1 제거 중..."
                    sudo apt remove -y docker-compose || true
                    sudo apt purge -y docker-compose || true
                    
                    # Docker 설치 (최신 버전)
                    echo "📦 Docker 설치 중... (최신 버전)"
                    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
                    echo "✅ Docker 및 Docker Compose V2 설치 완료"
                    sudo systemctl enable docker
                    sudo systemctl start docker
                    sudo usermod -aG docker "$USER"
                fi
                ;;
            "docker-compose")
                echo "🐳 Docker Compose V2 설치 중..."
                if [ "$PKG_MANAGER" = "apt" ]; then
                    # 기존 Docker Compose V1 완전 제거
                    echo "🧹 기존 Docker Compose V1 제거 중..."
                    sudo apt remove -y docker-compose || true
                    sudo apt purge -y docker-compose || true
                    
                    # Docker Compose V2 플러그인 설치 (최신 버전)
                    echo "📦 Docker Compose V2 플러그인 설치 중... (최신 버전)"
                    sudo apt install -y docker-compose-plugin
                    echo "✅ Docker Compose V2 플러그인 설치 완료"
                fi
                ;;
            "curl")
                echo "📡 curl 설치 중..."
                if [ "$PKG_MANAGER" = "apt" ]; then
                    sudo apt install -y curl
                fi
                ;;
            "nmcli")
                echo "🌐 NetworkManager 설치 중..."
                if [ "$PKG_MANAGER" = "apt" ]; then
                    sudo apt install -y network-manager
                    sudo systemctl enable NetworkManager
                    sudo systemctl start NetworkManager
                fi
                ;;
            "node")
                echo "📦 Node.js 설치 중..."
                if [ "$PKG_MANAGER" = "apt" ]; then
                    # 기존 Node.js 제거 후 설치
                    sudo apt remove -y nodejs npm 2>/dev/null || true
                    # NodeSource 저장소 추가
                    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
                    sudo apt install -y nodejs
                fi
                ;;
            "pnpm")
                echo "📦 pnpm 설치 중..."
                # NVM 환경 확인
                if [ -d "$HOME/.nvm" ]; then
                    echo "NVM 환경 감지됨. NVM을 통해 pnpm 설치..."
                    # NVM 로드
                    export NVM_DIR="$HOME/.nvm"
                    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
                    # 설치된 Node.js 버전 사용
                    # Node.js 18 버전 찾기 (v18.x.x)
                    NODE_18_VERSION=$(ls "$NVM_DIR/versions/node/" 2>/dev/null | grep "^v18\." | sort -V | tail -1)
                    if [ -n "$NODE_18_VERSION" ] && [ -d "$NVM_DIR/versions/node/$NODE_18_VERSION" ]; then
                        export PATH="$NVM_DIR/versions/node/$NODE_18_VERSION/bin:$PATH"
                        npm install -g pnpm
                    else
                        echo "❌ NVM에 설치된 Node.js 버전을 찾을 수 없습니다."
                    fi
                elif command -v npm >/dev/null 2>&1; then
                    echo "시스템 npm을 통해 pnpm 설치..."
                    sudo npm install -g pnpm
                else
                    echo "❌ npm이 없어서 pnpm을 설치할 수 없습니다. Node.js를 먼저 설치하세요."
                fi
                ;;
        esac
    done
    
    echo ""
    echo "✅ 의존성 설치 완료!"
    echo "⚠️ Docker 그룹 권한을 적용하려면 다음 명령어를 실행하거나 재로그인하세요:"
    echo "   newgrp docker"
    echo ""
fi

# Docker 서비스 상태 체크
if ! systemctl is-active --quiet docker; then
    echo "🐳 Docker 서비스 시작 중..."
    sudo systemctl start docker
fi

# NetworkManager 서비스 상태 체크
if ! systemctl is-active --quiet NetworkManager; then
    echo "🌐 NetworkManager 서비스 시작 중..."
    sudo systemctl start NetworkManager
fi

echo "✅ 모든 의존성 준비 완료!"
echo ""

echo "🚀 Bushub 하이브리드 배포 시작..."
echo "=================================="

# 2. Docker 컨테이너 서비스 시작
cd "$SCRIPT_DIR"

# 환경변수 설정 (이미지 태그)
# docker-images/bushub-backend.<TAG>.tar 파일명에서 TAG를 자동 추출 (없으면 기존값 유지)
if [ -z "$GITHUB_REF_NAME" ]; then
    if ls docker-images/bushub-backend.*.tar >/dev/null 2>&1; then
        TAG_FROM_FILE=$(ls docker-images/bushub-backend.*.tar | sed -n 's/.*bushub-backend\.\(.*\)\.tar/\1/p' | head -n1)
        if [ -n "$TAG_FROM_FILE" ]; then
            export GITHUB_REF_NAME="$TAG_FROM_FILE"
            echo "🔖 이미지 태그 자동 설정: $GITHUB_REF_NAME"
        else
            export GITHUB_REF_NAME="latest"
        fi
    else
        export GITHUB_REF_NAME="latest"
    fi
else
    echo "🔖 이미지 태그 지정됨: $GITHUB_REF_NAME"
fi

# Docker 이미지 로드 (오프라인 지원)
echo "📦 Docker 이미지 로드 중..."
if [ -d "docker-images" ]; then
    for image_file in docker-images/*.tar; do
        if [ -f "$image_file" ]; then
            echo " 로드 중: $image_file"
            docker load -i "$image_file"
        fi
    done
    echo "✅ Docker 이미지 로드 완료"
else
    echo "⚠️ docker-images 디렉터리가 없습니다. 인터넷 연결이 필요할 수 있습니다."
fi

# 기존 컨테이너 정리 후, 빌드 없이 이미지로 실행
echo " 기존 Docker 컨테이너 정리 중..."
docker compose -f docker-compose.integrated.yml down || true

echo "🚀 Docker Compose 실행 중... (빌드 없이 이미지 사용)"
docker compose -f docker-compose.integrated.yml up -d

# 3. 서비스 상태 확인
echo "📊 서비스 상태 확인..."
echo ""
echo "🐳 Docker 컨테이너:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# 5. 헬스체크
echo ""
echo "🔍 헬스체크..."
sleep 5

# Backend 헬스체크
if curl -s http://localhost:3000/health > /dev/null; then
    echo "✅ Backend API: 정상"
else
    echo "❌ Backend API: 오류"
fi

# Frontend 헬스체크  
if curl -s http://localhost:8080 > /dev/null; then
    echo "✅ Frontend: 정상"
else
    echo "❌ Frontend: 오류"
fi

# Nginx 헬스체크
if curl -s http://localhost > /dev/null; then
    echo "✅ Nginx Proxy: 정상"
else
    echo "❌ Nginx Proxy: 오류"
fi

echo ""
echo "🎉 배포 완료!"
echo "🌐 웹 인터페이스: http://localhost"
echo "📚 API 문서: http://localhost:3000/docs"
echo ""
echo "📋 관리 명령어:"
echo "  상태 확인: docker ps"
echo "  로그 확인: docker logs bushub-backend"
echo "  서비스 중지: cd $SCRIPT_DIR && docker compose -f docker-compose.integrated.yml down"

# tools 권한 보강 및 사용 예시 출력 (USB_ROOT/tools 가 있을 경우)
if [ -d "$SCRIPT_DIR/../tools" ]; then
  chmod 755 "$SCRIPT_DIR/../tools" 2>/dev/null || true
  chmod +x "$SCRIPT_DIR/../tools"/*.sh 2>/dev/null || true
  echo ""
  echo "🧰 유틸 스크립트(tools) 예시:"
  echo "  sudo ./tools/bushub-status.sh"
  echo "  sudo ./tools/bushub-logs.sh 10m"
  echo "  sudo ./tools/bushub-healthcheck.sh"
  echo "  sudo ./tools/bushub-polling.sh {status|start|stop}"
fi
