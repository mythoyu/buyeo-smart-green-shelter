# 환경 변수 가이드

이 문서는 SmartCity Bushub Client 프로젝트에서 사용하는 모든 환경 변수를 설명합니다.

## 📋 목차

- [환경 변수 개요](#환경-변수-개요)
- [애플리케이션 설정](#애플리케이션-설정)
- [데이터베이스 설정](#데이터베이스-설정)
- [Modbus 통신 설정](#modbus-통신-설정)
- [HVAC 외부 제어 설정](#hvac-외부-제어-설정)
- [보안 설정](#보안-설정)
- [로깅 설정](#로깅-설정)
- [프론트엔드 설정](#프론트엔드-설정)
- [외부 서비스 설정](#외부-서비스-설정)
- [환경별 기본값](#환경별-기본값)

---

## 환경 변수 개요

환경 변수는 `.env` 파일 또는 시스템 환경 변수로 설정할 수 있습니다. 환경별로 `.env.development`, `.env.staging`, `.env.production` 파일을 사용할 수 있습니다.

### 환경 변수 로드 순서

1. 기본 `.env` 파일
2. 환경별 `.env.{APP_MODE}` 파일 (우선순위 높음)
3. 시스템 환경 변수 (최우선)

---

## 애플리케이션 설정

### `APP_MODE`

애플리케이션 실행 모드를 설정합니다.

| 값            | 설명          | 기본값        |
| ------------- | ------------- | ------------- |
| `development` | 개발 환경     | `development` |
| `staging`     | 스테이징 환경 | -             |
| `production`  | 프로덕션 환경 | -             |

**예시**:

```bash
APP_MODE=production
```

### `NODE_ENV`

Node.js 실행 환경을 설정합니다.

| 값            | 설명          | 기본값        |
| ------------- | ------------- | ------------- |
| `development` | 개발 환경     | `development` |
| `production`  | 프로덕션 환경 | -             |

**예시**:

```bash
NODE_ENV=production
```

### `PORT`

백엔드 API 서버 포트를 설정합니다.

| 타입   | 범위    | 기본값 |
| ------ | ------- | ------ |
| Number | 1-65535 | `3000` |

**예시**:

```bash
PORT=3000
```

### `HOST`

백엔드 API 서버 호스트를 설정합니다.

| 값          | 설명                            | 기본값    |
| ----------- | ------------------------------- | --------- |
| `0.0.0.0`   | 모든 네트워크 인터페이스        | `0.0.0.0` |
| `127.0.0.1` | 로컬호스트만 (IS_LOCAL=true 시) | -         |

**예시**:

```bash
HOST=0.0.0.0
```

### `IS_LOCAL`

로컬 개발 환경 플래그입니다. `true`로 설정하면 `HOST`가 `127.0.0.1`로 설정됩니다.

| 값      | 설명           | 기본값  |
| ------- | -------------- | ------- |
| `true`  | 로컬 개발 모드 | `false` |
| `false` | 일반 모드      | `false` |

**예시**:

```bash
IS_LOCAL=true
```

---

## 데이터베이스 설정

### `MONGODB_URI`

MongoDB 연결 URI를 설정합니다.

| 타입   | 형식        | 기본값      |
| ------ | ----------- | ----------- |
| String | MongoDB URI | 환경별 상이 |

**환경별 기본값**:

- **Development**: `mongodb://localhost:27017/bushub-client`
- **Staging**: `mongodb+srv://sinwitdev:1357913579@bushub-client.kcojcax.mongodb.net/bushub-client`
- **Production**: `mongodb://localhost:27017/bushub-client`

**예시**:

```bash
MONGODB_URI=mongodb://localhost:27017/bushub_client
```

### `DB_NAME`

데이터베이스 이름을 설정합니다.

| 타입   | 기본값          |
| ------ | --------------- |
| String | `bushub_client` |

**예시**:

```bash
DB_NAME=bushub_client
```

### MongoDB 연결 설정

#### `MONGODB_MAX_RETRIES`

MongoDB 연결 최대 재시도 횟수입니다.

| 타입   | 범위 | 기본값               |
| ------ | ---- | -------------------- |
| Number | 1-10 | 개발: `3`, 운영: `5` |

#### `MONGODB_BASE_DELAY_MS`

MongoDB 재시도 기본 지연 시간(밀리초)입니다.

| 타입   | 범위      | 기본값                     |
| ------ | --------- | -------------------------- |
| Number | 100-10000 | 개발: `1000`, 운영: `2000` |

#### `MONGODB_MAX_DELAY_MS`

MongoDB 재시도 최대 지연 시간(밀리초)입니다.

| 타입   | 범위       | 기본값                       |
| ------ | ---------- | ---------------------------- |
| Number | 1000-60000 | 개발: `10000`, 운영: `30000` |

#### `MONGODB_MONITORING_INTERVAL_MS`

MongoDB 연결 모니터링 간격(밀리초)입니다.

| 타입   | 범위       | 기본값                      |
| ------ | ---------- | --------------------------- |
| Number | 1000-60000 | 개발: `5000`, 운영: `10000` |

#### `MONGODB_MAX_RECONNECT_ATTEMPTS`

MongoDB 최대 재연결 시도 횟수입니다.

| 타입   | 범위 | 기본값                |
| ------ | ---- | --------------------- |
| Number | 1-20 | 개발: `5`, 운영: `10` |

#### `MONGODB_RECONNECT_DELAY_MS`

MongoDB 재연결 지연 시간(밀리초)입니다.

| 타입   | 범위       | 기본값                     |
| ------ | ---------- | -------------------------- |
| Number | 1000-10000 | 개발: `3000`, 운영: `5000` |

#### `MONGODB_SERVER_SELECTION_TIMEOUT_MS`

MongoDB 서버 선택 타임아웃(밀리초)입니다.

| 타입   | 범위       | 기본값                     |
| ------ | ---------- | -------------------------- |
| Number | 1000-10000 | 개발: `3000`, 운영: `5000` |

#### `MONGODB_SOCKET_TIMEOUT_MS`

MongoDB 소켓 타임아웃(밀리초)입니다.

| 타입   | 범위        | 기본값                       |
| ------ | ----------- | ---------------------------- |
| Number | 10000-60000 | 개발: `30000`, 운영: `45000` |

#### `MONGODB_MAX_POOL_SIZE`

MongoDB 연결 풀 최대 크기입니다.

| 타입   | 범위 | 기본값 |
| ------ | ---- | ------ |
| Number | 5-50 | `20`   |

---

## Modbus 통신 설정

### `MODBUS_MOCK_ENABLED`

Modbus Mock 모드 활성화 여부입니다.

| 값      | 설명                             | 기본값 |
| ------- | -------------------------------- | ------ |
| `true`  | Mock 모드 (하드웨어 없이 테스트) | `true` |
| `false` | 실제 하드웨어 모드               | -      |

**예시**:

```bash
MODBUS_MOCK_ENABLED=false
```

### `MODBUS_PORT`

Modbus 통신 포트를 설정합니다.

| 타입   | 예시                                 | 기본값       |
| ------ | ------------------------------------ | ------------ |
| String | `/dev/ttyS0`, `/dev/ttyUSB0`, `COM1` | `/dev/ttyS0` |

**예시**:

```bash
MODBUS_PORT=/dev/ttyS0
```

### `MODBUS_BAUD_RATE`

Modbus 통신 속도(bps)를 설정합니다.

| 값      | 설명      | 기본값 |
| ------- | --------- | ------ |
| `9600`  | 표준 속도 | `9600` |
| `19200` | 고속      | -      |
| `38400` | 초고속    | -      |

**예시**:

```bash
MODBUS_BAUD_RATE=9600
```

### `MODBUS_DATA_BITS`

Modbus 데이터 비트 수를 설정합니다.

| 값  | 기본값 |
| --- | ------ |
| `8` | `8`    |

**예시**:

```bash
MODBUS_DATA_BITS=8
```

### `MODBUS_STOP_BITS`

Modbus 정지 비트 수를 설정합니다.

| 값  | 기본값 |
| --- | ------ |
| `1` | `1`    |

**예시**:

```bash
MODBUS_STOP_BITS=1
```

### `MODBUS_PARITY`

Modbus 패리티 비트를 설정합니다.

| 값     | 설명        | 기본값 |
| ------ | ----------- | ------ |
| `none` | 패리티 없음 | `none` |
| `even` | 짝수 패리티 | -      |
| `odd`  | 홀수 패리티 | -      |

**예시**:

```bash
MODBUS_PARITY=none
```

### `MODBUS_TIMEOUT`

Modbus 통신 타임아웃(밀리초)을 설정합니다.

| 타입   | 범위      | 기본값 |
| ------ | --------- | ------ |
| Number | 100-10000 | `1000` |

**예시**:

```bash
MODBUS_TIMEOUT=1000
```

### `MODBUS_RETRIES`

Modbus 통신 최대 재시도 횟수입니다.

| 타입   | 범위 | 기본값 |
| ------ | ---- | ------ |
| Number | 0-5  | `1`    |

**예시**:

```bash
MODBUS_RETRIES=1
```

### `MODBUS_RTSCTS`

Modbus RTS/CTS 흐름 제어 활성화 여부입니다.

| 값      | 설명             | 기본값  |
| ------- | ---------------- | ------- |
| `true`  | RTS/CTS 활성화   | `false` |
| `false` | RTS/CTS 비활성화 | `false` |

**예시**:

```bash
MODBUS_RTSCTS=false
```

---

## HVAC 외부 제어 설정

### `HVAC_EXTERNAL_CONTROL_ENABLED`

HVAC 외부 제어 기능 활성화 여부입니다.

| 값      | 설명               | 기본값  |
| ------- | ------------------ | ------- |
| `true`  | 외부 제어 활성화   | `false` |
| `false` | 외부 제어 비활성화 | `false` |

**예시**:

```bash
HVAC_EXTERNAL_CONTROL_ENABLED=true
```

### `HVAC_MANUFACTURER`

HVAC 제조사를 설정합니다.

| 값          | 설명          | 기본값 |
| ----------- | ------------- | ------ |
| `lg`        | LG 냉난방기   | -      |
| `samsung`   | 삼성 냉난방기 | -      |
| (빈 문자열) | 미설정        | -      |

**예시**:

```bash
HVAC_MANUFACTURER=lg
```

### `HVAC_MODBUS_PORT`

HVAC Modbus 통신 포트를 설정합니다.

| 타입   | 예시                         | 기본값       |
| ------ | ---------------------------- | ------------ |
| String | `/dev/ttyS1`, `/dev/ttyUSB1` | `/dev/ttyS1` |

**예시**:

```bash
HVAC_MODBUS_PORT=/dev/ttyS1
```

### `HVAC_MODBUS_BAUD_RATE`

HVAC Modbus 통신 속도(bps)를 설정합니다.

| 값     | 기본값 |
| ------ | ------ |
| `9600` | `9600` |

**예시**:

```bash
HVAC_MODBUS_BAUD_RATE=9600
```

### `HVAC_MODBUS_PARITY`

HVAC Modbus 패리티 비트를 설정합니다.

| 값     | 설명        | 기본값 |
| ------ | ----------- | ------ |
| `even` | 짝수 패리티 | `even` |
| `none` | 패리티 없음 | -      |
| `odd`  | 홀수 패리티 | -      |

**예시**:

```bash
HVAC_MODBUS_PARITY=even
```

---

## 보안 설정

### `JWT_SECRET`

JWT 토큰 서명에 사용하는 비밀 키입니다.

| 타입   | 설명                | 기본값                    |
| ------ | ------------------- | ------------------------- |
| String | 최소 32자 이상 권장 | `youjobs-secret-key-2025` |

**⚠️ 주의**: 프로덕션 환경에서는 반드시 강력한 비밀 키로 변경하세요.

**예시**:

```bash
JWT_SECRET=your-very-secure-secret-key-here
```

### `CORS_ORIGIN`

CORS 허용 Origin을 설정합니다.

| 값                                      | 설명                         | 기본값 |
| --------------------------------------- | ---------------------------- | ------ |
| `true`                                  | 모든 Origin 허용             | `true` |
| `https://example.com`                   | 특정 Origin만 허용           | -      |
| `https://example.com,https://other.com` | 여러 Origin 허용 (쉼표 구분) | -      |

**예시**:

```bash
CORS_ORIGIN=https://smartcity-frontend-uzjw.vercel.app
```

---

## 로깅 설정

### `LOG_LEVEL`

로그 레벨을 설정합니다.

| 값      | 설명                | 기본값        |
| ------- | ------------------- | ------------- |
| `debug` | 모든 로그 출력      | 개발: `debug` |
| `info`  | 정보 이상 로그 출력 | 운영: `info`  |
| `warn`  | 경고 이상 로그 출력 | -             |
| `error` | 에러만 출력         | -             |

**예시**:

```bash
LOG_LEVEL=info
```

---

## 프론트엔드 설정

### `VITE_API_BASE_URL`

프론트엔드에서 사용하는 API 기본 URL입니다.

| 타입   | 예시                           | 기본값    |
| ------ | ------------------------------ | --------- |
| String | `http://localhost:3000/api/v1` | 동적 생성 |

**예시**:

```bash
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### `VITE_WS_URL`

프론트엔드에서 사용하는 WebSocket URL입니다.

| 타입   | 예시                     | 기본값    |
| ------ | ------------------------ | --------- |
| String | `ws://localhost:3000/ws` | 동적 생성 |

**예시**:

```bash
VITE_WS_URL=ws://localhost:3000/ws
```

### `VITE_IS_LOCAL`

프론트엔드 로컬 개발 환경 플래그입니다.

| 값      | 설명           | 기본값 |
| ------- | -------------- | ------ |
| `true`  | 로컬 개발 모드 | -      |
| `false` | 일반 모드      | -      |

**예시**:

```bash
VITE_IS_LOCAL=true
```

---

## 외부 서비스 설정

### `SUPERIOR_SERVER_URL`

상위 서버 URL을 설정합니다.

| 타입   | 예시                                   | 기본값                                 |
| ------ | -------------------------------------- | -------------------------------------- |
| String | `http://10.20.60.145:9202/api/v1/ping` | `http://10.20.60.145:9202/api/v1/ping` |

**예시**:

```bash
SUPERIOR_SERVER_URL=http://10.20.60.145:9202/api/v1/ping
```

---

## 기타 설정

### `FORCE_DB_INIT`

데이터베이스 강제 초기화 플래그입니다.

| 값      | 설명        | 기본값  |
| ------- | ----------- | ------- |
| `true`  | 강제 초기화 | `false` |
| `false` | 일반 모드   | `false` |

**⚠️ 주의**: `true`로 설정하면 기존 데이터가 삭제될 수 있습니다.

### `USERS_CONFIG_PATH`

사용자 설정 파일 경로입니다.

| 타입   | 기본값                    |
| ------ | ------------------------- |
| String | `./src/config/users.json` |

**예시**:

```bash
USERS_CONFIG_PATH=./src/config/users.json
```

---

## 환경별 기본값

### Development 환경

```bash
APP_MODE=development
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=debug
CORS_ORIGIN=true
MODBUS_MOCK_ENABLED=true
MONGODB_URI=mongodb://localhost:27017/bushub-client
DB_NAME=bushub_client
JWT_SECRET=youjobs-secret-key-2025
```

### Staging 환경

```bash
APP_MODE=staging
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
CORS_ORIGIN=https://smartcity-frontend-uzjw.vercel.app
MODBUS_MOCK_ENABLED=false
MONGODB_URI=mongodb+srv://sinwitdev:1357913579@bushub-client.kcojcax.mongodb.net/bushub-client
DB_NAME=bushub-client
JWT_SECRET=youjobs-secret-key-2025
```

### Production 환경

```bash
APP_MODE=production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
CORS_ORIGIN=true
MODBUS_MOCK_ENABLED=false
MODBUS_BAUD_RATE=9600
MODBUS_PORT=/dev/ttyS0
MODBUS_TIMEOUT=1000
MODBUS_RETRIES=1
MONGODB_URI=mongodb://localhost:27017/bushub-client
DB_NAME=bushub_client
JWT_SECRET=youjobs-secret-key-2025
```

---

## 환경 변수 설정 예시

### 개발 환경 (.env.development)

```bash
# 애플리케이션 설정
APP_MODE=development
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
IS_LOCAL=true

# 데이터베이스
MONGODB_URI=mongodb://localhost:27017/bushub_client
DB_NAME=bushub_client

# 로깅
LOG_LEVEL=debug

# 보안
JWT_SECRET=youjobs-secret-key-2025
CORS_ORIGIN=true

# Modbus
MODBUS_MOCK_ENABLED=true
MODBUS_PORT=/dev/ttyUSB0
MODBUS_BAUD_RATE=9600
```

### 프로덕션 환경 (.env.production)

```bash
# 애플리케이션 설정
APP_MODE=production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# 데이터베이스
MONGODB_URI=mongodb://localhost:27017/bushub_client
DB_NAME=bushub_client

# 로깅
LOG_LEVEL=info

# 보안
JWT_SECRET=CHANGE-THIS-TO-SECURE-SECRET-KEY
CORS_ORIGIN=https://yourdomain.com

# Modbus
MODBUS_MOCK_ENABLED=false
MODBUS_PORT=/dev/ttyS0
MODBUS_BAUD_RATE=9600
MODBUS_TIMEOUT=1000
MODBUS_RETRIES=1

# HVAC 외부 제어
HVAC_EXTERNAL_CONTROL_ENABLED=true
HVAC_MANUFACTURER=lg
HVAC_MODBUS_PORT=/dev/ttyS1
HVAC_MODBUS_BAUD_RATE=9600
HVAC_MODBUS_PARITY=even
```

---

## 주의사항

1. **보안**: `.env` 파일은 Git에 커밋하지 마세요. `.gitignore`에 포함되어 있습니다.
2. **민감 정보**: `JWT_SECRET`, `MONGODB_URI` 등 민감한 정보는 환경 변수로 관리하세요.
3. **환경별 분리**: 각 환경별로 다른 `.env` 파일을 사용하여 데이터 격리를 유지하세요.
4. **기본값 확인**: 환경 변수가 설정되지 않은 경우 기본값이 사용됩니다.
5. **타입 확인**: 숫자 타입 환경 변수는 문자열로 설정되므로 `Number()` 변환이 필요합니다.

---

## 관련 문서

- [배포 가이드](./DEPLOYMENT_GUIDE.md) - 배포 및 설치 방법
- [아키텍처 문서](./ARCHITECTURE.md) - 시스템 아키텍처 설명

---

**마지막 업데이트**: 2025-01-XX  
**버전**: 1.0.0
