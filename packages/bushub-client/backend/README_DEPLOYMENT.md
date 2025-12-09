# Backend 배포 단계별 가이드

## 📚 **관련 문서**

- [API 엔드포인트](./docs/API_ENDPOINTS.md) - 모든 API 엔드포인트 설명
- [장비별 스케줄 지원 현황](./docs/DEVICE_SPECIFICATIONS.md) - 장비별 기능 지원 현황
- [SNGIL DDC API 테스트](./docs/SNGIL_DDC_API_TEST.md) - API 테스트 가이드

## 환경별 배포 단계

백엔드는 프론트엔드와 동일하게 **development**, **staging**, **production** 세 가지 환경으로 구성되어 있습니다.

## 환경별 특징

### 🚀 Development (개발)

- **목적**: 로컬 개발 환경
- **로그 레벨**: debug
- **CORS**: 모든 origin 허용
- **Mock**: Modbus 모킹 활성화
- **데이터베이스**: `bushub_client`

### 🧪 Local (로컬)

- **목적**: 로컬 개발 환경 (IS_LOCAL=true)
- **설정**: Development 환경과 동일
- **차이점**: `IS_LOCAL=true` 플래그만 설정

### 🧪 Staging (스테이징)

- **목적**: 테스트 및 검증 환경
- **로그 레벨**: info
- **CORS**: `https://smartcity-frontend-uzjw.vercel.app`만 허용
- **Mock**: Modbus 모킹 비활성화
- **데이터베이스**: `bushub-client`

### 🏭 Production (운영)

- **목적**: 실제 운영 환경
- **로그 레벨**: info
- **CORS**: 모든 origin 허용 (개발 환경과 동일)
- **Mock**: Modbus 모킹 활성화 (개발 환경과 동일)
- **데이터베이스**: `bushub_client`

## 사용법

### 1. 환경별 개발 서버 실행

```bash
# 개발 환경
pnpm run dev:development

# 로컬 환경 (IS_LOCAL=true)
IS_LOCAL=true pnpm run dev:development

# 스테이징 환경
pnpm run dev:staging

# 운영 환경
pnpm run dev:production
```

### 2. 환경별 빌드

```bash
# 개발 환경 빌드
pnpm run build:development

# 스테이징 환경 빌드
pnpm run build:staging

# 운영 환경 빌드
pnpm run build:production
```

### 3. 환경별 서버 시작

```bash
# 개발 환경 서버 시작
pnpm run start:development

# 스테이징 환경 서버 시작
pnpm run start:staging

# 운영 환경 서버 시작
pnpm run start:production
```

### 4. 환경별 .env 파일 사용

```bash
# 환경별 .env 파일 복사
cp env.development.example .env.development
cp env.local.example .env.local
cp env.staging.example .env.staging
cp env.production.example .env.production

# 환경별 실행 (dotenv-cli 사용)
pnpm run dev:development --env-file=.env.development
pnpm run dev:staging --env-file=.env.staging
pnpm run dev:production --env-file=.env.production
```

### 5. 환경 설정 스크립트 사용

```bash
# 환경 설정 스크립트 실행
source scripts/setup-env.sh development
source scripts/setup-env.sh staging
source scripts/setup-env.sh production

# 설정 후 일반 명령어 실행
pnpm run dev
pnpm run build
pnpm run start
```

## 환경변수 설정

### 환경별 .env 파일 사용

각 환경별로 제공되는 예제 파일을 복사하여 사용하세요:

```bash
# 개발 환경
cp env.development.example .env.development

# 로컬 환경
cp env.local.example .env.local

# 스테이징 환경
cp env.staging.example .env.staging

# 운영 환경
cp env.production.example .env.production
```

### 환경별 설정값

| 환경변수            | Development               | Local                     | Staging                                                                            | Production                |
| ------------------- | ------------------------- | ------------------------- | ---------------------------------------------------------------------------------- | ------------------------- |
| APP_MODE            | development               | development               | staging                                                                            | production                |
| PORT                | 3000                      | 3000                      | 3000                                                                               | 3000                      |
| HOST                | 0.0.0.0                   | 0.0.0.0                   | 0.0.0.0                                                                            | 0.0.0.0                   |
| MONGODB_URI         | mongodb://localhost:27017 | mongodb://localhost:27017 | mongodb+srv://sinwitdev:1357913579@bushub-client.kcojcax.mongodb.net/bushub-client | mongodb://localhost:27017 |
| DB_NAME             | bushub_client             | bushub_client             | bushub-client                                                                      | bushub_client             |
| LOG_LEVEL           | debug                     | debug                     | info                                                                               | info                      |
| CORS_ORIGIN         | true                      | true                      | https://smartcity-frontend-uzjw.vercel.app                                         | true                      |
| JWT_SECRET          | sinwoo-secret-key-2024    | sinwoo-secret-key-2024    | sinwoo-secret-key-2024                                                             | sinwoo-secret-key-2024    |
| MODBUS_MOCK_ENABLED | true                      | true                      | false                                                                              | true                      |
| IS_LOCAL            | -                         | true                      | -                                                                                  | -                         |

### Modbus 통신 설정

새로운 통합 Modbus 서비스 아키텍처를 위한 환경 변수들:

| 환경변수                  | 기본값       | 설명                  | 예시               |
| ------------------------- | ------------ | --------------------- | ------------------ |
| MODBUS_MOCK_ENABLED       | true         | Mock 모드 활성화 여부 | true/false         |
| MODBUS_BAUD_RATE          | 38400        | 통신 속도 (bps)       | 9600, 19200, 38400 |
| MODBUS_PORT               | /dev/ttyUSB0 | 통신 포트             | /dev/ttyUSB0, COM1 |
| MODBUS_DATA_BITS          | 8            | 데이터 비트           | 8                  |
| MODBUS_STOP_BITS          | 1            | 정지 비트             | 1                  |
| MODBUS_PARITY             | none         | 패리티                | none, even, odd    |
| MODBUS_TIMEOUT            | 5000         | 통신 타임아웃 (ms)    | 5000               |
| MODBUS_MAX_CONNECTIONS    | 10           | 최대 동시 연결 수     | 10                 |
| MODBUS_CONNECTION_TIMEOUT | 30000        | 연결 타임아웃 (ms)    | 30000              |
| MODBUS_MAX_RETRIES        | 3            | 최대 재시도 횟수      | 3                  |
| MODBUS_RETRY_DELAY        | 1000         | 재시도 간격 (ms)      | 1000               |

### Modbus 설정 예시

```bash
# 개발 환경 (Mock 모드)
MODBUS_MOCK_ENABLED=true
MODBUS_BAUD_RATE=38400
MODBUS_PORT=/dev/ttyUSB0
MODBUS_TIMEOUT=1000

# 운영 환경 (실제 하드웨어)
MODBUS_MOCK_ENABLED=false
MODBUS_BAUD_RATE=38400
MODBUS_PORT=/dev/ttyS0
MODBUS_TIMEOUT=1000
MODBUS_MAX_RETRIES=1
```

## 🏗️ 새로운 Modbus 서비스 아키텍처

### 서비스 구조

```
UnifiedModbusService (통합 Modbus 통신)
├── ModbusCommandQueue (명령 큐 관리)
├── ModbusConnectionManager (연결 관리)
├── PriorityManager (우선순위 관리)
├── ExecutionContextManager (실행 컨텍스트)
└── RealModbusService (실제 하드웨어 통신)
```

### 주요 특징

- **하이브리드 아키텍처**: Mock 모드와 실제 하드웨어 모드 지원
- **우선순위 기반 큐**: 폴링과 제어 명령의 우선순위 관리
- **자동 재연결**: 통신 오류 시 자동 복구 및 재시도
- **연결 풀링**: 효율적인 Modbus 연결 관리
- **실시간 모니터링**: 통신 상태 및 성능 지표 제공

### 서비스 초기화 순서

1. **환경 설정 로드**: `environment.ts`에서 Modbus 설정 로드
2. **Mock/실제 모드 결정**: `MODBUS_MOCK_ENABLED` 환경 변수 기반
3. **서비스 인스턴스 생성**: `UnifiedModbusService` 생성
4. **연결 시도**: 실제 하드웨어 연결 시도 (실패 시 Mock 모드로 폴백)
5. **폴링 서비스 시작**: `UnifiedModbusPollerService` 시작

### 환경별 서비스 구성

#### 개발 환경

```typescript
// Mock 모드로 시작
MODBUS_MOCK_ENABLED = true;
// → UnifiedModbusService가 Mock 모드로 초기화
// → 실제 하드웨어 연결 시도 없음
// → 테스트 데이터로 폴링 및 제어 시뮬레이션
```

#### 운영 환경

```typescript
// 실제 하드웨어 모드로 시작
MODBUS_MOCK_ENABLED = false;
// → UnifiedModbusService가 실제 모드로 초기화
// → 실제 하드웨어 연결 시도
// → 연결 실패 시 Mock 모드로 자동 폴백
```

## Docker 환경에서 사용

Docker 환경에서는 환경변수를 통해 환경을 설정할 수 있습니다:

```bash
# 개발 환경
docker run -e APP_MODE=development -e JWT_SECRET=sinwoo-secret-key-2024 ...

# 스테이징 환경
docker run -e APP_MODE=staging -e JWT_SECRET=sinwoo-secret-key-2024 -e MONGODB_URI=mongodb+srv://sinwitdev:1357913579@bushub-client.kcojcax.mongodb.net/bushub-client ...

# 운영 환경
docker run -e APP_MODE=production -e JWT_SECRET=sinwoo-secret-key-2024 ...
```

### Docker Compose 예시

```yaml
version: '3.8'
services:
  backend:
    build: .
    environment:
      - APP_MODE=staging
      - JWT_SECRET=sinwoo-secret-key-2024
      - MONGODB_URI=mongodb+srv://sinwitdev:1357913579@bushub-client.kcojcax.mongodb.net/bushub-client
      - CORS_ORIGIN=https://smartcity-frontend-uzjw.vercel.app
      # Modbus 설정
      - MODBUS_MOCK_ENABLED=false
      - MODBUS_BAUD_RATE=38400
      - MODBUS_PORT=/dev/ttyS0
      - MODBUS_TIMEOUT=500
    ports:
      - '3000:3000'
    volumes:
      # 시리얼 포트 마운트 (Linux)
      - /dev:/dev
      # Windows의 경우 COM 포트 사용
      # - COM1:/dev/ttyS0
```

### Docker 환경에서의 Modbus 설정

#### Linux 환경

```yaml
volumes:
  - /dev:/dev # 모든 디바이스 노드 마운트
  - /dev/ttyUSB0:/dev/ttyUSB0 # 특정 USB 포트만 마운트
  - /dev/ttyS0:/dev/ttyS0 # 시리얼 포트 마운트
```

#### Windows 환경

```yaml
volumes:
  - COM1:/dev/ttyS0 # Windows COM 포트를 Linux 시리얼 포트로 매핑
```

## 환경 정보 확인

서버 시작 시 환경 정보가 로그에 출력됩니다:

```
🌍 Backend Environment Info: {
  environment: 'development',
  isDevelopment: true,
  isProduction: false,
  isStaging: false,
  config: {
    port: 3000,
    host: '0.0.0.0',
    mongoUrl: 'mongodb://localhost:27017/bushub-client',
    logLevel: 'debug',
    corsOrigin: true
  }
}

🔧 Modbus Configuration: {
  mockEnabled: true,
  baudRate: 38400,
  port: '/dev/ttyUSB0',
  timeout: 5000,
  maxRetries: 3
}

📡 Modbus Service Status: {
  mode: 'mock',
  connectionStatus: 'disconnected',
  queueStatus: 'ready',
  activeConnections: 0
}
```

## 🚀 서비스 시작 및 모니터링

### 서비스 시작 순서

1. **환경 변수 로드**: `.env` 파일 또는 환경 변수에서 설정 로드
2. **데이터베이스 연결**: MongoDB 연결 확인
3. **Modbus 서비스 초기화**: `UnifiedModbusService` 초기화
4. **폴링 서비스 시작**: `UnifiedModbusPollerService` 시작
5. **API 서버 시작**: Fastify 서버 시작

### 서비스 상태 확인

```bash
# Modbus 서비스 상태 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/sngil-ddc/test/modbus/mode \
  -d '{"action": "status"}'

# 폴링 상태 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/sngil-ddc/test/modbus/polling/status

# 주소 매핑 확인
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/sngil-ddc/test/modbus/addresses
```

### 로그 모니터링

```bash
# 실시간 로그 확인
tail -f logs/app.log

# Modbus 관련 로그만 확인
tail -f logs/app.log | grep "Modbus"

# 에러 로그 확인
tail -f logs/app.log | grep "ERROR"
```

## 주의사항

1. **환경변수 파일**: `.env` 파일은 수동으로 편집해야 합니다. 예제 파일을 복사한 후 필요한 값으로 수정하세요.
2. **보안**: 운영 환경에서는 반드시 `JWT_SECRET`을 안전한 값으로 설정하세요.
3. **데이터베이스**: 각 환경별로 다른 데이터베이스를 사용하여 데이터 격리를 유지하세요.
4. **CORS**: 운영 환경에서는 허용된 origin만 설정하여 보안을 강화하세요.
5. **Git**: `.env` 파일은 `.gitignore`에 포함되어 있으므로 Git에 커밋되지 않습니다.
6. **환경별 실행**: 각 환경에 맞는 `.env` 파일을 사용하여 실행하세요.
7. **Modbus 설정**: 실제 하드웨어 사용 시 올바른 포트와 통신 설정을 확인하세요.
8. **권한 설정**: Linux 환경에서 시리얼 포트 접근 권한을 확인하세요 (`sudo usermod -a -G dialout $USER`).
9. **하드웨어 연결**: 실제 하드웨어 연결 전 케이블과 설정을 점검하세요.
10. **Mock 모드**: 개발 및 테스트 시 Mock 모드를 활용하여 하드웨어 없이도 테스트할 수 있습니다.
