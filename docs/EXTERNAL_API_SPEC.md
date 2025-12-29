# 부여 스마트그린쉼터 연동 시스템 외부API 명세서 (v1)

## 문서 버전 : v0.5

## 소속 : 부여군

## 문서 구분 : 외부 연동용

### 수정이력(Revision history)

| 문서버전 | 수정 일자  | 수정 내용                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 비고           |
| -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| v0.1     | 2025.06.19 | 기본안 작성                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 최초 버전      |
| v0.2     | 2025.06.30 | 상세 작성<br>엔드포인트 정리 ( 데이터가 크지 않으므로 )<br>- /devices 이하 제거<br>- POST만 유지 ( 제어용 )                                                                                                                                                                                                                                                                                                                                                                                                                                                               | 구조 단순화    |
| v0.3     | 2025.07.03 | 2.1 API목록<br>- BaseURL : /external prefix 명시 ( 내부API와 분리 위해 )<br>- 특정유닛 제어 : 엔드포인트 변경<br>- 특정유닛 대량제어 엔드포인트 추가<br>- 특정유닛 대량제어 상태조회 엔드포인트 추가<br>- 캐싱정책추가<br>3.2 클라이언트 상태조회<br>- [devices 객체] : 장비상태설명추가<br>- [units 객체] : 유닛상태설명추가<br>3.5 특정유닛제어 명세변경<br>- 엔드포인트 변경 /devices/{deviceId}/units/{unitId} → /devices/{deviceId}/units/{unitId}/command<br>3.6 특정유닛대량제어 명세추가<br>3.7 특정유닛대량제어 상태조회 명세추가<br>5. 예제 curl 요청 메뉴 삭제 | 협의내용 반영  |
| v0.4     | 2025.08.03 | 문서 포맷 정리<br>- 마크다운 테이블 형식 정렬 및 가독성 개선<br>- 목차 번호 수정 (5→4, 6→5, 7→6)<br>- API 목록 테이블 구조 개선<br>- 장비코드, 타입, 데이터필드 테이블 정렬<br>- 장비, 유닛 코드일람 테이블 정렬<br>- 모든 응답필드 테이블 정렬 및 가독성 개선<br>- 오류 코드 테이블 정렬                                                                                                                                                                                                                                                                                 | 문서 포맷 개선 |
| v0.5     | 2025.01.XX | 절기 설정 API 추가<br>- 절기 설정 조회 엔드포인트 추가<br>- 절기 설정 저장 엔드포인트 추가                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | 기능 추가      |

## 목차

1. 사전안내
2. 응답 구조
3. 기본정보
   - 3.1 스마트그린쉼터 내부구성도
   - 3.2 API 목록
   - 3.3 HTTP 에러코드
   - 3.4 스마트그린쉼터 클라이언트 코드
   - 3.5 스마트그린쉼터 장비코드, 타입, 데이터필드
   - 3.5.1 스마트그린쉼터 데이터필드 상세정보
   - 3.6 스마트그린쉼터 장비, 유닛 코드일람
   - 3.7 스마트그린쉼터 유닛 에러코드
4. API명세
   - 4.1 클라이언트 정보조회
   - 4.2 클라이언트 상태조회
   - 4.3 클라이언트 데이터조회
   - 4.4 클라이언트 에러조회
   - 4.5 특정유닛 대량제어
   - 4.6 특정유닛 대량제어 상태조회
   - 4.7 절기 설정 조회
   - 4.8 절기 설정 저장
5. 오류 코드
6. 테스트 토큰
7. 문의처

## 1. 사전안내

본 문서는 원격서버(센터SW)와 스마트그린쉼터 클라이언트 간의 통신을 위해 제공하는 REST API 명세를 정의합니다

- 제공 형식: REST API
- 사용 방식: HTTP
- 인증 방식: API Key
- 지원 형식: JSON
- 사용 메소드: GET / POST
- 구성도:

```
원격서버(센터SW) ←→ 스마트그린쉼터 클라이언트
```

## 응답 구조

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

## 3. 기본정보

### 3.1 스마트그린쉼터 내부구성도

- 클라이언트 : 스마트그린쉼터를 의미
- 장비 : 데이터(설정 및 취득) 관리하기 위한 추상화 계층
- 유닛 : 실제 장비

### 3.2 API 목록

**[원격서버 → 스마트그린쉼터]**

**BaseURL:** `http://{client_ip}/api/v1/external`

| 엔드포인트                  | 설명                        | 메서드 및 경로                                     |
| --------------------------- | --------------------------- | -------------------------------------------------- |
| 클라이언트 정보 조회        | 클라이언트의 기본 정보 조회 | `GET /client`                                      |
| 클라이언트 상태 조회        | 클라이언트의 상태 조회      | `GET /status`                                      |
| 클라이언트 데이터 조회      | 클라이언트의 데이터 조회    | `GET /data`                                        |
| 클라이언트 에러 조회        | 클라이언트의 에러 조회      | `GET /errors`                                      |
| 특정 유닛 대량제어          | 여러 명령 동시 제어         | `POST /devices/{deviceId}/units/{unitId}/commands` |
| 특정 유닛 대량제어 상태조회 | 대량제어 결과 조회          | `GET /devices/{deviceId}/units/{unitId}/commands`  |
| 절기 설정 조회              | 월별 절기 설정 조회         | `GET /system/seasonal`                             |
| 절기 설정 저장              | 월별 절기 설정 저장         | `POST /system/seasonal`                            |

| 항목     | 값/설명                      |
| -------- | ---------------------------- |
| 인증방식 | API Key (Authorization 헤더) |
| 인증필드 | Authorization                |
| 응답형식 | application/json             |
| 캐싱정책 | Cache-Control: no-store      |
| Timeout  | 15초                         |
| 버전     | v1.0                         |

※ 참고: 모든 요청은 Authorization 헤더에 발급받은 API Key를 포함해야 합니다. 회사 코드는 각 회사명 기준으로 고유하게 발급되며, 외부에 공개되지 않도록 주의하십시오.

※ 로컬테스트용 : Authorization: Bearer nzero_external_key_2025

### 3.2.1 스키마 엔드포인트

**[스키마 엔드포인트 – 응답필드 데이터타입 및 응답 예시 확인용]**

| 설명                       | path                                                      |
| -------------------------- | --------------------------------------------------------- |
| 클라이언트 정보 조회       | `GET /client/schema`                                      |
| 클라이언트 상태 조회       | `GET /status/schema`                                      |
| 클라이언트 데이터 조회     | `GET /data/schema`                                        |
| 클라이언트 에러 조회       | `GET /errors/schema`                                      |
| 특정유닛 대량제어          | `POST /devices/{deviceId}/units/{unitId}/commands/schema` |
| 특정유닛 대량제어 상태조회 | `GET /devices/{deviceId}/units/{unitId}/commands/schema`  |
| 절기 설정 조회             | `GET /system/seasonal/schema`                             |

### 3.3 HTTP 에러코드

| 코드 | 설명                    | 예시 상황                                    |
| ---- | ----------------------- | -------------------------------------------- |
| 200  | 요청 성공               | 정상적으로 데이터 반환                       |
| 400  | 요청 파라미터 오류      | 필수 파라미터 누락 또는 잘못된 형식          |
| 401  | 인증 실패               | 유효하지 않은 API Key                        |
| 403  | 권한 부족               | 해당 클라이언트/장비/유닛에 접근 권한 없음   |
| 404  | 존재하지않는데이터요청  | 잘못된 clientId, deviceId, 또는 unitId       |
| 405  | 메서드 허용되지 않음    | POST 대신 GET으로 호출                       |
| 422  | 처리 불가능한 요청      | 유효하지 않은 JSON 본문 (예: action 값 오류) |
| 429  | 요청 제한 초과          | 단시간 내 너무 많은 요청                     |
| 500  | 서버 내부 오류          | 서버에서 예기치 않은 오류 발생               |
| 503  | 서비스 일시적 사용 불가 | 서버 유지보수 또는 과부하                    |

### 3.4 스마트그린쉼터 클라이언트 코드

| 코드  | 설명                   |
| ----- | ---------------------- |
| c0101 | 세도면사무소(승강장형) |
| c0102 | 정림사지입구(쉼터형)   |

> 이후 추가되는 클라이언트는 함께 첨부되는 엑셀파일을 참고해주시기 바랍니다

### 3.5 스마트그린쉼터 장비코드, 타입, 데이터필드

- 장비코드 : 같은 장비류로 묶어서 관리
- 장비타입 : 같은 장비타입은 같은 데이터군을 가집니다.
  (전등 lighting는 "power" "connection" "start_time_1" "end_time_1" "start_time_2" "end_time_2" 데이터를 가진다.)
- 데이터필드 : 제어하거나 취득하는 데이터

| 장비<br>코드 | 장비<br>명       | 장비<br>타입 | data<br>필드명 | 데이터<br>타입 | 설명             | 관련 액션(action)                    |
| ------------ | ---------------- | ------------ | -------------- | -------------- | ---------------- | ------------------------------------ |
| d011         | 조명             | lighting     | auto           | boolean        | 모드상태         | SET_AUTO<br>GET_AUTO                 |
|              |                  |              | power          | boolean        | 전원상태         | SET_POWER<br>GET_POWER               |
|              |                  |              | connection     | boolean        | 통신상태         | -<br>GET_CONNECTION                  |
|              |                  |              | start_time_1   | string         | 시작시간1        | SET_START_TIME_1<br>GET_START_TIME_1 |
|              |                  |              | end_time_1     | string         | 종료시간1        | SET_END_TIME_1<br>GET_END_TIME_1     |
|              |                  |              | start_time_2   | string         | 시작시간2        | SET_START_TIME_2<br>GET_START_TIME_2 |
|              |                  |              | end_time_2     | string         | 종료시간2        | SET_END_TIME_2<br>GET_END_TIME_2     |
| d021         | 냉난방기         | cooler       | auto           | boolean        | 모드상태         | SET_AUTO<br>GET_AUTO                 |
|              |                  |              | power          | boolean        | 전원상태         | SET_POWER<br>GET_POWER               |
|              |                  |              | connection     | boolean        | 통신상태         | -<br>GET_CONNECTION                  |
|              |                  |              | start_time_1   | string         | 시작시간1        | SET_START_TIME_1<br>GET_START_TIME_1 |
|              |                  |              | end_time_1     | string         | 종료시간1        | SET_END_TIME_1<br>GET_END_TIME_1     |
|              |                  |              | mode           | int            | 운전모드         | SET_MODE<br>GET_MODE                 |
|              |                  |              | cur_temp       | float          | 현재온도         | -<br>GET_CUR_TEMP                    |
|              |                  |              | cont_temp      | float          | 목표온도         | SET_CONT_TEMP<br>GET_CONT_TEMP       |
|              |                  |              | speed          | int            | 풍량             | SET_SPEED<br>GET_SPEED               |
| d022         | 전열교환기       | exchanger    | auto           | boolean        | 모드상태         | SET_AUTO<br>GET_AUTO                 |
|              |                  |              | power          | boolean        | 전원상태         | SET_POWER<br>GET_POWER               |
|              |                  |              | connection     | boolean        | 통신상태         | -<br>GET_CONNECTION                  |
|              |                  |              | start_time_1   | string         | 시작시간1        | SET_START_TIME_1<br>GET_START_TIME_1 |
|              |                  |              | end_time_1     | string         | 종료시간1        | SET_END_TIME_1<br>GET_END_TIME_1     |
|              |                  |              | mode           | int            | 운전모드         | SET_MODE<br>GET_MODE                 |
|              |                  |              | speed          | int            | 풍량             | SET_SPEED<br>GET_SPEED               |
| d023         | 에어커튼         | aircurtain   | auto           | boolean        | 모드상태         | SET_AUTO<br>GET_AUTO                 |
|              |                  |              | power          | boolean        | 전원상태         | SET_POWER<br>GET_POWER               |
|              |                  |              | connection     | boolean        | 통신상태         | -<br>GET_CONNECTION                  |
|              |                  |              | start_time_1   | string         | 시작시간1        | SET_START_TIME_1<br>GET_START_TIME_1 |
|              |                  |              | end_time_1     | string         | 종료시간1        | SET_END_TIME_1<br>GET_END_TIME_1     |
| d041         | 온열벤치         | bench        | auto           | boolean        | 모드상태         | SET_AUTO<br>GET_AUTO                 |
|              |                  |              | power          | boolean        | 전원상태         | SET_POWER<br>GET_POWER               |
|              |                  |              | connection     | boolean        | 통신상태         | -<br>GET_CONNECTION                  |
|              |                  |              | start_time_1   | string         | 시작시간1        | SET_START_TIME_1<br>GET_START_TIME_1 |
|              |                  |              | end_time_1     | string         | 종료시간1        | SET_END_TIME_1<br>GET_END_TIME_1     |
| d051         | 자동문           | door         | auto           | boolean        | 모드상태         | SET_AUTO<br>GET_AUTO                 |
|              |                  |              | power          | boolean        | 전원상태         | SET_POWER<br>GET_POWER               |
|              |                  |              | connection     | boolean        | 연결상태         | -<br>GET_CONNECTION                  |
|              |                  |              | start_time_1   | string         | 시작시간1        | SET_START_TIME_1<br>GET_START_TIME_1 |
|              |                  |              | end_time_1     | string         | 종료시간1        | SET_END_TIME_1<br>GET_END_TIME_1     |
| d061         | 통합센서         | sensor       | connection     | boolean        | 통신상태         | -<br>GET_CONNECTION                  |
|              |                  |              | pm10           | int            | 초초미세먼지수치 | -<br>GET_PM10                        |
|              |                  |              | pm25           | int            | 초미세먼지수치   | -<br>GET_PM25                        |
|              |                  |              | pm100          | int            | 미세먼지수치     | -<br>GET_PM100                       |
|              |                  |              | co2            | int            | 이산화탄소농도   | -<br>GET_CO2                         |
|              |                  |              | voc            | int            | 유기화합물농도   | -<br>GET_VOC                         |
|              |                  |              | hum            | float          | 습도             | -<br>GET_HUM                         |
|              |                  |              | temp           | float          | 온도             | -<br>GET_TEMP                        |
| d081         | 자동문외부스위치 | externalsw   | auto           | boolean        | 모드상태         | SET_AUTO<br>GET_AUTO                 |
|              |                  |              | start_time_1   | string         | 시작시간1        | SET_START_TIME_1<br>GET_START_TIME_1 |
|              |                  |              | end_time_1     | string         | 종료시간1        | SET_END_TIME_1<br>GET_END_TIME_1     |

### 3.5.1 스마트그린쉼터 데이터필드 상세정보

| 장비<br>타입 | data<br>필드명 | 데이터<br>타입 | 최소값 | 최대값 | 단위  | 예시값 | 설명                                                   |
| ------------ | -------------- | -------------- | ------ | ------ | ----- | ------ | ------------------------------------------------------ |
| lighting     | auto           | boolean        | -      | -      | -     | true   | 모드상태 (true: 자동, false: 수동)                     |
|              | power          | boolean        | -      | -      | -     | true   | 전원상태 (true: 켜짐, false: 꺼짐)                     |
|              | connection     | boolean        | -      | -      | -     | true   | 통신상태 (true: 정상, false: 이상)                     |
|              | start_time_1   | string         | 00:00  | 23:59  | -     | 08:00  | 시작시간1 (HH:mm 형식)                                 |
|              | end_time_1     | string         | 00:00  | 23:59  | -     | 22:00  | 종료시간1 (HH:mm 형식)                                 |
|              | start_time_2   | string         | 00:00  | 23:59  | -     | 18:00  | 시작시간2 (HH:mm 형식)                                 |
|              | end_time_2     | string         | 00:00  | 23:59  | -     | 06:00  | 종료시간2 (HH:mm 형식)                                 |
| cooler       | auto           | boolean        | -      | -      | -     | true   | 모드상태 (true: 자동, false: 수동)                     |
|              | power          | boolean        | -      | -      | -     | true   | 전원상태 (true: 켜짐, false: 꺼짐)                     |
|              | connection     | boolean        | -      | -      | -     | true   | 통신상태 (true: 정상, false: 이상)                     |
|              | start_time_1   | string         | 00:00  | 23:59  | -     | 08:00  | 시작시간1 (HH:mm 형식)                                 |
|              | end_time_1     | string         | 00:00  | 23:59  | -     | 22:00  | 종료시간1 (HH:mm 형식)                                 |
|              | mode           | int            | 0      | 4      | -     | 0      | 운전모드 (0: 냉방, 1: 제습, 2: 송풍, 3: 자동, 4: 난방) |
|              | cur_temp       | float          | -      | -      | °C    | 24.0   | 현재온도                                               |
|              | cont_temp      | float          | 16.0   | 30.0   | °C    | 22.0   | 목표온도                                               |
|              | speed          | int            | 1      | 4      | -     | 2      | 풍량 (1: 약, 2: 중, 3: 강, 4: 자동)                    |
| exchanger    | auto           | boolean        | -      | -      | -     | true   | 모드상태 (true: 자동, false: 수동)                     |
|              | power          | boolean        | -      | -      | -     | true   | 전원상태 (true: 켜짐, false: 꺼짐)                     |
|              | connection     | boolean        | -      | -      | -     | true   | 통신상태 (true: 정상, false: 이상)                     |
|              | start_time_1   | string         | 00:00  | 23:59  | -     | 08:00  | 시작시간1 (HH:mm 형식)                                 |
|              | end_time_1     | string         | 00:00  | 23:59  | -     | 22:00  | 종료시간1 (HH:mm 형식)                                 |
|              | mode           | int            | 1      | 2      | -     | 2      | 동작모드 (1: 수동, 2: 자동)                            |
|              | speed          | int            | 1      | 4      | -     | 2      | 풍량 (1: 약, 2: 중, 3: 강, 4: 자동)                    |
| aircurtain   | auto           | boolean        | -      | -      | -     | true   | 모드상태 (true: 자동, false: 수동)                     |
|              | power          | boolean        | -      | -      | -     | true   | 전원상태 (true: 켜짐, false: 꺼짐)                     |
|              | connection     | boolean        | -      | -      | -     | true   | 통신상태 (true: 정상, false: 이상)                     |
|              | start_time_1   | string         | 00:00  | 23:59  | -     | 08:00  | 시작시간1 (HH:mm 형식)                                 |
|              | end_time_1     | string         | 00:00  | 23:59  | -     | 22:00  | 종료시간1 (HH:mm 형식)                                 |
| bench        | auto           | boolean        | -      | -      | -     | true   | 모드상태 (true: 자동, false: 수동)                     |
|              | power          | boolean        | -      | -      | -     | true   | 통신상태 (true: 정상, false: 이상)                     |
|              | start_time_1   | string         | 00:00  | 23:59  | -     | 08:00  | 시작시간1 (HH:mm 형식)                                 |
|              | end_time_1     | string         | 00:00  | 23:59  | -     | 22:00  | 종료시간1 (HH:mm 형식)                                 |
| door         | auto           | boolean        | -      | -      | -     | true   | 모드상태 (true: 자동, false: 수동)                     |
|              | power          | boolean        | -      | -      | -     | true   | 전원상태 (true: 켜짐, false: 꺼짐)                     |
|              | connection     | boolean        | -      | -      | -     | true   | 연결상태 (true: 정상, false: 이상)                     |
|              | start_time_1   | string         | 00:00  | 23:59  | -     | 08:00  | 시작시간1 (HH:mm 형식)                                 |
|              | end_time_1     | string         | 00:00  | 23:59  | -     | 22:00  | 종료시간1 (HH:mm 형식)                                 |
| sensor       | connection     | boolean        | -      | -      | -     | true   | 통신상태 (true: 정상, false: 이상)                     |
|              | pm10           | int            | -      | -      | ㎍/㎥ | 100    | 초초미세먼지수치                                       |
|              | pm25           | int            | -      | -      | ㎍/㎥ | 100    | 초미세먼지수치                                         |
|              | pm100          | int            | -      | -      | ㎍/㎥ | 100    | 미세먼지수치                                           |
|              | co2            | int            | -      | -      | ppm   | 400    | 이산화탄소농도                                         |
|              | voc            | int            | -      | -      | ppb   | 500    | 유기화합물농도                                         |
|              | hum            | float          | -      | -      | %     | 30.5   | 습도                                                   |
|              | temp           | float          | -      | -      | °C    | 20.5   | 온도                                                   |
| externalsw   | auto           | boolean        | -      | -      | -     | true   | 모드상태 (true: 자동, false: 수동)                     |
|              | start_time_1   | string         | 00:00  | 23:59  | -     | 08:00  | 시작시간1 (HH:mm 형식)                                 |
|              | end_time_1     | string         | 00:00  | 23:59  | -     | 22:00  | 종료시간1 (HH:mm 형식)                                 |

- 상세 커맨드 내용은 함께 첨부되는 엑셀파일을 참고해주시기 바랍니다

### 3.6 스마트그린쉼터 장비, 유닛 코드일람

| 장비<br>코드 | 장비<br>명       | 장비<br>타입 | 유니트<br>코드 | 유니트<br>명      |
| ------------ | ---------------- | ------------ | -------------- | ----------------- |
| d011         | 조명             | lighting     | u001           | 내부전등1         |
|              |                  |              | u002           | 내부전등2         |
| d021         | 냉난방기         | cooler       | u001           | 냉난방기          |
| d022         | 전열교환기       | exchanger    | u001           | 전열교환기        |
| d023         | 에어커튼         | aircurtain   | u001           | 에어커튼1         |
|              |                  |              | u002           | 에어커튼2         |
| d041         | 온열벤치         | bench        | u001           | 내부벤치1         |
|              |                  |              | u002           | 내부벤치2         |
| d051         | 자동문           | door         | u001           | 자동문1           |
|              |                  |              | u002           | 자동문2           |
| d061         | 통합센서         | sensor       | u001           | 통합센서          |
| d081         | 자동문외부스위치 | externalsw   | u001           | 자동문외부스위치1 |
|              |                  |              | u002           | 자동문외부스위치2 |

- c0101예시 – 다른 클라이언트 구성은 함께 첨부되는 엑셀파일을 참고해주시기 바랍니다

### 3.7 스마트그린쉼터 유닛 에러코드

| 에러코드 | 설명     |
| -------- | -------- |
| e001     | 통신오류 |

## 4. API명세

### 4.1 클라이언트 정보조회

- 메서드: GET
- 엔드포인트: /client
- 설명: 클라이언트의 기본 정보 및 포함된 장비와 유닛의 정보를 반환합니다. 데이터 수집값은 포함되지 않으며, 메타 정보만 제공합니다.

**응답필드:**

| 필드      | 설명             | 타입   | 예시                   |
| --------- | ---------------- | ------ | ---------------------- |
| id        | 클라이언트 ID    | string | "c0101"                |
| type      | 클라이언트 타입  | string | "sm-shelter"           |
| region    | 운용 지자체 코드 | string | "by"                   |
| name      | 클라이언트 이름  | string | "세도면사무소"         |
| location  | 주소             | string | "세도면 청송리 426-1"  |
| latitude  | 위도             | number | 36.170399              |
| longitude | 경도             | number | 126.946108             |
| updatedAt | 갱신 시각        | string | "2025-06-29T10:10:00Z" |
| devices   | 장비 목록        | array  | [devices 객체 참조]    |

**[devices 객체]**

| 필드  | 설명      | 타입   | 예시              |
| ----- | --------- | ------ | ----------------- |
| id    | 장비ID    | string | "d021"            |
| name  | 장비명    | string | "조명"            |
| type  | 장비타입  | string | "lighting"        |
| units | 유닛 목록 | array  | [units 객체 참조] |

**[units 객체]**

| 필드 | 설명      | 타입   | 예시        |
| ---- | --------- | ------ | ----------- |
| id   | 유닛 ID   | string | "u001"      |
| name | 유닛 이름 | string | "내부전등1" |

**예시응답:**

```json
{
  "id": "c0101",
  "type": "sm-shelter",
  "region": "by",
  "name": "세도면사무소",
  "location": "세도면 청송리 426-1",
  "latitude": 36.170399,
  "longitude": 126.946108,
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
```

### 4.2 클라이언트 상태조회

- 메서드: GET
- 엔드포인트: /status
- 설명: 클라이언트 전체 상태 및 장비별 상태를 제공합니다. 정기 모니터링 용도에 적합합니다.

**응답필드:**

| 필드    | 설명           | 타입   | 예시                |
| ------- | -------------- | ------ | ------------------- |
| id      | 클라이언트 ID  | string | "c0101"             |
| devices | 장비 상태 목록 | array  | [devices 객체 참조] |

**[devices 객체]**

| 필드   | 설명          | 타입   | 예시                                          |
| ------ | ------------- | ------ | --------------------------------------------- |
| id     | 장비 ID       | string | "d021"                                        |
| status | 장비 상태     | number | 1 (0 : 전체정상, 1 : 일부정상, 2: 전체비정상) |
| units  | 유닛 상태목록 | array  | [units 객체 참조]                             |

**[units 객체]**

| 필드   | 설명      | 타입   | 예시                                             |
| ------ | --------- | ------ | ------------------------------------------------ |
| id     | 유닛 ID   | string | "u001"                                           |
| status | 유닛 상태 | number | 0 (0 : 정상, 2: 비정상) - 1은 사용하지 않습니다. |

**예시응답:**

```json
{
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
```

### 4.3 클라이언트 데이터조회

- 메서드: GET
- 엔드포인트: /data
- 설명: 클라이언트의 장비별 데이터를 제공합니다. 정기 모니터링 용도에 적합합니다.

**응답필드:**

| 필드    | 설명             | 타입   | 예시                |
| ------- | ---------------- | ------ | ------------------- |
| id      | 클라이언트 ID    | string | "c0101"             |
| devices | 장비 데이터 목록 | array  | [devices 객체 참조] |

**[devices 객체]**

| 필드  | 설명      | 타입   | 예시              |
| ----- | --------- | ------ | ----------------- |
| id    | 장비 ID   | string | "d021"            |
| type  | 장비 타입 | string | "lighting"        |
| units | 유닛 목록 | array  | [units 객체 참조] |

**[units 객체]**

| 필드 | 설명        | 타입   | 예시 (data 필드 기준)                  |
| ---- | ----------- | ------ | -------------------------------------- |
| id   | 유닛 ID     | string | "u001"                                 |
| data | 데이터 객체 | object | {"power": true, "start_time": "08:00"} |

**예시응답:**

```json
{
  "id": "c0101",
  "devices": [
    {
      "id": "d021",
      "type": "lighting",
      "units": [
        {
          "id": "u001",
          "data": {
            "power": true,
            "connection": true,
            "start_time": "08:00",
            "end_time": "22:00"
          }
        },
        {
          "id": "u002",
          "data": {
            "power": false,
            "connection": true,
            "start_time": "08:00",
            "end_time": "22:00"
          }
        }
      ]
    }
  ]
}
```

### 4.4 클라이언트 에러조회

- 메서드: GET
- 엔드포인트: /errors
- 설명: 클라이언트 전체 상태 및 장비별 상태를 요약하여 제공합니다. 정기 모니터링 용도에 적합합니다.

**응답필드:**

| 필드    | 설명          | 타입   | 예시                |
| ------- | ------------- | ------ | ------------------- |
| id      | 클라이언트 ID | string | "c0101"             |
| devices | 에러 목록     | array  | [devices 객체 참조] |

**[devices 객체]**

| 필드  | 설명           | 타입   | 예시              |
| ----- | -------------- | ------ | ----------------- |
| id    | 장비 ID        | string | "d021"            |
| units | 유닛 에러 목록 | array  | [units 객체 참조] |

**[units 객체]**

| 필드      | 설명      | 타입   | 예시                   |
| --------- | --------- | ------ | ---------------------- |
| id        | 유닛 ID   | string | "u001"                 |
| errorId   | 에러 코드 | string | "e001"                 |
| errorDesc | 에러 설명 | string | "통신에러"             |
| errorAt   | 발생 시각 | string | "2025-06-29T10:09:55Z" |

**예시응답:**

```json
{
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
```

### 4.5 특정유닛 대량제어

- 메서드: POST
- 엔드포인트: /devices/{deviceId}/units/{unitId}/commands
- 설명: 동일 유닛에 대해 여러 개의 명령을 한 번에 전송합니다. 각 명령은 클라이언트에서 순차적으로 처리됩니다.

**요청조건:**

| 항목         | 조건                                                                 |
| ------------ | -------------------------------------------------------------------- |
| 최대 명령 수 | 10개 이내 (commands.length <= 10)                                    |
| 유닛 제한    | 요청 URL에 포함된 unitId만 대상                                      |
| 타임아웃     | 각명령은 1초timeout을가진다. 최대10초필요 ( 클라이언트 동기 큐처리 ) |

**요청필드:**

| 필드   | 설명               | 타입    | 예시               |
| ------ | ------------------ | ------- | ------------------ |
| []     | 단일 명령 오브젝트 | object  | { action, value }  |
| action | 실행 명령          | string  | "SET_START_TIME_1" |
| value  | 설정 값            | variant | "08:00"            |

- 상세 action, value 정보는 함께 첨부되는 엑셀파일을 참고해주시기 바랍니다

**예시요청:**

```json
[
  { "action": "SET_START_TIME_1", "value": "08:00" },
  { "action": "SET_END_TIME_1", "value": "20:00" }
]
```

**응답필드:**

| 필드      | 설명                        | 타입   | 예시                       |
| --------- | --------------------------- | ------ | -------------------------- |
| []        | 단일 명령 오브젝트          | object | { action, requestId }      |
| action    | 실행 명령                   | string | "SET_START_TIME_1"         |
| requestId | 명령별로 생성된 고유요청 ID | string | "66fe12ab1c23f123a4ed0001" |

- 상세 action, value 정보는 함께 첨부되는 엑셀파일을 참고해주시기 바랍니다

**응답예시:**

```json
[
  {
    "action": "SET_START_TIME_1",
    "requestId": "66fe12ab1c23f123a4ed0001"
  },
  {
    "action": "SET_END_TIME_1",
    "requestId": "66fe12ab1c23f123a4ed0002"
  }
]
```

### 4.6 특정유닛 대량제어 상태조회

- 메서드: GET
- 엔드포인트: /devices/{deviceId}/units/{unitId}/commands
- 설명: 지정된 유닛(unit)에 대해 전송된 대량 제어 명령들의 처리 상태를 조회합니다.

**요청파라메터:**

| 필드 | 설명                   | 타입   | 필수 | 예시                           | 비고                                                           |
| ---- | ---------------------- | ------ | ---- | ------------------------------ | -------------------------------------------------------------- |
| ids  | 조회<br>요청ID<br>목록 | string | O    | ids=66fe12ab1c23f123a4ed0001,… | 각 ID쉼표 구분<br>MongoDB ObjectId<br>최대 10개<br>나머지 무시 |

**예시요청:**

```
/devices/d021/units/u001/commands?ids=66fe12ab1c23f123a4ed0001,66fe12ab1c23f123a4ed0002
```

- 상세 action, value 정보는 함께 첨부되는 엑셀파일을 참고해주시기 바랍니다

**응답필드:**

| 필드       | 설명           | 타입   | 예시                           | 비고               |
| ---------- | -------------- | ------ | ------------------------------ | ------------------ |
| requestId  | 요청 고유 ID   | string | "66fe12ab1c23f123a4ed0001"     | MongoDB ObjectId   |
| action     | 실행 명령 이름 | string | "SET_START_TIME_1"             | 커맨드 일람 참조   |
| status     | 처리 상태      | string | "waiting" / "success" / "fail" | 처리 진행 상태     |
| finishedAt | 처리 완료 시각 | string | "2025-07-02T10:15:04Z"         | 완료된 경우만 포함 |

**예시응답:**

```json
{
  "success": true,
  "message": "명령 상태 조회 성공",
  "data": [
    {
      "requestId": "66fe12ab1c23f123a4ed0001",
      "action": "SET_START_TIME_1",
      "status": "success",
      "finishedAt": "2025-07-02T10:15:02Z"
    },
    {
      "requestId": "66fe12ab1c23f123a4ed0002",
      "action": "SET_END_TIME_1",
      "status": "fail",
      "finishedAt": "2025-07-02T10:15:04Z"
    },
    {
      "requestId": "66fe12ab1c23f123a4ed0003",
      "action": "SET_POWER",
      "status": "waiting"
    }
  ]
}
```

### 4.7 절기 설정 조회

- 메서드: GET
- 엔드포인트: /system/seasonal
- 설명: 현재 저장된 월별 절기 설정(하절기/동절기)을 조회합니다. 각 월별로 하절기(1) 또는 동절기(0) 설정값을 반환합니다. 이 절기 정보는 냉난방기 절기별 타겟온도(SET_SUMMER_CONT_TEMP, SET_WINTER_CONT_TEMP)와 온열벤치 절기별 운영의 기준이 됩니다.

**응답필드:**

| 필드      | 설명           | 타입   | 예시 | 비고                 |
| --------- | -------------- | ------ | ---- | -------------------- |
| seasonal  | 절기 설정 객체 | object | -    | -                    |
| season    | 현재 계절      | number | 0    | 0: 동절기, 1: 하절기 |
| january   | 1월 절기 설정  | number | 0    | 0: 동절기, 1: 하절기 |
| february  | 2월 절기 설정  | number | 0    | 0: 동절기, 1: 하절기 |
| march     | 3월 절기 설정  | number | 0    | 0: 동절기, 1: 하절기 |
| april     | 4월 절기 설정  | number | 0    | 0: 동절기, 1: 하절기 |
| may       | 5월 절기 설정  | number | 0    | 0: 동절기, 1: 하절기 |
| june      | 6월 절기 설정  | number | 1    | 0: 동절기, 1: 하절기 |
| july      | 7월 절기 설정  | number | 1    | 0: 동절기, 1: 하절기 |
| august    | 8월 절기 설정  | number | 1    | 0: 동절기, 1: 하절기 |
| september | 9월 절기 설정  | number | 0    | 0: 동절기, 1: 하절기 |
| october   | 10월 절기 설정 | number | 0    | 0: 동절기, 1: 하절기 |
| november  | 11월 절기 설정 | number | 0    | 0: 동절기, 1: 하절기 |
| december  | 12월 절기 설정 | number | 0    | 0: 동절기, 1: 하절기 |

**설명:**

- 각 월별 설정값: `0` = 겨울(동절기), `1` = 여름(하절기)
- `season`: 현재 절기 설정 (0: 겨울, 1: 여름)

**예시응답:**

```json
{
  "success": true,
  "message": "절기 설정 조회 성공",
  "data": {
    "seasonal": {
      "season": 0,
      "january": 0,
      "february": 0,
      "march": 0,
      "april": 0,
      "may": 0,
      "june": 1,
      "july": 1,
      "august": 1,
      "september": 0,
      "october": 0,
      "november": 0,
      "december": 0
    }
  }
}
```

### 4.8 절기 설정 저장

- 메서드: POST
- 엔드포인트: /system/seasonal
- 설명: 월별 절기 설정(하절기/동절기)을 저장합니다. 저장된 설정은 DDC(제어기)에 반영됩니다. 이 절기 정보는 냉난방기 절기별 타겟온도(SET_SUMMER_CONT_TEMP, SET_WINTER_CONT_TEMP)와 온열벤치 절기별 운영의 기준이 됩니다.

**요청필드:**

| 필드      | 설명           | 타입   | 필수 | 예시 | 비고                 |
| --------- | -------------- | ------ | ---- | ---- | -------------------- |
| seasonal  | 절기 설정 객체 | object | O    | -    | -                    |
| season    | 현재 계절      | number | O    | 0    | 0: 동절기, 1: 하절기 |
| january   | 1월 절기 설정  | number | O    | 0    | 0: 동절기, 1: 하절기 |
| february  | 2월 절기 설정  | number | O    | 0    | 0: 동절기, 1: 하절기 |
| march     | 3월 절기 설정  | number | O    | 0    | 0: 동절기, 1: 하절기 |
| april     | 4월 절기 설정  | number | O    | 0    | 0: 동절기, 1: 하절기 |
| may       | 5월 절기 설정  | number | O    | 0    | 0: 동절기, 1: 하절기 |
| june      | 6월 절기 설정  | number | O    | 1    | 0: 동절기, 1: 하절기 |
| july      | 7월 절기 설정  | number | O    | 1    | 0: 동절기, 1: 하절기 |
| august    | 8월 절기 설정  | number | O    | 1    | 0: 동절기, 1: 하절기 |
| september | 9월 절기 설정  | number | O    | 0    | 0: 동절기, 1: 하절기 |
| october   | 10월 절기 설정 | number | O    | 0    | 0: 동절기, 1: 하절기 |
| november  | 11월 절기 설정 | number | O    | 0    | 0: 동절기, 1: 하절기 |
| december  | 12월 절기 설정 | number | O    | 0    | 0: 동절기, 1: 하절기 |

**설명:**

- 각 월별 설정값: `0` = 겨울(동절기), `1` = 여름(하절기)
- `season`: 현재 절기 설정 (0: 겨울, 1: 여름)
- 모든 필드는 필수입니다.

**예시요청:**

```json
{
  "seasonal": {
    "season": 0,
    "january": 0,
    "february": 0,
    "march": 0,
    "april": 0,
    "may": 0,
    "june": 1,
    "july": 1,
    "august": 1,
    "september": 0,
    "october": 0,
    "november": 0,
    "december": 0
  }
}
```

**응답필드:**

| 필드      | 설명             | 타입   | 예시 | 비고                  |
| --------- | ---------------- | ------ | ---- | --------------------- |
| seasonal  | 저장된 절기 설정 | object | -    | 저장된 절기 설정 객체 |
| season    | 현재 계절        | number | 0    | 0: 겨울, 1: 여름      |
| january   | 1월 계절 설정    | number | 0    | 0: 겨울, 1: 여름      |
| february  | 2월 계절 설정    | number | 0    | 0: 겨울, 1: 여름      |
| march     | 3월 계절 설정    | number | 0    | 0: 겨울, 1: 여름      |
| april     | 4월 계절 설정    | number | 0    | 0: 겨울, 1: 여름      |
| may       | 5월 계절 설정    | number | 0    | 0: 겨울, 1: 여름      |
| june      | 6월 계절 설정    | number | 1    | 0: 겨울, 1: 여름      |
| july      | 7월 계절 설정    | number | 1    | 0: 겨울, 1: 여름      |
| august    | 8월 계절 설정    | number | 1    | 0: 겨울, 1: 여름      |
| september | 9월 계절 설정    | number | 0    | 0: 겨울, 1: 여름      |
| october   | 10월 계절 설정   | number | 0    | 0: 겨울, 1: 여름      |
| november  | 11월 계절 설정   | number | 0    | 0: 겨울, 1: 여름      |
| december  | 12월 계절 설정   | number | 0    | 0: 겨울, 1: 여름      |

**예시응답:**

```json
{
  "success": true,
  "message": "절기 설정이 성공적으로 저장되었습니다.",
  "data": {
    "seasonal": {
      "season": 0,
      "january": 0,
      "february": 0,
      "march": 0,
      "april": 0,
      "may": 0,
      "june": 1,
      "july": 1,
      "august": 1,
      "september": 0,
      "october": 0,
      "november": 0,
      "december": 0
    }
  }
}
```

## 5. 오류 코드

| 코드 | 설명                      | 예시 상황                                    |
| ---- | ------------------------- | -------------------------------------------- |
| 200  | 요청 성공                 | 정상적으로 데이터 반환                       |
| 400  | 요청 파라미터 오류        | 필수 파라미터 누락 또는 잘못된 형식          |
| 401  | 인증 실패                 | 유효하지 않은 API Key                        |
| 403  | 권한 부족                 | 해당 클라이언트/장비/유닛에 접근 권한 없음   |
| 404  | 존재하지 않는 데이터 요청 | 잘못된 clientId, deviceId, 또는 unitId       |
| 405  | 메서드 허용되지 않음      | POST 대신 GET으로 호출                       |
| 422  | 처리 불가능한 요청        | 유효하지 않은 JSON 본문 (예: action 값 오류) |
| 429  | 요청 제한 초과            | 단시간 내 너무 많은 요청                     |
| 500  | 서버 내부 오류            | 서버에서 예기치 않은 오류 발생               |
| 503  | 서비스 일시적 사용 불가   | 서버 유지보수 또는 과부하                    |

## 6. 테스트 토큰

- 운영용 API Key: 로컬 연계테스트 이후 발급
- 문의처: mythoyu@gmail.com
- 담당자: 유병훈 수석연구원

## 7. 문의처

- 운영 및 기술 문의: mythoyu@gmail.com
- 담당자: 유병훈 수석연구원
