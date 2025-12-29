# 배포 및 설치 가이드

이 문서는 SmartCity Bushub Client 시스템의 배포 및 설치 방법을 설명합니다.

## 📋 목차

- [배포 방법 개요](#배포-방법-개요)
- [Docker Compose를 사용한 배포](#docker-compose를-사용한-배포)
- [systemd 서비스를 사용한 배포](#systemd-서비스를-사용한-배포)
- [환경별 설정](#환경별-설정)
- [배포 스크립트 설명](#배포-스크립트-설명)
- [문제 해결](#문제-해결)

---

## 배포 방법 개요

Bushub Client는 두 가지 배포 방법을 지원합니다:

1. **Docker Compose 배포** (개발/테스트용)
   - 빠른 설정 및 실행
   - 개발 환경에 적합
   - `docker-compose.integrated.yml` 사용

2. **systemd 서비스 배포** (프로덕션용)
   - 안정적인 운영 환경
   - USB 오프라인 설치 지원
   - 자동 시작 및 재시작

---

## Docker Compose를 사용한 배포

### 사전 요구사항

- Docker (20.10 이상)
- Docker Compose V2
- 최소 4GB RAM
- 최소 10GB 디스크 공간

### 빠른 시작

```bash
# 프로젝트 루트에서
cd packages/bushub-client

# 통합 서비스 실행
docker compose -f docker-compose.integrated.yml up -d

# 서비스 상태 확인
docker compose -f docker-compose.integrated.yml ps

# 로그 확인
docker compose -f docker-compose.integrated.yml logs -f
```

### 서비스 구성

Docker Compose 배포 시 다음 서비스가 실행됩니다:

| 서비스 | 포트 | 설명 |
|--------|------|------|
| **MongoDB** | 27017 | 데이터베이스 |
| **Backend** | 3000 | API 서버 |
| **Frontend** | 8080 | 웹 서버 |
| **Nginx** | 80, 443 | 리버스 프록시 |

### 접근 방법

- **웹 인터페이스**: http://localhost
- **Backend API**: http://localhost:3000
- **Frontend 직접**: http://localhost:8080

### 서비스 관리

```bash
# 서비스 시작
docker compose -f docker-compose.integrated.yml up -d

# 서비스 중지
docker compose -f docker-compose.integrated.yml down

# 서비스 재시작
docker compose -f docker-compose.integrated.yml restart

# 특정 서비스만 재시작
docker compose -f docker-compose.integrated.yml restart backend

# 로그 확인
docker compose -f docker-compose.integrated.yml logs -f backend

# 서비스 상태 확인
docker compose -f docker-compose.integrated.yml ps
```

### 환경 변수 설정

Docker Compose 배포 시 환경 변수를 설정하려면:

```bash
# 환경 변수 파일 생성
cat > .env << EOF
GITHUB_REF_NAME=latest
MODBUS_MOCK_ENABLED=false
MODBUS_BAUD_RATE=9600
HVAC_EXTERNAL_CONTROL_ENABLED=false
HVAC_MANUFACTURER=
HVAC_MODBUS_PORT=/dev/ttyS1
HVAC_MODBUS_BAUD_RATE=9600
HVAC_MODBUS_PARITY=even
EOF

# 환경 변수와 함께 실행
docker compose -f docker-compose.integrated.yml --env-file .env up -d
```

### 시리얼 포트 마운트 (Modbus 통신)

Linux 환경에서 시리얼 포트를 사용하려면:

```yaml
# docker-compose.integrated.yml에 이미 포함됨
volumes:
  - /dev/ttyS0:/dev/ttyS0:rw  # Modbus 통신용
  - /dev/ttyS1:/dev/ttyS1:rw  # 냉난방기 외부제어용
```

**주의사항**:
- 시리얼 포트 접근 권한 확인: `sudo usermod -a -G dialout $USER`
- 컨테이너 재시작 후 권한 확인

---

## systemd 서비스를 사용한 배포

### 사전 요구사항

- Linux (Ubuntu 22.04 권장)
- Docker (20.10 이상)
- Node.js 18+ (Network Control API용)
- 최소 2GB RAM
- 최소 5GB 디스크 공간

### USB 오프라인 설치

USB에 모든 파일이 포함된 완전 오프라인 설치를 지원합니다.

#### 1단계: USB 준비

```bash
# USB에 다음 구조로 파일 배치
USB_ROOT/
├── packages/
│   └── bushub-client/
│       ├── deploy-hybrid.sh
│       ├── usb-installer.sh
│       ├── frontend/
│       ├── backend/
│       ├── mongodb/
│       ├── nginx/
│       ├── network-control-api/
│       └── scripts/
└── tools/
```

#### 2단계: 설치 실행

```bash
# USB 루트에서
cd USB_ROOT
sudo bash packages/bushub-client/usb-installer.sh
```

또는 단계별 실행:

```bash
cd packages/bushub-client

# 1단계: 시스템 설치
sudo bash scripts/main-01-install.sh

# 2단계: 서비스 시작
sudo bash scripts/main-02-start.sh

# 3단계: 상태 확인
sudo bash scripts/main-03-status.sh

# 4단계: 로그 확인
sudo bash scripts/main-04-logs.sh
```

### 하이브리드 배포 (온라인/오프라인)

`deploy-hybrid.sh` 스크립트는 온라인 및 오프라인 환경을 모두 지원합니다.

```bash
cd packages/bushub-client
sudo bash deploy-hybrid.sh
```

**스크립트 동작**:
1. 의존성 체크 (Docker, Node.js, pnpm 등)
2. 누락된 의존성 자동 설치 (온라인 환경)
3. Docker 이미지 빌드 또는 로드
4. systemd 서비스 설치 및 설정
5. 서비스 시작

### systemd 서비스 관리

설치된 서비스 목록:

- `bushub-mongodb.service` - MongoDB 데이터베이스
- `bushub-backend.service` - Backend API 서버
- `bushub-frontend.service` - Frontend 웹 서버
- `bushub-nginx.service` - Nginx 리버스 프록시
- `bushub-network-control-api.service` - Network Control API

#### 서비스 명령어

```bash
# 서비스 시작
sudo systemctl start bushub-mongodb
sudo systemctl start bushub-backend
sudo systemctl start bushub-frontend
sudo systemctl start bushub-nginx
sudo systemctl start bushub-network-control-api

# 서비스 중지
sudo systemctl stop bushub-mongodb
sudo systemctl stop bushub-backend
sudo systemctl stop bushub-frontend
sudo systemctl stop bushub-nginx
sudo systemctl stop bushub-network-control-api

# 서비스 재시작
sudo systemctl restart bushub-mongodb
sudo systemctl restart bushub-backend

# 서비스 상태 확인
sudo systemctl status bushub-mongodb
sudo systemctl status bushub-backend

# 서비스 활성화 (부팅 시 자동 시작)
sudo systemctl enable bushub-mongodb
sudo systemctl enable bushub-backend
sudo systemctl enable bushub-frontend
sudo systemctl enable bushub-nginx
sudo systemctl enable bushub-network-control-api

# 서비스 비활성화
sudo systemctl disable bushub-mongodb
```

#### 로그 확인

```bash
# systemd 로그 확인
sudo journalctl -u bushub-backend -f
sudo journalctl -u bushub-frontend -f
sudo journalctl -u bushub-nginx -f

# 파일 로그 확인
sudo tail -f /opt/bushub/logs/backend.log
sudo tail -f /opt/bushub/logs/frontend.log
```

### 설치 위치

systemd 서비스 배포 시 다음 위치에 설치됩니다:

```
/opt/bushub/
├── frontend/          # Frontend 파일
├── backend/           # Backend 파일
├── mongodb/           # MongoDB 설정
├── nginx/             # Nginx 설정
├── network-control-api/ # Network Control API
├── logs/              # 로그 파일
├── data/              # MongoDB 데이터
└── config/            # 설정 파일
```

---

## 환경별 설정

### 환경 종류

| 환경 | 목적 | 로그 레벨 | Modbus Mock | 데이터베이스 |
|------|------|-----------|-------------|--------------|
| **Development** | 로컬 개발 | debug | 활성화 | `bushub_client` |
| **Staging** | 테스트/검증 | info | 비활성화 | `bushub-client` |
| **Production** | 실제 운영 | info | 비활성화 | `bushub_client` |

### 환경 변수 설정

환경별 설정은 `.env` 파일 또는 환경 변수로 관리합니다.

#### Development 환경

```bash
# .env.development
APP_MODE=development
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/bushub_client
LOG_LEVEL=debug
CORS_ORIGIN=true
MODBUS_MOCK_ENABLED=true
```

#### Production 환경

```bash
# .env.production
APP_MODE=production
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/bushub_client
LOG_LEVEL=info
CORS_ORIGIN=true
MODBUS_MOCK_ENABLED=false
MODBUS_BAUD_RATE=9600
MODBUS_PORT=/dev/ttyS0
```

자세한 환경 변수 목록은 [환경 변수 가이드](./ENVIRONMENT_VARIABLES.md)를 참조하세요.

---

## 배포 스크립트 설명

### 주요 스크립트

#### `deploy-hybrid.sh`

하이브리드 배포 스크립트 (온라인/오프라인 지원)

**기능**:
- 의존성 자동 체크 및 설치
- Docker 이미지 빌드 또는 로드
- systemd 서비스 설치
- Network Control API 설치

**사용법**:
```bash
cd packages/bushub-client
sudo bash deploy-hybrid.sh
```

#### `usb-installer.sh`

USB 오프라인 설치 스크립트

**기능**:
- 완전 오프라인 설치
- `deploy-hybrid.sh` 호출

**사용법**:
```bash
# USB 루트에서
sudo bash usb-installer.sh
```

#### `start-dev.sh`

개발 환경 시작 스크립트

**기능**:
- Docker Compose 개발 환경 실행

**사용법**:
```bash
cd packages/bushub-client
./start-dev.sh
```

### 단계별 설치 스크립트

#### `scripts/main-01-install.sh`

1단계: 시스템 설치

**기능**:
- 시스템 디렉토리 생성
- 파일 복사
- 권한 설정
- systemd 서비스 생성 및 활성화

#### `scripts/main-02-start.sh`

2단계: 서비스 시작

**기능**:
- 모든 서비스 시작
- 서비스 상태 확인

#### `scripts/main-03-status.sh`

3단계: 상태 확인

**기능**:
- 서비스 상태 확인
- 포트 확인
- 프로세스 확인
- 웹 접속 테스트

#### `scripts/main-04-logs.sh`

4단계: 로그 확인

**기능**:
- systemd 로그 확인
- 파일 로그 확인

### 운영 스크립트

#### `scripts/ops-restart.sh`

서비스 재시작

```bash
sudo bash scripts/ops-restart.sh
```

#### `scripts/ops-stop.sh`

서비스 중지

```bash
sudo bash scripts/ops-stop.sh
```

#### `scripts/ops-update.sh`

USB에서 업데이트

```bash
# USB에서 새 파일 복사 후
sudo bash scripts/ops-update.sh
```

#### `scripts/ops-uninstall.sh`

서비스 제거

```bash
sudo bash scripts/ops-uninstall.sh
```

---

## 문제 해결

### Docker 관련 문제

#### Docker가 설치되지 않음

```bash
# Docker 설치 스크립트 실행
sudo bash install-docker.sh
```

#### Docker Compose 실행 실패

```bash
# Docker Compose V2 확인
docker compose version

# 권한 문제인 경우
sudo usermod -aG docker $USER
newgrp docker
```

#### 포트 충돌

```bash
# 포트 사용 확인
sudo netstat -tlnp | grep -E ":(80|3000|27017|8080)"

# 사용 중인 프로세스 종료
sudo kill -9 <PID>
```

### systemd 서비스 문제

#### 서비스 시작 실패

```bash
# 서비스 상태 확인
sudo systemctl status bushub-backend

# 로그 확인
sudo journalctl -u bushub-backend -n 50

# 서비스 파일 확인
sudo systemctl cat bushub-backend
```

#### 서비스가 자동 시작되지 않음

```bash
# 서비스 활성화 확인
sudo systemctl is-enabled bushub-backend

# 서비스 활성화
sudo systemctl enable bushub-backend
```

### Modbus 통신 문제

#### 시리얼 포트 접근 권한 오류

```bash
# dialout 그룹에 사용자 추가
sudo usermod -a -G dialout $USER

# 로그아웃 후 재로그인 또는
newgrp dialout
```

#### 시리얼 포트를 찾을 수 없음

```bash
# 사용 가능한 시리얼 포트 확인
ls -l /dev/ttyS* /dev/ttyUSB*

# 권한 확인
ls -l /dev/ttyS0
```

### MongoDB 연결 문제

#### MongoDB 연결 실패

```bash
# MongoDB 서비스 상태 확인
sudo systemctl status bushub-mongodb

# MongoDB 로그 확인
sudo journalctl -u bushub-mongodb -n 50

# MongoDB 연결 테스트
docker exec -it bushub-db mongosh
```

#### 데이터베이스 초기화 실패

```bash
# MongoDB 데이터 디렉토리 권한 확인
sudo ls -l /opt/bushub/data

# 권한 수정
sudo chown -R 999:999 /opt/bushub/data
```

### 네트워크 문제

#### 웹 인터페이스 접근 불가

```bash
# Nginx 서비스 상태 확인
sudo systemctl status bushub-nginx

# Nginx 설정 확인
sudo nginx -t

# 포트 확인
sudo netstat -tlnp | grep :80
```

#### API 접근 불가

```bash
# Backend 서비스 상태 확인
sudo systemctl status bushub-backend

# Backend 로그 확인
sudo journalctl -u bushub-backend -n 50

# API 헬스 체크
curl http://localhost:3000/api/health
```

### 로그 확인

#### 실시간 로그 확인

```bash
# systemd 로그
sudo journalctl -u bushub-backend -f

# 파일 로그
sudo tail -f /opt/bushub/logs/backend.log

# Docker 로그
docker logs -f bushub-backend
```

#### 로그 파일 위치

- **systemd 로그**: `journalctl -u <service-name>`
- **Backend 로그**: `/opt/bushub/logs/backend.log`
- **Frontend 로그**: `/opt/bushub/logs/frontend.log`
- **MongoDB 로그**: `/opt/bushub/logs/mongodb.log`
- **Nginx 로그**: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`

---

## 관련 문서

- [환경 변수 가이드](./ENVIRONMENT_VARIABLES.md) - 모든 환경 변수 설명
- [아키텍처 문서](./ARCHITECTURE.md) - 시스템 아키텍처 설명
- [개발 가이드](./DEVELOPMENT_GUIDE.md) - 개발 환경 설정
- [운영 가이드](./OPERATIONS_GUIDE.md) - 운영 및 모니터링
- [릴리즈 가이드](../RELEASE.md) - 릴리즈 프로세스

---

**마지막 업데이트**: 2025-01-XX  
**버전**: 1.0.0

