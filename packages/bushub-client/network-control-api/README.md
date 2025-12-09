# Network Control API Service

Bushub Client의 네트워크 제어를 위한 독립적인 API 서비스입니다.

## 🚀 주요 기능

- **네트워크 인터페이스 관리** - 이더넷, WiFi 인터페이스 조회 및 상태 확인
- **네트워크 설정** - DHCP/정적 IP 설정, 게이트웨이, DNS 설정
- **WiFi 관리** - WiFi 네트워크 스캔, 연결, 연결 해제
- **네트워크 통계** - 실시간 네트워크 사용량 및 성능 모니터링
- **RESTful API** - 표준 HTTP API를 통한 네트워크 제어

## 📋 API 엔드포인트

### Health Check

- `GET /api/health` - 서버 상태 확인
- `GET /api/ready` - 서비스 준비 상태 확인
- `GET /api/live` - 서비스 생존 상태 확인

### Network Management

- `GET /api/network/interfaces` - 네트워크 인터페이스 목록
- `GET /api/network/status` - 네트워크 상태 조회
- `POST /api/network/configure` - 네트워크 인터페이스 설정
- `GET /api/network/stats` - 네트워크 통계 조회

### WiFi Management

- `GET /api/network/wifi/scan` - 사용 가능한 WiFi 네트워크 스캔
- `POST /api/network/wifi/connect` - WiFi 네트워크 연결
- `POST /api/network/wifi/disconnect` - WiFi 연결 해제

## 🛠️ 기술 스택

- **Runtime**: Node.js 18
- **Framework**: Fastify
- **Language**: TypeScript
- **Logging**: Winston with Daily Rotate File
- **Validation**: Zod
- **Security**: Helmet, CORS, Rate Limiting
- **Documentation**: Swagger/OpenAPI

## 🚀 실행 방법

### 개발 환경

```bash
cd packages/bushub-client/network-control-api
pnpm install
pnpm run dev
```

### Docker로 실행

```bash
# 통합 서비스로 실행
cd packages/bushub-client
./start-integrated.sh

# 또는 개별 실행
docker compose -f docker-compose.integrated.yml up network-control-api
```

### 프로덕션 환경

```bash
pnpm run build:production
pnpm run start:production
```

### systemd 서비스로 등록

```bash
# 서비스 설치 및 시작
cd packages/bushub-client/network-control-api
../../scripts/install-network-control-api.sh

# 서비스 관리 명령어
sudo systemctl start bushub-network-control-api    # 시작
sudo systemctl stop bushub-network-control-api     # 중지
sudo systemctl restart bushub-network-control-api  # 재시작
sudo systemctl status bushub-network-control-api   # 상태 확인
sudo journalctl -u bushub-network-control-api -f   # 로그 확인
```

## 📊 서비스 정보

- **포트**: 3001
- **호스트**: 0.0.0.0
- **API 문서**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/api/health

## 🔧 환경 변수

```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info
```

## 📁 프로젝트 구조

```
network-control-api/
├── src/
│   ├── api/
│   │   └── routes/          # API 라우트
│   ├── services/            # 비즈니스 로직
│   ├── config/              # 설정 파일
│   ├── utils/               # 유틸리티 함수
│   └── types/               # TypeScript 타입
├── tests/                   # 테스트 파일
├── docs/                    # 문서
├── logs/                    # 로그 파일
├── Dockerfile
├── package.json
└── tsconfig.json
```

## 🔒 보안 기능

- **Helmet**: HTTP 보안 헤더 설정
- **CORS**: Cross-Origin Resource Sharing 설정
- **Rate Limiting**: API 호출 제한 (100회/분)
- **Input Validation**: Zod를 통한 입력 검증
- **Error Handling**: 표준화된 에러 응답

## 📝 로깅

- **Console**: 개발 환경용 컬러 로그
- **File**: 일별 로그 파일 자동 회전
- **Levels**: debug, info, warn, error
- **Format**: JSON (파일), 컬러 (콘솔)

## 🧪 테스트

```bash
# 전체 테스트
pnpm test

# 단위 테스트
pnpm test:unit

# 통합 테스트
pnpm test:integration
```

## 📚 API 사용 예시

### 네트워크 인터페이스 조회

```bash
curl http://localhost:3001/api/network/interfaces
```

### WiFi 네트워크 스캔

```bash
curl http://localhost:3001/api/network/wifi/scan
```

### WiFi 연결

```bash
curl -X POST http://localhost:3001/api/network/wifi/connect \
  -H "Content-Type: application/json" \
  -d '{"ssid": "MyWiFi", "password": "password123"}'
```

### 네트워크 설정

```bash
curl -X POST http://localhost:3001/api/network/configure \
  -H "Content-Type: application/json" \
  -d '{
    "interface": "eth0",
    "dhcp": false,
    "ipv4": "192.168.1.100",
    "gateway": "192.168.1.1",
    "dns": ["8.8.8.8", "8.8.4.4"]
  }'
```

## 🔄 통합 서비스

이 서비스는 Bushub Client의 통합 Docker Compose 환경에 포함되어 있으며, nginx를 통해 프록시됩니다:

- **외부 접속**: http://localhost/network/
- **내부 접속**: http://network-control-api:3001/api/
