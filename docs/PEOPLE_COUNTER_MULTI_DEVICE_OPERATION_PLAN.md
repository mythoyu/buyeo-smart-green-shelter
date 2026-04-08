# 피플카운터 0~3대 운영/설계 표준안 (d082 고정 + 유닛 확장)

> 목적: **외부 시스템은 `d082`만** 알도록 유지하면서, 현장(USB 시리얼)에서는 피플카운터가 **0대/1대/2대/3대**인 제품을 동일 버전으로 설치·운영한다.

## 1. 핵심 정책(결론)

- **식별자 정책**
  - **외부 노출 deviceId**: `d082` 고정
  - **내부 유닛(unitId)**: 피플카운터 1~3대를 `u001`, `u002`, `u003`으로 구분
  - **통신 프레임 ID(예: `0000`)**: 포트가 장비별로 분리(1:1)인 운영 조건에서는 **고정 `0000`을 유지**한다.

- **데이터/모니터링 정책(내부 운영)**
  - `data`, `errors`, `status`는 **유닛별(u001~u003)로 분리**되어야 한다.
  - 피플카운터 2~3대 운영 시에도, 특정 유닛의 통신 오류가 다른 유닛에 영향을 주지 않도록 **포트/큐/폴링을 유닛 단위로 분리**한다.

- **외부 제공 정책(연동)**
  - 외부로 “피플카운터 데이터”를 제공할 때는 **`people_counter_raw` 기반**으로 기간별 **10분 버킷(inCount)** 을 제공한다.
  - **unitId 미지정 시 기본값은 전체 유닛 합산**이다.

---

## 2. 데이터 모델 규칙

### 2.1 `Data` 컬렉션(실시간 카드/대시보드용)

- `deviceId = 'd082'` 문서 1개에 `units` 배열로 `u001~u003` 유닛이 공존한다.
- **금지(필수 수정 포인트)**: 유닛 폴러가 `units: [unitData]`로 전체를 덮어써서 다른 유닛 데이터를 날리는 방식.
- **필수**: `units`는 “유닛별 병합(upsert)”로 업데이트되어야 한다.

### 2.2 `people_counter_raw` 컬렉션(집계/외부 제공의 소스)

- `deviceId = 'd082'` 고정
- `unitId = 'u001'|'u002'|'u003'`로 장비(포트)별 데이터를 분리 저장
- `timestamp`는 1분 단위(KST 분 시작)로 저장(기존 정책 유지)
- `inDelta`는 문서가 나타내는 분(minute) 동안의 입실 증가량(유닛별 독립)

---

## 3. 외부 제공 스펙(10분 사용량)

### 3.1 엔드포인트(현 코드 기준)

- `GET /people-counter/usage-10min`
  - `start`, `end` 쿼리로 구간 \([start, end)\) 지정
  - KST 벽시계 문자열 또는 ISO(Z/오프셋 포함) 파싱 정책은 기존과 동일

> 주의: 현재 구현은 `people_counter_raw`를 조회 후 10분 버킷으로 `inDelta`를 합산한다.
> 다유닛 운영을 위해서는 **deviceId/unitId 필터를 명시**해 “의도된 합산”임을 보장한다.

### 3.2 쿼리 파라미터

- **필수**
  - `start`: 구간 시작(포함)
  - `end`: 구간 끝(미포함)
- **옵션**
  - `unitId`: `u001|u002|u003`
    - 미지정 시: **전체 유닛 합산(기본)**
    - 지정 시: 해당 유닛만 합산(디버깅/내부 점검 목적)

### 3.3 버킷 합산 규칙(필드별)

- `bucketSizeMinutes = 10`
- 각 버킷의 `inCount`는 다음과 같다.

\[
inCount(bucket) = \sum_{\substack{doc \in people\_counter\_raw \\\\ doc.deviceId='d082' \\\\ doc.timestamp \in bucket \\\\ doc.unitId \in U}} doc.inDelta
\]

- 여기서 \(U\)는:
  - `unitId` 쿼리가 없으면 `{u001,u002,u003}` (전체 유닛)
  - `unitId` 쿼리가 있으면 `{해당 unitId}`

---

## 4. 설치/운영(현장) 정책: 0/1/2/3대 대응

### 4.1 기본 원칙

- **대화형 설치**: 설치 마법사에서 피플카운터 개수(0~3)를 선택한다.
- **반복 연결 방식**: PeopleCounter 케이블은 **한 번에 1개만** 연결하여 프로브/룰을 만든다.
  - “PC#1만 연결 → 프로브 완료 → 뽑기 → PC#2만 연결 → …”
- **0대 정책**: 피플카운터가 0대이면:
  - `/dev/bushub-people-counter-*` 링크를 **만들지 않는다**
  - PeopleCounter udev fragment도 **생성하지 않는다**

### 4.2 udev 심볼릭 링크 표준

- DDC(Modbus): `/dev/bushub-controller` (1개)
- PeopleCounter(APC100): 개수만큼 생성
  - `/dev/bushub-people-counter-1`
  - `/dev/bushub-people-counter-2`
  - `/dev/bushub-people-counter-3`

### 4.3 compose 운영 방식(옵션 A 확정: compose 분리)

- **0대**: `docker-compose.usb485.yml`만 사용
- **1~3대**: `docker-compose.usb485.yml` + `docker-compose.usb485.people-counter.yml`를 함께 사용

> 이유: 0대 환경에서 “존재하지 않는 디바이스 마운트로 인해 compose 기동 실패”를 구조적으로 줄이기 위함.

---

## 5. 구현 체크리스트(필수 변경 지점)

### 5.1 백엔드(데이터 저장/집계)

- **[필수] `Data`의 `units` 업데이트를 유닛 병합(upsert)로 변경**
  - 유닛별 폴러가 동시에 돌아도 서로의 데이터를 덮어쓰지 않아야 함
- **[필수] 외부 10분 API에서 `PeopleCounterRaw` 조회 조건에 `deviceId='d082'`를 명시**
  - (옵션) `unitId` 쿼리 지원(미지정=합산)
- **[필수] reset-data 정책 재정의**
  - 기본은 `{unitId}` 단위 초기화
  - 전체 삭제는 별도 관리자 엔드포인트(또는 강한 확인)로 분리 권장

### 5.2 설치 스크립트/udev

- `scripts/lib/udev/00-wizard-bushub-usb-serial.sh`
  - 피플카운터 개수(0~3) 선택 UI 추가
  - PeopleCounter 프로브 단계 반복 실행(1개씩 연결 방식)
- `scripts/lib/udev/02-probe-pc-bushub-usb-serial.sh`
  - `--index 1|2|3` 지원
  - 심볼릭 이름을 `bushub-people-counter-$index`로 생성
  - fragment 파일도 인덱스별로 분리
- `scripts/lib/udev/03-install-bushub-usb-serial.sh`
  - `PEOPLE_COUNTER_COUNT=0..3`를 입력으로 받아,
    - 0이면 PeopleCounter fragment 요구/삽입을 스킵
    - 1~3이면 people-counter-1..N fragment를 rules에 포함
- `scripts/lib/udev/04-verify-bushub-usb-serial.sh`
  - count에 따라 `/dev/bushub-people-counter-1..N`을 검사

### 5.3 compose/기동 스크립트

- `docker-compose.usb485.people-counter.yml` (신규)
  - people-counter-1..3 볼륨 마운트 및 환경변수 전달
- compose up 실행부(예: `start-docker-compose-usb485.sh`)
  - count=0이면 기본 compose만 사용
  - count>=1이면 `-f docker-compose.usb485.yml -f docker-compose.usb485.people-counter.yml`로 기동

---

## 6. 완료 조건(현장 기준)

- 0대: udev `/dev/bushub-controller`만 생성되고, 서비스 기동이 정상이며 피플카운터 기능은 기본 비활성(또는 UI에서 OFF)이다.
- 1대: `/dev/bushub-people-counter-1` 생성 및 폴링/Raw 저장/외부 10분 API 정상.
- 2~3대: `-1..-N` 생성, 내부 `data/errors/status`가 유닛별로 분리되고, 외부 10분 `inCount`는 유닛 전체 합산으로 반환된다.

