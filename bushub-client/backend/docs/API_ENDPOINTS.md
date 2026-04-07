# SNGIL DDC API 엔드포인트 문서

이 문서는 SNGIL DDC 시스템의 모든 API 엔드포인트를 설명합니다.

## 📋 개요

SNGIL DDC API는 다음과 같은 주요 기능을 제공합니다:

- **Modbus 통신 관리**: Mock/실제 모드 전환, 연결 상태 관리
- **폴링 제어**: 다양한 타입의 폴링 시작/중지/상태 확인
- **장비 제어**: DO, HVAC, 전열교환기, 센서 제어
- **스케줄 관리**: DO 스케줄 설정 및 관리
- **상태 모니터링**: 실시간 장비 상태 및 통계 정보

### ⚠️ **스케줄 지원 제한사항**

**중요**: 모든 장비가 동일한 스케줄 기능을 지원하지 않습니다.

#### **스케줄2 지원 장비**

- **lighting (d011)**: 스케줄2 완전 지원 (DO1~DO4)
  - `SET_START_TIME_2`, `SET_END_TIME_2` 지원

#### **스케줄1만 지원하는 장비들**

- **cooler (d021)**: 스케줄1만 지원 (DO1~DO13, DO16)
- **aircurtain (d021)**: 스케줄1만 지원
- **bench (d041)**: 스케줄1만 지원
- **door (d051)**: 스케줄1만 지원
- **externalsw (d071)**: 스케줄1만 지원
- **exchanger (d061)**: 스케줄1만 지원

#### **스케줄2 미지원 장비에서의 오류**

스케줄2 미지원 장비에 `SET_START_TIME_2` 또는 `SET_END_TIME_2` 명령어를 요청하면 다음과 같은 오류가 발생합니다:

```json
{
  "success": false,
  "message": "Command 'SET_START_TIME_2' not supported for cooler device type. Only lighting device supports schedule2 (START_TIME_2, END_TIME_2). Use schedule1 (START_TIME_1, END_TIME_1) instead.",
  "error": "VALIDATION_ERROR"
}
```

자세한 내용은 [장비별 스케줄 지원 현황](./DEVICE_SPECIFICATIONS.md) 문서를 참조하세요.

## 🔌 기본 정보

### Base URL

```
http://localhost:3000/api/v1
```

### 인증

모든 API 요청에는 `Authorization` 헤더가 필요합니다:

```
Authorization: Bearer <API_KEY>
```

### 응답 형식

```json
{
  "success": true,
  "message": "성공적으로 처리되었습니다",
  "data": { ... }
}
```

## 🚀 Modbus 통신 관리 API

### 1. Modbus 모드 전환

**POST** `/sngil-ddc/test/modbus/mode`

Modbus 통신 모드를 Mock과 실제 모드 간에 전환합니다.

#### 요청 본문

```json
{
  "action": "force-mock" // "force-mock", "try-real", "status", "retry-connection"
}
```

#### 응답 예시

```json
{
  "success": true,
  "message": "Mock 모드로 전환되었습니다",
  "data": {
    "currentMode": "mock",
    "previousMode": "real",
    "timestamp": "2025-01-10T06:09:58.000Z"
  }
}
```

#### 액션 타입

- **`force-mock`**: 강제로 Mock 모드로 전환
- **`try-real`**: 실제 하드웨어 연결 시도
- **`status`**: 현재 모드 상태 조회
- **`retry-connection`**: 연결 재시도

### 2. Modbus 주소 매핑 조회

**GET** `/sngil-ddc/test/modbus/addresses`

Modbus 레지스터 주소 매핑 정보를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "message": "주소 매핑 정보를 성공적으로 조회했습니다",
  "data": {
    "do": {
      "mode": [352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 385, 386, 367],
      "operation": [368, 369, 370, 371, 372, 373, 374, 375, 376, 377, 378, 379, null, null, null, 383],
      "status": [821, 822, 823, 824, 825, 826, 827, 828, 829, 830, 831, 832, 833, 834, 835, 836]
    },
    "di": {
      "enable": [404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415, 416, 417, 418, 419],
      "status": [null, null, null, null, null, null, null, null, null, null, null, null, 449, 450, 451, null]
    },
    "hvac": {
      "mode": 116,
      "speed": 117,
      "temperature": 118,
      "status": 119
    },
    "heatExchanger": {
      "mode": 107,
      "power": 108,
      "speed": 109,
      "status": 110
    }
  }
}
```

## 📡 폴링 제어 API

### 1. 폴링 상태 조회

**GET** `/sngil-ddc/test/modbus/polling/status`

현재 활성화된 폴링 상태와 통계 정보를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "message": "폴링 상태를 성공적으로 조회했습니다",
  "data": {
    "isPolling": true,
    "activePolling": ["sngil-do-1", "sngil-di-1", "sngil-hvac-1"],
    "totalPolling": 3,
    "mockMode": true,
    "lastUpdate": "2025-01-10T06:09:58.000Z",
    "pollingStats": {
      "do": { "active": true, "interval": 5000, "lastSuccess": "2025-01-10T06:09:55.000Z" },
      "di": { "active": true, "interval": 5000, "lastSuccess": "2025-01-10T06:09:56.000Z" },
      "hvac": { "active": true, "interval": 10000, "lastSuccess": "2025-01-10T06:09:50.000Z" }
    }
  }
}
```

### 2. 폴링 시작

**POST** `/sngil-ddc/test/modbus/polling/start`

지정된 타입의 폴링을 시작합니다.

#### 요청 본문

```json
{
  "type": "all", // "all", "do", "di", "hvac", "heat-exchanger", "sensor"
  "slaveId": 1,
  "interval": 5000
}
```

#### 폴링 타입

- **`all`**: 모든 SNGIL DDC 폴링 시작
- **`do`**: Digital Output 폴링만 시작
- **`di`**: Digital Input 폴링만 시작
- **`hvac`**: HVAC 폴링만 시작
- **`heat-exchanger`**: 전열교환기 폴링만 시작
- **`sensor`**: 센서 폴링만 시작

#### 응답 예시

```json
{
  "success": true,
  "message": "DO 폴링이 성공적으로 시작되었습니다",
  "data": {
    "pollingId": "sngil-do-1",
    "type": "do",
    "slaveId": 1,
    "interval": 5000,
    "startTime": "2025-01-10T06:09:58.000Z"
  }
}
```

### 3. 폴링 중지

**POST** `/sngil-ddc/test/modbus/polling/stop`

지정된 타입의 폴링을 중지합니다.

#### 요청 본문

```json
{
  "type": "all" // "all" 또는 특정 타입
}
```

#### 응답 예시

```json
{
  "success": true,
  "message": "모든 폴링이 성공적으로 중지되었습니다",
  "data": {
    "stoppedPolling": ["sngil-do-1", "sngil-di-1", "sngil-hvac-1"],
    "stopTime": "2025-01-10T06:10:00.000Z"
  }
}
```

## 🎛️ 장비 제어 API

### 1. DO (Digital Output) 제어

#### DO 모드 설정

**POST** `/sngil-ddc/test/do/mode`

DO의 모드를 수동/스케줄로 설정합니다.

#### 요청 본문

```json
{
  "doNumber": 1,
  "mode": "manual" // "manual" 또는 "schedule"
}
```

#### DO 수동 제어

**POST** `/sngil-ddc/test/do/manual`

DO를 수동으로 제어합니다.

#### 요청 본문

```json
{
  "doNumber": 1,
  "operation": "run" // "stop" 또는 "run"
}
```

#### DO 상태 일괄 조회

**GET** `/sngil-ddc/test/do/status/batch`

모든 DO의 상태를 일괄 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "message": "DO 상태를 성공적으로 조회했습니다",
  "data": [
    {
      "doNumber": 1,
      "operation": "run",
      "mode": "manual"
    },
    {
      "doNumber": 2,
      "operation": "stop",
      "mode": "schedule"
    }
  ]
}
```

### 2. HVAC 제어

#### HVAC 모드 설정

**POST** `/sngil-ddc/test/hvac/mode`

HVAC의 운전 모드를 설정합니다.

#### 요청 본문

```json
{
  "mode": "cooling" // "cooling", "heating", "fan", "auto", "dehumidify"
}
```

#### HVAC 팬 속도 설정

**POST** `/sngil-ddc/test/hvac/speed`

HVAC의 팬 속도를 설정합니다.

#### 요청 본문

```json
{
  "speed": "high" // "low", "medium", "high", "auto"
}
```

#### HVAC 전원 설정

**POST** `/sngil-ddc/test/hvac/power`

HVAC의 전원을 켜거나 끕니다.

#### 요청 본문

```json
{
  "power": true // true (켜기) 또는 false (끄기)
}
```

#### HVAC 스케줄 설정

**POST** `/sngil-ddc/test/hvac/schedule`

HVAC의 시작/종료 스케줄을 설정합니다.

#### 요청 본문

```json
{
  "type": "start", // "start" 또는 "end"
  "time": "09:00" // HH:MM 형식
}
```

#### HVAC 상태 일괄 조회

**GET** `/sngil-ddc/test/hvac/batch`

모든 HVAC의 상태를 일괄 조회합니다.

### 3. 전열교환기 제어

#### 전열교환기 모드 설정

**POST** `/sngil-ddc/test/heat-exchanger/mode`

전열교환기의 운전 모드를 설정합니다.

#### 요청 본문

```json
{
  "mode": "auto" // "manual", "auto", "bypass", "sleep"
}
```

#### 전열교환기 전원 설정

**POST** `/sngil-ddc/test/heat-exchanger/power`

전열교환기의 전원을 켜거나 끕니다.

#### 요청 본문

```json
{
  "power": true // true (켜기) 또는 false (끄기)
}
```

#### 전열교환기 팬 속도 설정

**POST** `/sngil-ddc/test/heat-exchanger/speed`

전열교환기의 팬 속도를 설정합니다.

#### 요청 본문

```json
{
  "speed": "medium" // "stop", "low", "medium", "high"
}
```

#### 전열교환기 스케줄 설정

**POST** `/sngil-ddc/test/heat-exchanger/schedule`

전열교환기의 시작/종료 스케줄을 설정합니다.

#### 요청 본문

```json
{
  "type": "start", // "start" 또는 "end"
  "time": "08:00" // HH:MM 형식
}
```

#### 전열교환기 상태 일괄 조회

**GET** `/sngil-ddc/test/heat-exchanger/batch`

모든 전열교환기의 상태를 일괄 조회합니다.

### 4. 센서 데이터 조회

#### 센서 데이터 일괄 조회

**GET** `/sngil-ddc/test/sensor/batch`

모든 센서의 데이터를 일괄 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "message": "센서 데이터를 성공적으로 조회했습니다",
  "data": [
    {
      "sensorType": "temperature",
      "value": 23.5,
      "unit": "°C",
      "timestamp": "2025-01-10T06:09:58.000Z"
    },
    {
      "sensorType": "humidity",
      "value": 55,
      "unit": "%",
      "timestamp": "2025-01-10T06:09:58.000Z"
    },
    {
      "sensorType": "pm2.5",
      "value": 12,
      "unit": "μg/m³",
      "timestamp": "2025-01-10T06:09:58.000Z"
    }
  ]
}
```

## 📅 스케줄 관리 API

### 1. DO 스케줄 설정

**POST** `/sngil-ddc/test/do/schedule`

DO의 스케줄을 설정합니다.

#### 요청 본문

```json
{
  "doNumber": 1,
  "scheduleType": "1-1", // "1-1", "1-2"
  "timeType": "start", // "start" 또는 "end"
  "time": {
    "hour": 9,
    "minute": 0
  }
}
```

#### 스케줄 타입

- **`1-1`**: 모든 DO에 적용되는 기본 스케줄
- **`1-2`**: DO 1-4에만 적용되는 두 번째 스케줄

#### 응답 예시

```json
{
  "success": true,
  "message": "DO 1 스케줄이 성공적으로 설정되었습니다",
  "data": {
    "doNumber": 1,
    "scheduleType": "1-1",
    "timeType": "start",
    "time": "09:00",
    "timestamp": "2025-01-10T06:09:58.000Z"
  }
}
```

### 2. DO 스케줄 일괄 조회

**GET** `/sngil-ddc/test/do/schedule/batch`

모든 DO의 스케줄을 일괄 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "message": "DO 스케줄을 성공적으로 조회했습니다",
  "data": [
    {
      "doNumber": 1,
      "schedule1": {
        "start": "09:00",
        "end": "18:00"
      },
      "schedule2": {
        "start": "10:00",
        "end": "17:00"
      }
    },
    {
      "doNumber": 2,
      "schedule1": {
        "start": "08:00",
        "end": "19:00"
      }
    }
  ]
}
```

## 📊 상태 모니터링 API

### 1. DDC 연결 상태 조회

**GET** `/sngil-ddc/test/ddc/status`

DDC의 연결 상태와 기본 정보를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "message": "DDC 상태를 성공적으로 조회했습니다",
  "data": {
    "connected": true,
    "slaveId": 1,
    "baudRate": 38400,
    "port": "/dev/ttyUSB0",
    "lastCommunication": "2025-01-10T06:09:58.000Z",
    "communicationQuality": "excellent"
  }
}
```

### 2. Modbus 큐 상태 조회

**GET** `/sngil-ddc/test/modbus/queue/status`

Modbus 명령 큐의 상태를 조회합니다.

#### 응답 예시

```json
{
  "success": true,
  "message": "Modbus 큐 상태를 성공적으로 조회했습니다",
  "data": {
    "queueLength": 5,
    "processingCommands": 2,
    "pendingCommands": 3,
    "completedCommands": 150,
    "failedCommands": 2,
    "averageProcessingTime": 45
  }
}
```

## 🚨 에러 처리

### 에러 응답 형식

```json
{
  "success": false,
  "message": "에러 메시지",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": "상세 에러 정보"
  }
}
```

### 일반적인 에러 코드

- **`VALIDATION_ERROR`**: 요청 데이터 검증 실패
- **`MODBUS_ERROR`**: Modbus 통신 오류
- **`DEVICE_NOT_FOUND`**: 장비를 찾을 수 없음
- **`POLLING_ALREADY_ACTIVE`**: 폴링이 이미 활성화됨
- **`INVALID_SCHEDULE_TIME`**: 잘못된 스케줄 시간
- **`CONNECTION_FAILED`**: 연결 실패

## 📝 사용 예시

### 1. 전체 시스템 폴링 시작

```bash
curl -X POST http://localhost:3000/api/v1/sngil-ddc/test/modbus/polling/start \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "all",
    "slaveId": 1,
    "interval": 5000
  }'
```

### 2. HVAC 모드 변경

```bash
curl -X POST http://localhost:3000/api/v1/sngil-ddc/test/hvac/mode \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "cooling"
  }'
```

### 3. DO 스케줄 설정

```bash
curl -X POST http://localhost:3000/api/v1/sngil-ddc/test/do/schedule \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "doNumber": 1,
    "scheduleType": "1-1",
    "timeType": "start",
    "time": {
      "hour": 9,
      "minute": 0
    }
  }'
```

## 🔧 개발자 정보

### API 버전

현재 버전: `v1`

### 변경 이력

- **v1.0.0**: 초기 API 릴리스
- **v1.1.0**: 폴링 제어 API 추가
- **v1.2.0**: Modbus 모드 관리 API 추가

### 지원하는 환경

- Node.js 18+
- Fastify 4+
- TypeScript 5+

### 연락처

API 관련 문의사항이 있으시면 이슈를 등록해 주세요.
