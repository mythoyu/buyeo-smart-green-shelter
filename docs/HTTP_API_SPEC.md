# 신우이엔지 환승센터 연동 시스템 API 명세서 (v1)

## Base URL

- **내부 API**: `http://{client_ip}/api/v1/internal`
- **외부 API**: `http://{client_ip}/api/v1/external`

## 보안 정책

### 인증 (Authentication)

- 모든 API 요청에는 `Authorization` 헤더에 API 키가 필요합니다
- 형식: `Authorization: Bearer {api_key}`
- 예시: `Authorization: Bearer admin_universal_key_2025`

### CORS (Cross-Origin Resource Sharing)

다음 Origin에서의 요청이 허용됩니다:

- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:4173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:3001`
- `http://127.0.0.1:4173`
- `https://smartcity.example.com`
- 호스트 IP 주소들 (동적 감지)

### Rate Limiting

- **개발 환경**: Rate Limiting 비활성화
- **프로덕션 환경**: 15분당 최대 50,000개 요청
- 초과 시 429 Too Many Requests 응답

### 보안 헤더

모든 응답에 다음 보안 헤더가 포함됩니다:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`

### 입력 검증

다음 보안 패턴이 차단됩니다:

- **SQL Injection**: union, select, insert, update, delete, drop, create, alter, exec, execute, script, javascript, vbscript, onload, onerror, onclick
- **XSS**: <script, javascript:, vbscript:, onload, onerror, onclick, alert(, confirm(, prompt(, eval(, document., window.
- **Command Injection**: cmd, command, exec, system, shell, bash, sh, powershell, wget, curl, ftp, telnet, nc, netcat
- **NoSQL Injection**: $where, $ne, $gt, $lt, $regex, $exists, $in, $nin

### 비밀번호 정책

- 최소 8자 이상
- 소문자, 대문자, 숫자, 특수문자 각각 1개 이상 포함
- 순차적 문자나 반복 문자 제한

## 응답 스키마

모든 API 응답은 다음과 같은 통일된 형식을 따릅니다:

### 성공 응답

```json
{
  "success": true,
  "message": "string",             // 성공 요약 메시지
  "data": object | array | null    // 응답 데이터 (객체 또는 배열)
}
```

### 실패 응답

```json
{
  "success": false,
  "message": "string", // 실패 요약 메시지
  "error": {
    "code": "string", // 오류 코드 (예: "INVALID_PARAM", "E001")
    "message": "string" // 상세 오류 설명
  }
}
```

### 오류 코드 목록

- `INVALID_PARAM`: 잘못된 파라미터
- `UNAUTHORIZED`: 인증 실패
- `FORBIDDEN`: 권한 없음
- `NOT_FOUND`: 리소스를 찾을 수 없음
- `INTERNAL_ERROR`: 서버 내부 오류
- `DEVICE_NOT_FOUND`: 장비를 찾을 수 없음
- `UNIT_NOT_FOUND`: 유닛을 찾을 수 없음
- `COMMAND_FAILED`: 명령 실행 실패
- `TOO_MANY_REQUESTS`: 요청이 너무 많음 (Rate Limiting)
- `VALIDATION_ERROR`: 입력 검증 실패
- `AUTHENTICATION_ERROR`: 인증 오류

## 내부 API

**Base URL**: `http://{client_ip}/api/v1/internal`

| 메서드 | 엔드포인트                                         | 설명                                                 |
| ------ | -------------------------------------------------- | ---------------------------------------------------- |
| GET    | /client                                            | 클라이언트 정보조회                                  |
| POST   | /client                                            | 클라이언트 정보설정                                  |
| GET    | /client/schema                                     | 클라이언트 스키마 조회                               |
| GET    | /clients                                           | 클라이언트 목록 조회                                 |
| GET    | /status                                            | 클라이언트 상태조회 (장비 정보 포함)                 |
| GET    | /status/schema                                     | 상태 스키마 조회                                     |
| GET    | /data                                              | 클라이언트 데이터조회                                |
| GET    | /data/schema                                       | 데이터 스키마 조회                                   |
| GET    | /errors                                            | 클라이언트 에러조회                                  |
| GET    | /errors/schema                                     | 에러 스키마 조회                                     |
| POST   | /auth/login                                        | 사용자 로그인                                        |
| POST   | /auth/logout                                       | 사용자 로그아웃                                      |
| GET    | /auth/login/schema                                 | 로그인 스키마 조회                                   |
| GET    | /auth/schema                                       | 인증 스키마 조회                                     |
| GET    | /users                                             | 사용자 목록 조회                                     |
| POST   | /users                                             | 사용자 생성                                          |
| PUT    | /users/{userId}                                    | 사용자 수정                                          |
| DELETE | /users/{userId}                                    | 사용자 삭제                                          |
| POST   | /users/{userId}/change-password                    | 비밀번호 변경                                        |
| GET    | /users/schema                                      | 사용자 스키마 조회                                   |
| GET    | /api-keys                                          | API 키 목록 조회                                     |
| POST   | /api-keys                                          | API 키 생성                                          |
| DELETE | /api-keys/{key}                                    | API 키 삭제                                          |
| GET    | /system                                            | 시스템 명령(action: reset, apply, export, import 등) |
| PATCH  | /system                                            | 시스템 명령(action: reset, apply, export, import 등) |
| GET    | /system/schema                                     | 시스템 스키마 조회                                   |
| GET    | /system/client                                     | 시스템 클라이언트 설정                               |
| GET    | /system/client/schema                              | 시스템 클라이언트 스키마 조회                        |
| POST   | /system/mode                                       | 시스템 모드 전환 (자동/수동)                         |
| POST   | /devices/{deviceId}/units/{unitId}/commands        | 특정유닛 대량제어                                    |
| GET    | /devices/{deviceId}/units/{unitId}/commands        | 특정유닛 대량제어 상태조회                           |
| GET    | /devices/commands/schema                           | 모든 장비 명령 스키마 조회                           |
| GET    | /devices/{deviceId}/commands/schema                | 특정 장비 명령 스키마 조회                           |
| GET    | /devices/{deviceId}/units/{unitId}/commands/schema | 유닛별 명령 스키마 조회                              |
| GET    | /system/ntp                                        | NTP 설정 조회                                        |
| PATCH  | /system/ntp                                        | NTP 설정 변경                                        |
| GET    | /system/softap                                     | SoftAP 상태 조회                                     |
| PATCH  | /system/softap                                     | SoftAP 상태 변경                                     |
| GET    | /system/network                                    | 네트워크 설정 조회                                   |
| PATCH  | /system/network                                    | 네트워크 설정 변경                                   |
| GET    | /logs/files                                        | 로그 파일 목록 조회                                  |
| GET    | /logs/content                                      | 로그 파일 내용 조회                                  |
| GET    | /logs/search                                       | 로그 검색                                            |
| GET    | /notifications                                     | 알림 목록 조회                                       |
| POST   | /notifications                                     | 알림 생성                                            |
| DELETE | /notifications/{id}                                | 알림 삭제                                            |

### 예시: 클라이언트 등록/수정

POST /client

```json
{
  "clientId": "c0102",
  "name": "구름다리(올리브영 앞)",
  "location": "강원도 강릉시 교동 1881-8, 교동광장로",
  "city": "강릉시",
  "project": "버스환승센터"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 정보가 성공적으로 설정되었습니다.",
  "data": {
    "clientId": "c0102",
    "name": "구름다리(올리브영 앞)",
    "location": "강원도 강릉시 교동 1881-8, 교동광장로",
    "city": "강릉시",
    "project": "버스환승센터"
  }
}
```

### 예시: 클라이언트 목록 조회

GET /clients

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `type`: 클라이언트 타입 필터 (선택)

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 목록을 성공적으로 조회했습니다.",
  "data": {
    "data": [
      {
        "id": "c0101",
        "name": "강릉시외버스터미널",
        "location": "강원도 강릉시 하슬라로 27",
        "city": "강릉",
        "project": "스마트시티",
        "type": "bushub",
        "region": "강릉",
        "latitude": 37.754692,
        "longitude": 128.878805,
        "devices": [
          {
            "id": "d021",
            "name": "조명",
            "type": "lighting",
            "units": [
              {
                "id": "u001",
                "name": "내부전등1"
              }
            ]
          }
        ],
        "updatedAt": "2025-08-03T06:44:33.310Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### 예시: 클라이언트 상태 조회

GET /internal/status

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 상태 조회 성공",
  "data": {
    "id": "c0101",
    "devices": [
      {
        "id": "d021",
        "status": 1,
        "units": [
          {
            "id": "u001",
            "status": 0
          },
          {
            "id": "u002",
            "status": 2
          }
        ]
      }
    ]
  }
}
```

### 예시: 클라이언트 데이터 조회

GET /internal/data

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 데이터 조회 성공",
  "data": {
    "id": "c0101",
    "devices": [
      {
        "id": "d021",
        "type": "lighting",
        "units": [
          {
            "id": "u001",
            "data": {
              "auto": true,
              "power": true,
              "connection": true,
              "start_time_1": "08:00",
              "end_time_1": "22:00"
            }
          }
        ]
      }
    ]
  }
}
```

### 예시: 클라이언트 에러 조회

GET /internal/errors

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 에러 조회 성공",
  "data": {
    "id": "c0101",
    "devices": [
      {
        "id": "d021",
        "units": [
          {
            "id": "u001",
            "errorId": "e001",
            "errorDesc": "통신에러",
            "errorAt": "2025-06-29T10:09:55Z"
          }
        ]
      }
    ]
  }
}
```

### 예시: 사용자 로그인

POST /internal/auth/login

**요청 예시:**

```json
{
  "username": "admin",
  "password": "password123"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "로그인 성공",
  "data": {
    "user": {
      "id": "admin",
      "username": "admin",
      "role": "admin"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### 예시: 사용자 목록 조회

GET /internal/users

- 사용자(관리자, 내부/외부 사용자 등) 목록을 반환

**응답 예시:**

```json
{
  "success": true,
  "message": "사용자 목록 조회 성공",
  "data": [
    {
      "id": "admin",
      "name": "admin",
      "role": "admin",
      "status": "active"
    },
    {
      "id": "user1",
      "name": "user1",
      "role": "user",
      "status": "active"
    }
  ]
}
```

### 예시: 사용자 생성

POST /internal/users

**요청 예시:**

```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "role": "user"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "사용자 생성 성공",
  "data": {
    "id": "newuser",
    "username": "newuser",
    "email": "newuser@example.com",
    "role": "user",
    "status": "active"
  }
}
```

### 예시: 사용자 수정

PUT /internal/users/{userId}

**요청 예시:**

```json
{
  "username": "updateduser",
  "email": "updateduser@example.com",
  "role": "user"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "사용자 수정 성공",
  "data": {
    "id": "user1",
    "username": "updateduser",
    "email": "updateduser@example.com",
    "role": "user",
    "status": "active"
  }
}
```

### 예시: 사용자 삭제

DELETE /internal/users/{userId}

**응답 예시:**

```json
{
  "success": true,
  "message": "사용자 삭제 성공"
}
```

### 예시: 비밀번호 변경

POST /internal/users/{userId}/change-password

**요청 예시:**

```json
{
  "currentPassword": "oldpassword",
  "newPassword": "newpassword123"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "비밀번호 변경 성공"
}
```

### 예시: API 키 목록 조회

GET /internal/api-keys

- 등록된 API Key 목록을 반환

**응답 예시:**

```json
{
  "success": true,
  "message": "API 키 목록 조회 성공",
  "data": {
    "apiKeys": [
      {
        "id": "key1",
        "name": "Internal API Key",
        "key": "sinwooapidevclient",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "totalPages": 1
  }
}
```

### 예시: API 키 생성

POST /internal/api-keys

**요청 예시:**

```json
{
  "name": "New API Key",
  "type": "internal"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "API 키 생성 성공",
  "data": {
    "id": "key2",
    "name": "New API Key",
    "key": "new_api_key_2025",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 예시: API 키 삭제

DELETE /internal/api-keys/{key}

**응답 예시:**

```json
{
  "success": true,
  "message": "API 키 삭제 성공"
}
```

### 특정 유닛 제어(action) 상세 정보

#### d011 전등 (lighting)

| data 필드      | 설명     | 관련 액션(action)                      |
| -------------- | -------- | -------------------------------------- |
| `auto`         | 모드상태 | `SET_AUTO`, `GET_AUTO`                 |
| `power`        | 전원상태 | `SET_POWER`, `GET_POWER`               |
| `connection`   | 통신상태 | `GET_CONNECTION`                       |
| `start_time_1` | 시작시간 | `SET_START_TIME_1`, `GET_START_TIME_1` |
| `end_time_1`   | 종료시간 | `SET_END_TIME_1`, `GET_END_TIME_1`     |
| `start_time_2` | 시작시간 | `SET_START_TIME_2`, `GET_START_TIME_2` |
| `end_time_2`   | 종료시간 | `SET_END_TIME_2`, `GET_END_TIME_2`     |

#### d021 냉난방기 (cooler)

| data 필드      | 설명     | 관련 액션(action)                      |
| -------------- | -------- | -------------------------------------- |
| `auto`         | 모드상태 | `SET_AUTO`, `GET_AUTO`                 |
| `power`        | 전원상태 | `SET_POWER`, `GET_POWER`               |
| `connection`   | 통신상태 | `GET_CONNECTION`                       |
| `start_time_1` | 시작시간 | `SET_START_TIME_1`, `GET_START_TIME_1` |
| `end_time_1`   | 종료시간 | `SET_END_TIME_1`, `GET_END_TIME_1`     |
| `mode`         | 운전모드 | `SET_MODE`, `GET_MODE`                 |
| `cur_temp`     | 현재온도 | `GET_CUR_TEMP`                         |
| `cont_temp`    | 목표온도 | `SET_CONT_TEMP`, `GET_CONT_TEMP`       |
| `speed`        | 풍량     | `SET_SPEED`, `GET_SPEED`               |

#### d022 전열교환기 (exchanger)

| data 필드      | 설명     | 관련 액션(action)                      |
| -------------- | -------- | -------------------------------------- |
| `auto`         | 모드상태 | `SET_AUTO`, `GET_AUTO`                 |
| `power`        | 전원상태 | `SET_POWER`, `GET_POWER`               |
| `connection`   | 통신상태 | `GET_CONNECTION`                       |
| `start_time_1` | 시작시간 | `SET_START_TIME_1`, `GET_START_TIME_1` |
| `end_time_1`   | 종료시간 | `SET_END_TIME_1`, `GET_END_TIME_1`     |
| `mode`         | 운전모드 | `SET_MODE`, `GET_MODE`                 |
| `speed`        | 풍량     | `SET_SPEED`, `GET_SPEED`               |

#### d023 에어커튼 (aircurtain)

| data 필드      | 설명     | 관련 액션(action)                      |
| -------------- | -------- | -------------------------------------- |
| `auto`         | 모드상태 | `SET_AUTO`, `GET_AUTO`                 |
| `power`        | 전원상태 | `SET_POWER`, `GET_POWER`               |
| `connection`   | 통신상태 | `GET_CONNECTION`                       |
| `start_time_1` | 시작시간 | `SET_START_TIME_1`, `GET_START_TIME_1` |
| `end_time_1`   | 종료시간 | `SET_END_TIME_1`, `GET_END_TIME_1`     |

#### d041 온열벤치 (bench)

| data 필드      | 설명     | 관련 액션(action)                      |
| -------------- | -------- | -------------------------------------- |
| `auto`         | 모드상태 | `SET_AUTO`, `GET_AUTO`                 |
| `power`        | 전원상태 | `SET_POWER`, `GET_POWER`               |
| `connection`   | 통신상태 | `GET_CONNECTION`                       |
| `start_time_1` | 시작시간 | `SET_START_TIME_1`, `GET_START_TIME_1` |
| `end_time_1`   | 종료시간 | `SET_END_TIME_1`, `GET_END_TIME_1`     |

#### d051 자동문 (door)

| data 필드      | 설명     | 관련 액션(action)                      |
| -------------- | -------- | -------------------------------------- |
| `auto`         | 모드상태 | `SET_AUTO`, `GET_AUTO`                 |
| `power`        | 전원상태 | `SET_POWER`, `GET_POWER`               |
| `connection`   | 연결상태 | `GET_CONNECTION`                       |
| `start_time_1` | 시작시간 | `SET_START_TIME_1`, `GET_START_TIME_1` |
| `end_time_1`   | 종료시간 | `SET_END_TIME_1`, `GET_END_TIME_1`     |

#### d061 통합센서 (sensor)

| data 필드    | 설명             | 관련 액션(action) |
| ------------ | ---------------- | ----------------- |
| `connection` | 통신상태         | `GET_CONNECTION`  |
| `pm10`       | 초초미세먼지수치 | `GET_PM10`        |
| `pm25`       | 초미세먼지수치   | `GET_PM25`        |
| `pm100`      | 미세먼지수치     | `GET_PM100`       |
| `co2`        | 이산화탄소농도   | `GET_CO2`         |
| `voc`        | 유기화합물농도   | `GET_VOC`         |
| `hum`        | 습도             | `GET_HUM`         |
| `temp`       | 온도             | `GET_TEMP`        |

#### d081 자동문 외부스위치 (externalsw)

| data 필드      | 설명     | 관련 액션(action)                      |
| -------------- | -------- | -------------------------------------- |
| `auto`         | 모드상태 | `SET_AUTO`, `GET_AUTO`                 |
| `start_time_1` | 시작시간 | `SET_START_TIME_1`, `GET_START_TIME_1` |
| `end_time_1`   | 종료시간 | `SET_END_TIME_1`, `GET_END_TIME_1`     |

---

## 외부 API

**Base URL**: `http://{client_ip}/api/v1/external`

| 메서드 | 엔드포인트                                  | 설명                       |
| ------ | ------------------------------------------- | -------------------------- |
| GET    | /client                                     | 클라이언트 정보조회        |
| GET    | /status                                     | 클라이언트 상태조회        |
| GET    | /data                                       | 클라이언트 데이터조회      |
| GET    | /errors                                     | 클라이언트 에러조회        |
| POST   | /devices/{deviceId}/units/{unitId}/commands | 특정유닛 대량제어          |
| GET    | /devices/{deviceId}/units/{unitId}/commands | 특정유닛 대량제어 상태조회 |

### 예시: 외부 클라이언트 정보 조회

GET /client

- Authorization 헤더 필요

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 정보 조회 성공",
  "data": {
    "id": "c0101",
    "type": "bushub",
    "region": "gn",
    "name": "강릉시외버스터미널",
    "location": "강원도 강릉시 하슬라로 27",
    "latitude": 37.754692,
    "longitude": 128.878805,
    "devices": [
      {
        "id": "d021",
        "name": "조명",
        "type": "lighting",
        "units": [
          {
            "id": "u001",
            "name": "내부전등1"
          },
          {
            "id": "u002",
            "name": "내부전등2"
          }
        ]
      }
    ]
  }
}
```

### 예시: 외부 클라이언트 상태 조회

GET /status

- Authorization 헤더 필요

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 상태 조회 성공",
  "data": {
    "id": "c0101",
    "devices": [
      {
        "id": "d021",
        "status": 1,
        "units": [
          {
            "id": "u001",
            "status": 0
          },
          {
            "id": "u002",
            "status": 2
          }
        ]
      }
    ]
  }
}
```

### 예시: 외부 클라이언트 데이터 조회

GET /data

- Authorization 헤더 필요

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 데이터 조회 성공",
  "data": {
    "id": "c0101",
    "devices": [
      {
        "id": "d021",
        "type": "lighting",
        "units": [
          {
            "id": "u001",
            "data": {
              "auto": true,
              "power": true,
              "connection": true,
              "start_time_1": "08:00",
              "end_time_1": "22:00"
            }
          },
          {
            "id": "u002",
            "data": {
              "auto": false,
              "power": false,
              "connection": true,
              "start_time_1": "08:00",
              "end_time_1": "22:00"
            }
          }
        ]
      }
    ]
  }
}
```

### 예시: 외부 클라이언트 에러 조회

GET /errors

- Authorization 헤더 필요

**응답 예시:**

```json
{
  "success": true,
  "message": "클라이언트 에러 조회 성공",
  "data": {
    "id": "c0101",
    "devices": [
      {
        "id": "d021",
        "units": [
          {
            "id": "u001",
            "errorId": "e001",
            "errorDesc": "통신에러",
            "errorAt": "2025-06-29T10:09:55Z"
          },
          {
            "id": "u002",
            "errorId": "e001",
            "errorDesc": "통신에러",
            "errorAt": "2025-06-29T10:09:58Z"
          }
        ]
      }
    ]
  }
}
```

### 예시: 특정 유닛 대량제어

POST /devices/d011/units/u001/commands

**요청 예시:**

```json
[
  { "action": "SET_START_TIME", "value": "08:00" },
  { "action": "SET_END_TIME", "value": "20:00" }
]
```

**응답 예시:**

```json
{
  "success": true,
  "message": "유닛 대량제어 명령 등록 성공",
  "data": [
    {
      "action": "SET_START_TIME",
      "requestId": "66fe12ab1c23f123a4ed0001"
    },
    {
      "action": "SET_END_TIME",
      "requestId": "66fe12ab1c23f123a4ed0002"
    }
  ]
}
```

### 예시: 특정 유닛 대량제어 상태조회

GET /devices/d021/units/u001/commands?ids=66fe12ab1c23f123a4ed0001,66fe12ab1c23f123a4ed0002

- ids: 조회할 요청(request) ID 목록 (콤마로 구분)
- Authorization 헤더 필요

**응답 예시:**

```json
{
  "success": true,
  "message": "명령 상태 조회 성공",
  "data": [
    {
      "requestId": "66fe12ab1c23f123a4ed0001",
      "action": "SET_START_TIME",
      "status": "success",
      "finishedAt": "2025-07-02T10:15:02Z"
    },
    {
      "requestId": "66fe12ab1c23f123a4ed0002",
      "action": "SET_END_TIME",
      "status": "fail",
      "finishedAt": "2025-07-02T10:15:04Z",
      "error": "명령 실행 중 오류가 발생했습니다."
    },
    {
      "requestId": "66fe12ab1c23f123a4ed0003",
      "action": "SET_POWER",
      "status": "waiting"
    }
  ]
}
```

---

## 시스템 환경설정 관리 (action 기반)

| 메서드 | 엔드포인트       | 설명                           |
| ------ | ---------------- | ------------------------------ |
| GET    | /internal/system | 시스템 환경설정 조회           |
| POST   | /internal/system | action 필드로 다양한 명령 수행 |

### POST /internal/system (action 기반)

| action 값 | 설명                     | body 예시                                     |
| --------- | ------------------------ | --------------------------------------------- |
| reset     | 시스템설정 기본값 초기화 | `{ "action": "reset" }`                       |
| apply     | 시스템설정 적용          | `{ "action": "apply" }`                       |
| import    | 시스템설정 가져오기      | `{ "action": "import", "backupPath": "..." }` |
| export    | 시스템설정 내보내기      | `{ "action": "export" }`                      |

#### 예시 요청/응답

**1. 시스템 환경설정 조회**

GET /internal/system

```json
{
  "success": true,
  "message": "시스템 환경설정 조회 성공",
  "data": {
    "ntp": { ... },
    "network": { ... },
    "softap": { ... },
    ...
  }
}
```

**2. 시스템 환경설정 초기화**

POST /internal/system

```json
{
  "action": "reset"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "시스템 환경설정이 성공적으로 초기화되었습니다."
}
```

**3. 시스템 환경설정 적용**

POST /internal/system

```json
{
  "action": "apply"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "시스템 환경설정이 성공적으로 적용되었습니다."
}
```

**4. 시스템 환경설정 내보내기**

POST /internal/system

```json
{
  "action": "export"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "시스템설정이 성공적으로 내보내기되었습니다.",
  "data": {
    "backupPath": "/backups/settings-2024-07-01.json",
    "settings": { ... }
  }
}
```

**5. 시스템 환경설정 가져오기**

POST /internal/system

```json
{
  "action": "import",
  "backupPath": "/backups/settings-2024-07-01.json"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "시스템설정이 성공적으로 가져오기되었습니다.",
  "data": {
    "settings": { ... }
  }
}
```

### 예시: 시스템 모드 전환

POST /internal/system/mode

**요청 예시:**

```json
{
  "mode": "auto"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "시스템 모드가 성공적으로 전환되었습니다.",
  "data": {
    "mode": "auto",
    "modeText": "자동",
    "message": "시스템이 자동 모드로 전환되었습니다."
  }
}
```

**요청 파라미터:**

- `mode`: 시스템 모드 (필수)
  - `"auto"`: 자동 모드
  - `"manual"`: 수동 모드

**응답 데이터:**

- `message`: 모드 전환 결과 메시지
- `mode`: 전환된 모드 값
- `modeText`: 모드의 한글 표시명

**응답 예시 (manual 모드):**

```json
{
  "success": true,
  "message": "시스템 모드가 성공적으로 전환되었습니다.",
  "data": {
    "mode": "manual",
    "modeText": "수동",
    "message": "시스템이 수동 모드로 전환되었습니다."
  }
}
```

### 예시: 로그 파일 목록 조회

GET /internal/logs/files

**응답 예시:**

```json
{
  "success": true,
  "message": "로그 파일 목록 조회 성공",
  "data": [
    "app-2024-01-01.log",
    "app-2024-01-01.log.gz",
    "error-2024-01-01.log"
  ]
}
```

### 예시: 로그 파일 내용 조회

GET /internal/logs/content?filename=app-2024-01-01.log&lines=100&search=error

**쿼리 파라미터:**

- `filename`: 로그 파일명 (필수)
- `lines`: 조회할 라인 수 (기본값: 100)
- `search`: 검색 키워드 (선택)

**응답 예시:**

```json
{
  "success": true,
  "message": "로그 파일 내용 조회 성공",
  "data": {
    "filename": "app-2024-01-01.log",
    "lines": [
      "2024-01-01 10:00:00 [INFO] 서버 시작",
      "2024-01-01 10:01:00 [ERROR] 데이터베이스 연결 실패",
      "2024-01-01 10:02:00 [INFO] 서버 종료"
    ],
    "totalLines": 3
  }
}
```

### 예시: 로그 검색

GET /internal/logs/search?query=error&filename=app-2024-01-01.log

**쿼리 파라미터:**

- `query`: 검색 키워드 (필수)
- `filename`: 검색할 파일명 (선택, 없으면 모든 파일)

**응답 예시:**

```json
{
  "success": true,
  "message": "로그 검색 성공",
  "data": {
    "query": "error",
    "results": [
      {
        "filename": "app-2024-01-01.log",
        "line": 2,
        "content": "2024-01-01 10:01:00 [ERROR] 데이터베이스 연결 실패"
      }
    ],
    "totalResults": 1
  }
}
```

### 예시: 알림 목록 조회

GET /internal/notifications

**응답 예시:**

```json
{
  "success": true,
  "message": "알림 목록 조회 성공",
  "data": [
    {
      "id": "notif1",
      "type": "info",
      "message": "시스템이 정상적으로 시작되었습니다.",
      "createdAt": "2024-01-01T10:00:00Z",
      "read": false
    },
    {
      "id": "notif2",
      "type": "warning",
      "message": "장비 연결이 불안정합니다.",
      "createdAt": "2024-01-01T09:30:00Z",
      "read": true
    }
  ]
}
```

### 예시: 알림 생성

POST /internal/notifications

**요청 예시:**

```json
{
  "type": "info",
  "message": "새로운 알림 메시지입니다."
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "알림 생성 성공",
  "data": {
    "id": "notif3",
    "type": "info",
    "message": "새로운 알림 메시지입니다.",
    "createdAt": "2024-01-01T11:00:00Z",
    "read": false
  }
}
```

### 예시: 알림 삭제

DELETE /internal/notifications/{id}

**응답 예시:**

```json
{
  "success": true,
  "message": "알림 삭제 성공"
}
```

---

## 보안 예시

### 올바른 API 호출 예시

```bash
# 클라이언트 정보 조회
curl -X GET "http://localhost:3000/api/v1/internal/client" \
  -H "Authorization: Bearer admin_universal_key_2025" \
  -H "Content-Type: application/json"

# 사용자 생성
curl -X POST "http://localhost:3000/api/v1/internal/users" \
  -H "Authorization: Bearer admin_universal_key_2025" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "role": "user"
  }'
```

### 보안 오류 응답 예시

```json
// 401 Unauthorized - 잘못된 API 키
{
  "success": false,
  "message": "인증에 실패했습니다.",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "유효하지 않은 API 키입니다."
  }
}

// 403 Forbidden - CORS 오류
{
  "success": false,
  "message": "허용되지 않은 Origin입니다.",
  "error": {
    "code": "FORBIDDEN",
    "message": "CORS 정책에 의해 차단되었습니다."
  }
}

// 429 Too Many Requests - Rate Limiting
{
  "success": false,
  "message": "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  "error": {
    "code": "TOO_MANY_REQUESTS",
    "message": "Rate Limiting에 의해 차단되었습니다."
  }
}

// 400 Bad Request - 입력 검증 실패
{
  "success": false,
  "message": "잠재적으로 위험한 입력이 감지되었습니다.",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "SQL Injection 패턴이 감지되었습니다."
  }
}
```

---

> 모든 API는 Authorization 헤더에 API Key 필요
>
> 예시: `Authorization: Bearer {api_key}`

### 예시: NTP 설정 변경

PATCH /internal/system/ntp

**요청 예시:**

```json
{
  "ntp_server": "time.google.com"
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "NTP 서버가 성공적으로 설정되었습니다."
}
```

### 예시: SoftAP 상태 변경

PATCH /internal/system/softap

**요청 예시:**

```json
{
  "enabled": true,
  "ssid": "SmartCity_AP",
  "password": "password123",
  "channel": 6
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "SoftAP 설정이 성공적으로 적용되었습니다."
}
```

### 예시: 네트워크 설정 변경

PATCH /internal/system/network

**요청 예시:**

```json
{
  "interface": "eth0",
  "ipAddress": "192.168.1.100",
  "netmask": "255.255.255.0",
  "gateway": "192.168.1.1",
  "dns": ["8.8.8.8", "8.8.4.4"]
}
```

**응답 예시:**

```json
{
  "success": true,
  "message": "네트워크 설정이 성공적으로 적용되었습니다."
}
```

### 예시: 알림 삭제

DELETE /internal/notifications/{id}

**응답 예시:**

```json
{
  "success": true,
  "message": "알림 삭제 성공"
}
```
