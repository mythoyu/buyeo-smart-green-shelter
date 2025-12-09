# SNGIL DDC API 테스트 가이드

## 개요

SNGIL DDC 컨트롤러의 각 커맨드를 테스트할 수 있는 API 엔드포인트들을 제공합니다. 이 API를 통해 DO 제어, 스케줄 설정, HVAC 상태 확인, 센서 데이터 읽기 등을 테스트할 수 있습니다.

## API 엔드포인트

### 기본 정보

- **Base URL**: `/api/v1/internal/sngil-ddc`
- **인증**: API Key 인증 필요
- **Content-Type**: `application/json`

### 1. 연결 관리

#### SNGIL DDC 연결

```http
POST /api/v1/internal/sngil-ddc/test/connect
```

**요청 본문:**

```json
{
  "deviceId": "sngil-ddc-001",
  "unitId": "unit-001",
  "slaveId": 1,
  "baudRate": 9600,
  "port": "COM1",
  "pollingInterval": 30000
}
```

**응답:**

```json
{
  "success": true,
  "message": "SNGIL DDC 연결 성공",
  "data": {
    "connected": true,
    "config": {
      "deviceId": "sngil-ddc-001",
      "unitId": "unit-001",
      "slaveId": 1,
      "baudRate": 9600,
      "port": "COM1",
      "pollingInterval": 30000
    }
  }
}
```

#### 연결 해제

```http
POST /api/v1/internal/sngil-ddc/test/disconnect
```

#### 연결 상태 확인

```http
GET /api/v1/internal/sngil-ddc/test/status
```

### 2. DO 제어

#### DO 모드 설정

```http
POST /api/v1/internal/sngil-ddc/test/do/mode
```

**요청 본문:**

```json
{
  "doNumber": 1,
  "mode": "manual" // "manual" 또는 "schedule"
}
```

#### DO 수동 제어

```http
POST /api/v1/internal/sngil-ddc/test/do/manual
```

**요청 본문:**

```json
{
  "doNumber": 1,
  "operation": "run" // "stop" 또는 "run"
}
```

#### DO 상태 읽기 (단일)

```http
GET /api/v1/internal/sngil-ddc/test/do/status?doNumber=1
```

#### DO 상태 일괄 읽기

```http
GET /api/v1/internal/sngil-ddc/test/do/batch
```

### 3. 스케줄 설정

#### 스케줄 설정

```http
POST /api/v1/internal/sngil-ddc/test/schedule
```

**요청 본문:**

```json
{
  "doNumber": 1,
  "scheduleType": "1-1", // "1-1" 또는 "1-2"
  "timeType": "start", // "start" 또는 "end"
  "time": {
    "hour": 9,
    "minute": 0
  }
}
```

### 4. HVAC 상태

#### HVAC 상태 읽기

```http
GET /api/v1/internal/sngil-ddc/test/hvac
```

**응답:**

```json
{
  "success": true,
  "message": "HVAC 상태 읽기 성공",
  "data": {
    "mode": 3, // 0:냉방, 1:제습, 2:송풍, 3:자동, 4:난방
    "speed": 2, // 1:약, 2:중, 3:강, 4:자동
    "contTemp": 220, // 설정온도 (16.0°C)
    "curTemp": 225, // 현재온도 (22.5°C)
    "errorCode": 0 // 에러코드
  }
}
```

### 5. 센서 데이터

#### 통합센서 데이터 읽기

```http
GET /api/v1/internal/sngil-ddc/test/sensor
```

**응답:**

```json
{
  "success": true,
  "message": "통합센서 데이터 읽기 성공",
  "data": {
    "pm1": 15, // 초초미세먼지 PM1.0 (μg/m³)
    "pm25": 25, // 초미세먼지 PM2.5 (μg/m³)
    "pm10": 45, // 미세먼지 PM10 (μg/m³)
    "co2": 450, // CO2 (ppm)
    "voc": 120, // 유기화합물 (ppb)
    "temperature": 22, // 온도 (°C)
    "humidity": 55 // 습도 (%)
  }
}
```

## 테스트 시나리오

### 1. 기본 연결 테스트

```bash
# 1. 연결 상태 확인
curl -X GET "http://localhost:3000/api/v1/internal/sngil-ddc/test/status" \
  -H "X-API-Key: your-api-key"

# 2. SNGIL DDC 연결
curl -X POST "http://localhost:3000/api/v1/internal/sngil-ddc/test/connect" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "deviceId": "sngil-ddc-001",
    "unitId": "unit-001",
    "slaveId": 1,
    "baudRate": 9600,
    "port": "COM1",
    "pollingInterval": 30000
  }'

# 3. 연결 상태 재확인
curl -X GET "http://localhost:3000/api/v1/internal/sngil-ddc/test/status" \
  -H "X-API-Key: your-api-key"
```

### 2. DO 제어 테스트

```bash
# 1. DO1을 수동 모드로 설정
curl -X POST "http://localhost:3000/api/v1/internal/sngil-ddc/test/do/mode" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"doNumber": 1, "mode": "manual"}'

# 2. DO1을 운전 상태로 설정
curl -X POST "http://localhost:3000/api/v1/internal/sngil-ddc/test/do/manual" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"doNumber": 1, "operation": "run"}'

# 3. DO 상태 확인
curl -X GET "http://localhost:3000/api/v1/internal/sngil-ddc/test/do/status?doNumber=1" \
  -H "X-API-Key: your-api-key"

# 4. 모든 DO 상태 확인
curl -X GET "http://localhost:3000/api/v1/internal/sngil-ddc/test/do/batch" \
  -H "X-API-Key: your-api-key"
```

### 3. 스케줄 설정 테스트

```bash
# DO1의 1-1 스케줄 시작 시간을 오전 9시로 설정
curl -X POST "http://localhost:3000/api/v1/internal/sngil-ddc/test/schedule" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "doNumber": 1,
    "scheduleType": "1-1",
    "timeType": "start",
    "time": {"hour": 9, "minute": 0}
  }'

# DO1의 1-1 스케줄 종료 시간을 오후 6시로 설정
curl -X POST "http://localhost:3000/api/v1/internal/sngil-ddc/test/schedule" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{
    "doNumber": 1,
    "scheduleType": "1-1",
    "timeType": "end",
    "time": {"hour": 18, "minute": 0}
  }'
```

### 4. HVAC 및 센서 테스트

```bash
# HVAC 상태 확인
curl -X GET "http://localhost:3000/api/v1/internal/sngil-ddc/test/hvac" \
  -H "X-API-Key: your-api-key"

# 센서 데이터 확인
curl -X GET "http://localhost:3000/api/v1/internal/sngil-ddc/test/sensor" \
  -H "X-API-Key: your-api-key"
```

## 주의사항

### 1. 연결 순서

1. 먼저 `/test/connect` 엔드포인트로 SNGIL DDC에 연결
2. 연결 성공 후 다른 제어 명령어 사용
3. 사용 완료 후 `/test/disconnect`로 연결 해제

### 2. DO 번호 제한

- **DO1~DO13**: 모든 기능 지원 (모드, 수동제어, 스케줄)
- **DO14~DO15**: 제한적 스케줄 지원 (1-2 스케줄만)
- **DO16**: 수동제어만 지원

### 3. 스케줄 타입별 지원

- **1-1 스케줄**: DO1~DO13만 지원
- **1-2 스케줄**: DO1~DO4, DO14, DO15만 지원

### 4. 에러 처리

- 연결되지 않은 상태에서 제어 명령어 사용 시 400 에러
- Modbus 통신 실패 시 500 에러
- 잘못된 DO 번호나 설정값 사용 시 400 에러

## 테스트 엔드포인트

### 1. DDC 테스트 정보

```http
GET /api/v1/internal/sngil-ddc/test/info
```

**응답:**

```json
{
  "success": true,
  "message": "DDC 테스트 엔드포인트 호출 성공",
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "status": "connected",
    "connection": {
      "isConnected": true,
      "config": { ... }
    },
    "availableEndpoints": [
      "POST /connect - SNGIL DDC 연결",
      "POST /disconnect - SNGIL DDC 연결 해제",
      "GET /status - 연결 상태 확인",
      "POST /do/mode - DO 모드 설정",
      "POST /do/manual - DO 수동 제어",
      "GET /do/status - DO 상태 읽기",
      "GET /do/status/batch - DO 상태 일괄 읽기",
      "POST /schedule - 스케줄 설정",
      "GET /hvac/status - HVAC 상태 읽기",
      "GET /sensor/data - 통합센서 데이터 읽기",
      "GET /test/info - DDC 테스트 정보 (현재 엔드포인트)"
    ]
  }
}
```

### 2. DO 테스트

```http
POST /api/v1/internal/sngil-ddc/test/do/test
```

**요청 본문:**

```json
{
  "doNumber": 1,
  "testType": "mode",
  "value": "manual"
}
```

**테스트 타입:**

- `mode`: DO 모드 설정 (manual/schedule)
- `manual`: DO 수동 제어 (stop/run)
- `status`: DO 상태 읽기

### 3. 스케줄 테스트

```http
POST /api/v1/internal/sngil-ddc/test/schedule/test
```

**요청 본문:**

```json
{
  "doNumber": 1,
  "scheduleType": "1-1",
  "timeType": "start",
  "time": {
    "hour": 9,
    "minute": 0
  }
}
```

### 4. 전체 시스템 테스트

```http
GET /api/v1/internal/sngil-ddc/test/system
```

**응답:**

```json
{
  "success": true,
  "message": "전체 시스템 테스트 완료",
  "data": {
    "timestamp": "2024-01-01T00:00:00.000Z",
    "connection": {
      "status": "connected",
      "config": { ... }
    },
    "tests": {
      "doStatus": [ ... ],
      "hvacStatus": { ... },
      "sensorData": { ... }
    },
    "summary": {
      "totalTests": 3,
      "passedTests": 3,
      "failedTests": 0
    }
  }
}
```

## 프론트엔드 테스트

프론트엔드에서는 `/sngil-ddc-test` 경로로 접근하여 웹 인터페이스를 통해 테스트할 수 있습니다.

### 주요 기능

- **연결 설정**: SNGIL DDC 연결 파라미터 설정
- **DO 제어**: DO 포트별 모드 설정 및 수동 제어
- **상태 모니터링**: DO 상태, HVAC 상태, 센서 데이터 실시간 확인
- **스케줄 설정**: DO별 스케줄 시간 설정 (개발 중)

## 문제 해결

### 1. 연결 실패

- 포트 번호 확인 (COM1, COM2 등)
- Baud Rate 설정 확인 (9600, 19200, 38400)
- Slave ID 설정 확인 (1-247)
- 하드웨어 연결 상태 확인

### 2. 제어 명령 실패

- 연결 상태 확인
- DO 번호 범위 확인 (1-16)
- 지원하지 않는 기능인지 확인

### 3. 데이터 읽기 실패

- Modbus 통신 상태 확인
- 레지스터 주소 매핑 확인
- 하드웨어 응답 확인
