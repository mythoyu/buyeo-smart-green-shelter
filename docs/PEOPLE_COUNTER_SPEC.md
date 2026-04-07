# 피플카운터 (People Counter) 기능 사양서

## 문서 정보

- **작성일**: 2025-01-09
- **적용대상**: APC100 피플카운터 장비
- **프로토콜 문서**: [APC100_RS485_PROTOCOL.md](./APC100_RS485_PROTOCOL.md)
- **버전**: 1.0

---

## 1. 개요

피플카운터는 APC100 장비를 통해 실시간으로 입실/퇴실 인원을 카운트하고, 누적 데이터를 제공하는 기능입니다.

### 1.1 주요 기능

- 실시간 인원 카운트 (입실/퇴실 누적, 현재 인원)
- 로우데이터 저장 및 조회
- 시간대별/일별/주별/월별 누적치 필터링
- 외부 API를 통한 데이터 제공

### 1.2 시간(타임존) 운영 정책

피플카운터 관련 API의 **요청·응답 시각 필드**는 다음 형식으로 통일합니다.

- **형식**: `YYYY-MM-DDTHH:mm:ss` — **오프셋·`Z` 없음**. 값은 항상 **KST(Asia/Seoul) 벽시계** 의미입니다.
- **달력일만**: `YYYY-MM-DD` — **KST 기준 그날** (예: `date` 쿼리).
- **DB 저장**: MongoDB `Date`(BSON)는 **순간(instant)** 으로 저장하며, API 직렬화 시에만 위 KST 문자열로 변환합니다.
- **수신 호환**: 클라이언트가 `Z` 또는 `+09:00` 등이 붙은 ISO 문자열을 보내도 서버가 파싱할 수 있으나, **응답은 항상 무오프셋 KST 문자열**입니다.
- **UI 표시**: 응답 시각이 이미 KST 의미이므로, 표시 시 **추가 변환 없이** 동일 의미로 사용할 수 있습니다.

> 참고: `date=YYYY-MM-DD`, `period=day` 등은 **KST 달력** 기준 파라미터입니다.

---

## 2. 하드웨어 사양

### 2.1 통신 포트

- **포트**: `/dev/ttyS1`
- **통신 방식**: RS485
- **통신 속도**: 9600 bps
- **데이터 형식**: 8N1 (8 Data Bit, No Parity, 1 Stop Bit)
- **프로토콜**: APC100 전용 프로토콜 (Modbus 아님)

### 2.2 장비 정보

- **제조사**: (주)보탬
- **모델**: APC100
- **기본 ID**: 0000

### 2.3 통신 주기

- **폴링 주기**: 10초 (환경 변수 `PEOPLE_COUNTER_POLL_INTERVAL` 기본값 10000ms)
- **로우데이터 저장**: 1분당 1건 (분 경계 시점에 해당 분의 `inDelta`, `inRef` 저장)

---

## 3. 데이터 구조

### 3.1 Device/Unit ID

- **Device ID**: `d082`
- **Device Type**: `people_counter`
- **Unit ID**: `u001`

### 3.2 실시간 데이터 구조

```typescript
{
  clientId: string,        // 클라이언트 ID (예: "c0101")
  deviceId: "d082",        // 피플카운터 장비 ID
  type: "people_counter",  // 장비 타입
  units: [
    {
      unitId: "u001",
      data: {
        // 실시간 데이터
        currentCount: number,        // 현재 인원 (gggggg)
        inCumulative: number,        // 입실 누적 인원 (cccccc)
        outCumulative: number,      // 퇴실 누적 인원 (eeeeee)
        
        // 상태 정보
        output1: boolean,            // 출력1 (i: 0=OFF, 1=ON)
        output2: boolean,            // 출력2 (k: 0=OFF, 1=ON)
        countEnabled: boolean,       // 카운트설정 (m)
        buttonStatus: boolean,       // 보턴 (o)
        sensorStatus: boolean,       // 센서상태 (q)
        limitExceeded: boolean,      // 인원제한 (s: 0=이내, 1=이상)
        
        // 메타데이터
        timestamp: string,          // 데이터 수집 시각 (KST `YYYY-MM-DDTHH:mm:ss`, API 응답)
        rawData: string              // 원본 프로토콜 응답 (선택사항)
      }
    }
  ],
  updatedAt: string
}
```

### 3.3 로우데이터 구조 (1분 단위)

한 문서가 1분 구간 하나를 나타냅니다. `timestamp`는 해당 분의 시작 시각입니다.

```typescript
{
  clientId: string,
  deviceId: "d082",
  unitId: "u001",
  timestamp: Date,                  // 해당 분의 시작 시각
  inCumulative: number,             // 해당 분 시점의 입실 누적 (inRef와 동일)
  inDelta: number,                  // 해당 1분 동안의 입실 증가분
  inRef: number,                    // 해당 분 시점의 입실 누적 (근거/리셋 판단용)
  outCumulative: number,
  currentCount: number,
  output1: boolean,
  output2: boolean,
  countEnabled: boolean,
  buttonStatus: boolean,
  sensorStatus: boolean,
  limitExceeded: boolean
}
```

---

## 4. 데이터 저장 정책

### 4.1 실시간 데이터 (Data Collection)

- **저장 위치**: `data` 컬렉션
- **폴링 주기**: 10초
- **저장 조건**: IN누적 인원(`inCumulative`)이 이전 값과 다를 때만 업데이트

### 4.2 로우데이터 (Raw Data, 1분 단위)

- **저장 위치**: `people_counter_raw` 컬렉션
- **보관 기간**: 35일 (TTL 인덱스)
- **저장 주기**: 1분당 1건. 분 경계를 넘을 때 직전 분에 대해 한 건 저장.
- **저장 필드**: `inDelta`(해당 1분 동안 입실 증가분), `inRef`(해당 분 시점 입실 누적). 리셋 시 `inCumulative` 감소하면 해당 분의 `inDelta`는 리셋 후 누적값으로 저장.

### 4.3 데이터 저장 로직

```typescript
// 의사코드 (10초 폴링, 1분 저장)
every 10s:
  data = readFromAPC100();
  if (data.inCumulative !== lastInCumulative) {
    updateDataCollection(data);
    lastInCumulative = data.inCumulative;
  }
  if (currentMinute !== lastSavedMinute) {
    saveOneMinuteRaw({
      timestamp: lastSavedMinuteStart,
      inDelta: currentIn - refAtStartOfMinute,  // 또는 리셋 시 currentIn
      inRef: currentIn,
      ...
    });
    refAtStartOfMinute = currentIn;
    lastSavedMinute = currentMinute;
  }
```

---

## 5. 데이터 조회 및 필터링

### 5.1 실시간 데이터 조회

**엔드포인트**: `GET /api/v1/external/data`

기존 data 엔드포인트를 통해 피플카운터 데이터도 함께 조회됩니다.

**응답 예시:**
```json
{
  "id": "c0101",
  "devices": [
    {
      "id": "d082",
      "type": "people_counter",
      "units": [
        {
          "id": "u001",
          "data": {
            "currentCount": 24,
            "inCumulative": 30,
            "outCumulative": 6,
            "output1": false,
            "output2": true,
            "countEnabled": true,
            "buttonStatus": true,
            "sensorStatus": true,
            "limitExceeded": false,
            "timestamp": "2025-01-09T23:30:00"
          }
        }
      ]
    }
  ]
}
```

### 5.2 누적치 필터링

로우데이터를 기반으로 다음 기간별 누적치를 계산하여 제공합니다:

#### 5.2.1 1시간 누적치

- **기준**: 현재 시간부터 1시간 전까지
- **계산**: 해당 시간대의 로우데이터에서 최대 `inCumulative` - 최소 `inCumulative`

#### 5.2.2 1일 누적치 (오늘)

- **기준**: 오늘 00:00:00 ~ 현재 시간
- **계산**: 오늘의 로우데이터에서 최대 `inCumulative` - 오늘 시작 시점의 `inCumulative`

#### 5.2.3 1주 누적치 (가까운 월~일요일)

- **기준**: 가장 가까운 월요일 00:00:00 ~ 현재 시간
- **계산**: 해당 주의 로우데이터에서 최대 `inCumulative` - 주 시작 시점의 `inCumulative`

#### 5.2.4 한달 누적치 (1일~마지막날)

- **기준**: 현재 월의 1일 00:00:00 ~ 현재 시간
- **계산**: 해당 월의 로우데이터에서 최대 `inCumulative` - 월 시작 시점의 `inCumulative`

### 5.3 필터링 API 엔드포인트

**엔드포인트**: `GET /api/v1/external/people-counter/stats`

**Query Parameters:**
- `period`: `hour` | `day` | `week` | `month`
- `startDate`: 시작 시각 (KST `YYYY-MM-DDTHH:mm:ss` 또는 `Z`/`+09:00` 포함 ISO — 호환, 선택)
- `endDate`: 종료 시각 (동일, 선택)

**응답 예시:**
```json
{
  "success": true,
  "message": "피플카운터 통계 조회 성공",
  "data": {
    "period": "day",
    "startDate": "2025-01-09T00:00:00",
    "endDate": "2025-01-09T23:30:00",
    "stats": {
      "inCount": 30,        // 입실 누적
      "outCount": 6,        // 퇴실 누적
      "peakCount": 24,      // 최대 인원
      "avgCount": 15,       // 평균 인원
      "dataPoints": 120     // 데이터 포인트 수
    },
    "rawData": [            // 데이터가 많지 않으면 로우데이터 포함
      {
        "timestamp": "2025-01-09T23:30:00",
        "inCumulative": 30,
        "outCumulative": 6,
        "currentCount": 24
      }
    ]
  }
}
```

### 5.4 시간대(1시간 단위) 통계 조회

#### 5.4.1 외부 API (상위 통합플랫폼용)

- **엔드포인트**: `GET /api/v1/external/people-counter/hourly-stats`
- **설명**: 지정한 날짜를 기준으로, 하루(00:00~24:00)를 1시간 단위로 나눈 24개 버킷에 대한 입·퇴실 통계를 조회합니다.
- **Query Parameters:**
  - `date` (required): 기준 날짜 (`YYYY-MM-DD`, 예: `2025-01-09`)
  - `clientId` (optional): 클라이언트 ID (미지정 시 최신 클라이언트 사용)
- **타임존 기준**:
  - `date(YYYY-MM-DD)`는 **KST 달력일(00:00~24:00)** 을 의미합니다.
  - 응답의 `buckets[].start/end`는 **KST 무오프셋 문자열** (`YYYY-MM-DDTHH:mm:ss`) 입니다.
- **응답 예시:**
```json
{
  "success": true,
  "message": "피플카운터 시간대별 통계 조회 성공",
  "data": {
    "date": "2025-01-09",
    "timezone": "Asia/Seoul",
    "buckets": [
      {
        "start": "2025-01-09T00:00:00",
        "end": "2025-01-09T01:00:00",
        "inCount": 5,
        "outCount": 2,
        "peakCount": 3,
        "avgCount": 1.4,
        "dataPoints": 12
      }
      // ... 최대 24개 버킷
    ]
  }
}
```

#### 5.4.2 내부 API (운영 UI용)

- **엔드포인트**: `GET /api/v1/internal/system/people-counter/hourly-stats`
- **설명**: 외부 API와 동일한 스키마로, 관리자 웹 UI에서 활용하기 위한 내부용 엔드포인트입니다.
- **Query Parameters:**
  - `date` (required): 기준 날짜 (`YYYY-MM-DD`)
  - `clientId` (optional): 클라이언트 ID
- **응답 구조**:
- 
  - `data.date`, `data.timezone`, `data.buckets` 필드 구조는 외부 API와 동일합니다.

### 5.5 10분 단위 사용량 API (상위 플랫폼용)

- **엔드포인트**: `GET /api/v1/external/people-counter/usage-10min`
- **설명**: 지정 구간을 10분 버킷으로 나누어, 각 버킷별 입실 수(`inCount`)만 제공합니다.
- **요청/응답 시간 표기 정책**:
  - 요청 `start/end`는 **KST 무오프셋** (`YYYY-MM-DDTHH:mm:ss`) 또는 **호환을 위해** `Z`/`+09:00` 포함 ISO를 전달할 수 있습니다.
  - 응답의 `range.start/end`, `buckets[].start/end`는 **KST 무오프셋 문자열**입니다.
- **Query Parameters**:
  - `start`, `end` (**필수**): 임의 구간 `[start, end)` — **KST 무오프셋** (`YYYY-MM-DDTHH:mm:ss` 등) 또는 `Z`/`+09:00` 포함 ISO(호환).
  - `date`, `period` 등 다른 방식은 **지원하지 않습니다**.
- **clientId**: 미지정. 서버가 최신 클라이언트 사용(IP로 구분되는 환경 가정).
- **응답 예시:**
```json
{
  "success": true,
  "message": "피플카운터 10분 사용량 조회 성공",
  "data": {
    "range": {
      "start": "2025-01-09T00:00:00",
      "end": "2025-01-10T00:00:00"
    },
    "bucketSizeMinutes": 10,
    "buckets": [
      { "start": "2025-01-09T00:00:00", "end": "2025-01-09T00:10:00", "inCount": 2 },
      { "start": "2025-01-09T00:10:00", "end": "2025-01-09T00:20:00", "inCount": 5 }
    ]
  }
}
```

#### 5.5.1 KST 하루 조회를 `start/end`로 요청하는 예시

**KST 2025-01-09 하루(00:00~익일 00:00, KST 벽시계)** 를 조회하는 예:

`GET /api/v1/external/people-counter/usage-10min?start=2025-01-09T00:00:00&end=2025-01-10T00:00:00`

(KST 달력 하루를 조회할 때는 익일 00:00:00을 `end`로 두어 `[start, end)` 구간으로 요청합니다.)

---

## 6. 구현 요구사항

### 6.1 서비스 구조

#### 6.1.1 PeopleCounterService

- **역할**: APC100 장비와의 통신 담당
- **포트**: `/dev/ttyS1`
- **통신 주기**: 1초
- **기능**:
  - 상태 조회 (9바이트 ASCII `[xxxxBTR]`, 예: `[0000BTR]`)
  - 응답 파싱
  - 데이터 변환

#### 6.1.2 PeopleCounterPollerService

- **역할**: 주기적 폴링 및 데이터 저장
- **폴링 주기**: 10초 (기본값)
- **기능**:
  - `PeopleCounterQueueService`를 통해 APC100 조회
  - IN누적 변경 시 `Data` 컬렉션 업데이트
  - 분 경계 감지 시 1분당 1건 `people_counter_raw` 저장 (`inDelta`, `inRef` 포함)

#### 6.1.3 PeopleCounterDataService

- **역할**: 데이터 조회 및 통계 계산
- **기능**:
  - 로우데이터 조회
  - 기간별 필터링
  - 누적치 계산
  - 통계 데이터 생성

### 6.2 데이터베이스 스키마

#### 6.2.1 Data Collection (기존)

기존 `data` 컬렉션에 피플카운터 데이터가 포함됩니다.

#### 6.2.2 PeopleCounterRaw Collection (1분 단위)

```typescript
interface PeopleCounterRaw {
  _id: ObjectId;
  clientId: string;
  deviceId: "d082";
  unitId: "u001";
  timestamp: Date;        // 해당 분의 시작 시각
  inCumulative: number;
  inDelta?: number;        // 해당 1분 동안 입실 증가분
  inRef?: number;         // 해당 분 시점 입실 누적
  outCumulative: number;
  currentCount: number;
  output1: boolean;
  output2: boolean;
  countEnabled: boolean;
  buttonStatus: boolean;
  sensorStatus: boolean;
  limitExceeded: boolean;
  createdAt: Date;
}

// 인덱스
PeopleCounterRawSchema.index({ clientId: 1, timestamp: -1 });
PeopleCounterRawSchema.index({ timestamp: 1 }, { expireAfterSeconds: 3024000 }); // 35일 TTL (35*24*60*60)
```

### 6.3 API 엔드포인트

#### 6.3.1 실시간 데이터 조회

- **엔드포인트**: `GET /api/v1/external/data`
- **설명**: 기존 data 엔드포인트에 피플카운터 데이터 포함
- **인증**: API Key 필요

#### 6.3.2 통계 데이터 조회

- **엔드포인트**: `GET /api/v1/external/people-counter/stats`
- **설명**: 기간별 누적치 및 통계 데이터 조회
- **인증**: API Key 필요
- **Query Parameters**:
  - `period` (required): `hour` | `day` | `week` | `month`
  - `startDate` (optional): KST 무오프셋 또는 호환 ISO
  - `endDate` (optional): 동일

#### 6.3.3 로우데이터 조회

- **엔드포인트**: `GET /api/v1/external/people-counter/raw`
- **설명**: 로우데이터 직접 조회 (1분 단위 문서, `inDelta`, `inRef` 포함)
- **인증**: API Key 필요
- **Query Parameters**:
  - `startDate` (required): KST 무오프셋 또는 호환 ISO
  - `endDate` (required): 동일
  - `limit` (optional): 최대 반환 개수 (기본값: 1000)

#### 6.3.4 10분 단위 사용량 조회

- **엔드포인트**: `GET /api/v1/external/people-counter/usage-10min`
- **설명**: 10분 버킷별 입실 수(`inCount`)만 제공. 요청/응답 시각은 **KST 무오프셋 문자열** 계약을 따릅니다.
- **인증**: API Key 필요
- **Query Parameters**: `start`, `end` (필수, 구간 `[start, end)`). KST 무오프셋 또는 호환 ISO.

---

## 7. 환경 설정

### 7.1 환경 변수

```bash
# 피플카운터 포트 설정
PEOPLE_COUNTER_PORT=/dev/ttyS1
PEOPLE_COUNTER_BAUD_RATE=9600
PEOPLE_COUNTER_POLL_INTERVAL=10000  # 10초 (밀리초)
PEOPLE_COUNTER_DEVICE_ID=0000      # 기본 ID

# 로우데이터 보관 기간 (일)
PEOPLE_COUNTER_RAW_DATA_RETENTION_DAYS=35
```

위 환경 변수들은 **포트/보드레이트/폴링 주기 등 기본 동작 파라미터를 설정하기 위한 선택 사항**입니다.  
피플카운터 기능의 **ON/OFF 자체는 데이터베이스의 `System.runtime.peopleCounterEnabled` 필드**로 관리되며,
해당 값은 시스템 설정 UI(관리자 페이지)에서 변경합니다.  
환경 변수를 설정하지 않더라도:

- `PEOPLE_COUNTER_PORT` 등이 정의되어 있지 않으면 코드에 정의된 기본값(`/dev/ttyS1`, `9600bps`, `10000ms`)을 사용합니다.
- `peopleCounterEnabled`의 기본값은 항상 `false`이며, 사용자가 시스템 설정에서 명시적으로 ON 으로 변경하기 전까지는 피플카운터 기능이 비활성화된 상태로 동작합니다.

### 7.2 Docker 설정

모노레포 루트의 `docker-compose.integrated.yml`에 다음 설정을 참고합니다:

```yaml
services:
  backend:
    volumes:
      - /dev/ttyS0:/dev/ttyS0:rw  # 기존 Modbus 포트
      # (선택) 피플카운터(APC100) 사용 시에만 ttyS1 마운트
      # - /dev/ttyS1:/dev/ttyS1:rw  # 피플카운터 포트
```

피플카운터 장비가 실제로 연결되어 있지 않은 환경에서는 `/dev/ttyS1` 마운트를 생략해도 됩니다.  
이 경우 피플카운터 서비스는 포트 오픈 실패를 로그로만 남기고, `peopleCounterEnabled`가 기본값 `false` 상태인 한
시스템의 다른 기능(DDC, 센서, 조명 등)에는 영향을 주지 않습니다.

---

## 8. 에러 처리

### 8.1 통신 오류

- **시리얼 포트 연결 실패**: 로그 기록, 재연결 시도
- **타임아웃**: 1초 타임아웃 설정, 재시도 로직
- **프로토콜 파싱 오류**: 로그 기록, 다음 주기 재시도

### 8.2 데이터 저장 오류

- **DB 연결 실패**: 로그 기록, 재시도 큐에 추가
- **데이터 검증 실패**: 로그 기록, 데이터 저장 건너뛰기

---

## 9. 성능 고려사항

### 9.1 데이터 저장 최적화

- **조건부 저장**: IN누적 변경 시에만 저장하여 불필요한 저장 방지
- **인덱스 최적화**: `timestamp` 기준 인덱스로 조회 성능 향상
- **TTL 인덱스**: 35일 자동 삭제로 스토리지 관리

### 9.2 통계 계산 최적화

- **캐싱**: 자주 조회되는 통계 데이터 캐싱 (예: 1분 캐시)
- **집계 파이프라인**: MongoDB Aggregation Pipeline 활용
- **데이터가 적을 때**: 로우데이터 직접 반환으로 계산 생략

---

## 10. 테스트 시나리오

### 10.1 통신 테스트

1. 시리얼 포트 연결 확인
2. 상태 조회 명령 전송
3. 응답 파싱 확인
4. 데이터 변환 확인

### 10.2 데이터 저장 테스트

1. IN누적 변경 시 저장 확인
2. IN누적 동일 시 저장 안 함 확인
3. 로우데이터 저장 확인
4. 35일 TTL 동작 확인

### 10.3 통계 조회 테스트

1. 1시간 누적치 계산 확인
2. 1일 누적치 계산 확인
3. 1주 누적치 계산 확인
4. 1달 누적치 계산 확인

---

## 11. 참고사항

### 11.1 프로토콜 상세

프로토콜 상세 내용은 [APC100_RS485_PROTOCOL.md](./APC100_RS485_PROTOCOL.md) 문서를 참조하세요.

### 11.2 기존 시스템과의 통합

- 피플카운터는 기존 Modbus 시스템(`ttyS0`)과 독립적으로 동작합니다.
- `ttyS1` 포트를 전용으로 사용합니다.
- 기존 `data` 엔드포인트에 자동으로 포함됩니다.

### 11.3 외부 프로그램 연동

외부 프로그램은 다음 엔드포인트를 통해 데이터를 조회할 수 있습니다:

- `GET /api/v1/external/data`: 실시간 데이터 (피플카운터 포함)
- `GET /api/v1/external/people-counter/stats`: 통계 데이터
- `GET /api/v1/external/people-counter/raw`: 로우데이터 (1분 단위)
- `GET /api/v1/external/people-counter/usage-10min`: 10분 버킷별 입실 수 (상위 플랫폼용)

### 11.4 선택적 기능 및 배포 전략

- 피플카운터 기능은 **선택적(optional) 기능**입니다.  
  동일한 백엔드/프론트엔드 이미지로, 피플카운터 장비가 있는 제품/없는 제품 모두 배포할 수 있어야 합니다.
- 기본값은 `peopleCounterEnabled = false` 이며, 초기 설치 시 피플카운터 기능은 비활성화 상태로 시작합니다.
- 운영자는 시스템 설정 페이지의 **"피플카운터" 카드**에서 ON/OFF 토글을 통해 `peopleCounterEnabled` 값을 변경할 수 있습니다.
- `peopleCounterEnabled === false` 인 경우:
  - `GET /api/v1/external/data` 응답에서 피플카운터 장비(`deviceId = d082`)는 제외됩니다.
  - `GET /api/v1/external/people-counter/stats`, `GET /api/v1/external/people-counter/raw` 요청 시
    HTTP 404와 함께 "피플카운터가 비활성화되어 있습니다." 메시지를 반환합니다.
  - 시리얼 포트(`/dev/ttyS1`) 연결 실패나 피플카운터 통신 오류는 로그 및 상태/에러 컬렉션에만 기록되며,
    시스템 전체 동작에는 영향을 주지 않습니다.

---

## 12. 선택적 기능

### 12.1 시스템 설정에서 활성화/비활성화 방법

1. 관리자 페이지 접속 후 **시스템 설정 → 시스템 탭**으로 이동합니다.
2. `피플카운터` 카드에서 현재 상태(활성화/비활성화)를 확인합니다.
3. ON/OFF 토글 스위치를 변경하면 `/api/v1/internal/system/people-counter` API가 호출되어
   `System.runtime.peopleCounterEnabled` 값이 업데이트됩니다.
4. 변경 결과는 토스트 메시지로 피드백 되며, 이후 폴러/외부 API 동작이 자동으로 해당 상태를 반영합니다.

### 12.2 피플카운터 장비가 없는 제품 릴리즈

- 하드웨어에 APC100 피플카운터가 연결되어 있지 않은 모델에서는:
  - `/dev/ttyS1` 디바이스를 Docker 컨테이너에 마운트하지 않습니다.
  - 시스템 설정에서 `peopleCounterEnabled`를 **OFF(기본값)** 상태로 유지합니다.
- 이 구성에서도:
  - DDC/센서/조명 등 다른 장비는 정상 동작합니다.
  - 대시보드/데이터 API에서 피플카운터 장비(`d082`)만 보이지 않을 뿐, 나머지 응답 구조는 동일합니다.

### 12.3 Mock 모드 활용 (개발/테스트용)

- 개발/테스트 환경에서 실제 APC100 장비 없이 피플카운터 기능을 시험하려면
  `PEOPLE_COUNTER_MOCK_ENABLED=true` 환경 변수를 설정하여 **Mock 모드**로 실행할 수 있습니다.
- Mock 모드에서는:
  - 내부적으로 가상의 입실/퇴실 이벤트를 생성하여 `inCumulative/outCumulative/currentCount` 값을 변경합니다.
  - 통계/로우데이터 API, 사용자 통계 화면 등을 실제와 동일한 방식으로 검증할 수 있습니다.

---

**문서 작성일**: 2025-01-09
**최종 수정일**: 2026-02-24
