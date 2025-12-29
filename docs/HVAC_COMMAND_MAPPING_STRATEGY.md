# 냉난방기 외부제어 명령 매핑 전략

## 📋 개요

cooler의 SET/GET 명령 이름을 삼성/LG에도 동일하게 사용하고, 지원하지 않는 항목에 대한 처리 방안을 정리합니다.

---

## 🔄 명령 이름 통일 전략

### 기본 원칙

1. **명령 이름 통일**: cooler의 SET/GET 명령 이름을 삼성/LG에도 동일하게 사용
2. **지원하지 않는 명령 처리**: `NOT_SUPPORTED` 표기 및 명확한 에러 메시지
3. **매핑 우선순위**: 프로토콜 문서 기반 매핑

---

## 📊 명령 매핑 표

### 현재 cooler 명령 목록

| 명령 이름                                       | 설명          | DDC 지원 | 삼성 지원 | LG 지원 | 비고                             |
| ----------------------------------------------- | ------------- | -------- | --------- | ------- | -------------------------------- |
| `SET_AUTO` / `GET_AUTO`                         | 자동 모드     | ✅       | ⚠️        | ❌      | 삼성: 모드=0(자동)으로 대체 가능 |
| `SET_POWER` / `GET_POWER`                       | 전원 ON/OFF   | ✅       | ✅        | ✅      |                                  |
| `SET_MODE` / `GET_MODE`                         | 운전 모드     | ✅       | ✅        | ✅      |                                  |
| `SET_SPEED` / `GET_SPEED`                       | 팬 속도       | ✅       | ✅        | ✅      |                                  |
| `SET_SUMMER_CONT_TEMP` / `GET_SUMMER_CONT_TEMP` | 여름 타겟온도 | ✅       | ✅        | ❌      | LG: 단일 설정온도만 지원         |
| `SET_WINTER_CONT_TEMP` / `GET_WINTER_CONT_TEMP` | 겨울 타겟온도 | ✅       | ✅        | ❌      | LG: 단일 설정온도만 지원         |
| `GET_CUR_TEMP`                                  | 현재 온도     | ✅       | ✅        | ✅      |                                  |
| `SET_START_TIME_1` / `GET_START_TIME_1`         | 시작 시간     | ✅       | ❌        | ❌      | TIME_INTEGRATED                  |
| `SET_END_TIME_1` / `GET_END_TIME_1`             | 종료 시간     | ✅       | ❌        | ❌      | TIME_INTEGRATED                  |
| `GET_ALARM`                                     | 에러 코드     | ✅       | ✅        | ✅      |                                  |

---

## 🔍 프로토콜별 상세 매핑

### 1. 삼성 프로토콜 매핑

#### 지원되는 명령

| cooler 명령                                     | 삼성 레지스터 | Function Code | 주소 (hex)  | 설명                                               |
| ----------------------------------------------- | ------------- | ------------- | ----------- | -------------------------------------------------- |
| `SET_POWER` / `GET_POWER`                       | 40053         | 0x06 / 0x03   | 0x0034 (52) | 에어컨 운전 ON/OFF                                 |
| `SET_MODE` / `GET_MODE`                         | 40054         | 0x06 / 0x03   | 0x0035 (53) | 운전 모드 (0:자동, 1:냉방, 2:제습, 3:송풍, 4:난방) |
| `SET_SPEED` / `GET_SPEED`                       | 40055         | 0x06 / 0x03   | 0x0036 (54) | 팬 풍량 (0:자동, 1:미용, 2:약풍, 3:강풍)           |
| `SET_SUMMER_CONT_TEMP` / `GET_SUMMER_CONT_TEMP` | 40062         | 0x06 / 0x03   | 0x003D (61) | 냉방 토출 설정온도 (8~18℃, ×10)                    |
| `SET_WINTER_CONT_TEMP` / `GET_WINTER_CONT_TEMP` | 40063         | 0x06 / 0x03   | 0x003E (62) | 난방 토출 설정온도 (30~43℃, ×10)                   |
| `GET_CUR_TEMP`                                  | 30060         | 0x04          | 0x003B (59) | 실내 온도 (×10)                                    |
| `GET_ALARM`                                     | 30064         | 0x04          | 0x003F (63) | 실내기 통합 에러 코드                              |

#### 지원하지 않는 명령

| cooler 명령                             | 처리 방법       | 비고                                                 |
| --------------------------------------- | --------------- | ---------------------------------------------------- |
| `SET_AUTO` / `GET_AUTO`                 | `NOT_SUPPORTED` | 모드=0(자동)으로 대체 가능하지만 별도 AUTO 기능 없음 |
| `SET_START_TIME_1` / `GET_START_TIME_1` | `NOT_SUPPORTED` | 스케줄 기능 없음                                     |
| `SET_END_TIME_1` / `GET_END_TIME_1`     | `NOT_SUPPORTED` | 스케줄 기능 없음                                     |

#### 특수 처리: SET_AUTO

삼성 프로토콜에는 AUTO 기능이 없지만, `SET_MODE` 값 0 (자동)으로 대체 가능:

- `SET_AUTO true` → `SET_MODE 0` (자동 모드)
- `SET_AUTO false` → 기존 모드 유지 또는 기본 모드로 설정

**권장**: `NOT_SUPPORTED`로 처리하되, UI에서 모드 선택 시 "자동" 옵션 제공

---

### 2. LG 프로토콜 매핑

#### 지원되는 명령

| cooler 명령               | LG 레지스터 | Function Code | 주소 계산식 | 설명                                               |
| ------------------------- | ----------- | ------------- | ----------- | -------------------------------------------------- |
| `SET_POWER` / `GET_POWER` | Coil 1      | 0x05 / 0x01   | N × 16 + 1  | 운전(On/Off)                                       |
| `SET_MODE` / `GET_MODE`   | 40001       | 0x06 / 0x03   | N × 20 + 1  | 운전 모드 (0:냉방, 1:제습, 2:송풍, 3:자동, 4:난방) |
| `SET_SPEED` / `GET_SPEED` | 40002       | 0x06 / 0x03   | N × 20 + 2  | 바람 세기 (1:약, 2:중, 3:강, 4:자동)               |
| `GET_CUR_TEMP`            | 30002       | 0x04          | N × 20 + 2  | 실내 온도 (-99.0~99.0℃, ×10)                       |
| `GET_ALARM`               | 30001       | 0x04          | N × 20 + 1  | Error 코드 (0-255)                                 |

#### 지원하지 않는 명령

| cooler 명령                                     | 처리 방법       | 비고                                                            |
| ----------------------------------------------- | --------------- | --------------------------------------------------------------- |
| `SET_AUTO` / `GET_AUTO`                         | `NOT_SUPPORTED` | LG에도 AUTO 기능 없음 (모드=3이 자동이지만 별도 AUTO 기능 없음) |
| `SET_SUMMER_CONT_TEMP` / `GET_SUMMER_CONT_TEMP` | `NOT_SUPPORTED` | 단일 설정온도만 지원                                            |
| `SET_WINTER_CONT_TEMP` / `GET_WINTER_CONT_TEMP` | `NOT_SUPPORTED` | 단일 설정온도만 지원                                            |
| `SET_START_TIME_1` / `GET_START_TIME_1`         | `NOT_SUPPORTED` | 스케줄 기능 없음                                                |
| `SET_END_TIME_1` / `GET_END_TIME_1`             | `NOT_SUPPORTED` | 스케줄 기능 없음                                                |

#### 특수 처리: 설정 온도

LG 프로토콜은 단일 설정온도만 지원 (Holding 40003):

- 여름/겨울 구분 없이 단일 온도로 설정
- `SET_SUMMER_CONT_TEMP`, `SET_WINTER_CONT_TEMP`는 `NOT_SUPPORTED`
- 새로운 명령 추가 고려: `SET_TEMP` / `GET_TEMP` (단일 설정온도)

**권장**:

1. `SET_SUMMER_CONT_TEMP` / `SET_WINTER_CONT_TEMP` → `NOT_SUPPORTED`
2. 또는 `SET_TEMP` / `GET_TEMP` 명령 추가 (cooler에도 추가)

---

## 🛠️ 구현 방안

### 1. 프로토콜 매핑 파일 구조

```
packages/bushub-client/backend/src/data/protocols/
├── samsung-hvac.ts       # 삼성 프로토콜 매핑
└── lg-hvac.ts            # LG 프로토콜 매핑
```

### 2. 명령 매핑 구조 예시

```typescript
// samsung-hvac.ts
export const samsungHvacProtocol = {
  u001: {
    SET_POWER: {
      functionCode: 0x06,
      address: 0x0034, // 40053
      description: "에어컨 운전 ON/OFF",
      // ...
    },
    GET_POWER: {
      functionCode: 0x03,
      address: 0x0034,
      description: "에어컨 운전 상태 읽기",
      // ...
    },
    SET_AUTO: "NOT_SUPPORTED", // 지원하지 않는 명령
    SET_START_TIME_1: "NOT_SUPPORTED",
    SET_END_TIME_1: "NOT_SUPPORTED",
    // ...
  },
};
```

### 3. NOT_SUPPORTED 처리 로직

```typescript
// getModbusCommandWithPortMapping 함수 수정
if (hardwarePort === "NOT_SUPPORTED") {
  throw new HttpValidationError(
    `Command '${commandKey}' is not supported for ${manufacturer} HVAC. ` +
      `This command is only available for DDC-controlled HVAC systems.`
  );
}
```

### 4. 특수 처리: SET_AUTO (삼성/LG)

**옵션 1: NOT_SUPPORTED로 처리 (권장)**

```typescript
SET_AUTO: 'NOT_SUPPORTED',
GET_AUTO: 'NOT_SUPPORTED',
```

**옵션 2: SET_MODE로 변환**

```typescript
SET_AUTO: {
  // SET_MODE 0으로 변환하는 특수 처리
  type: 'SPECIAL',
  transform: (value: boolean) => ({
    command: 'SET_MODE',
    value: value ? 0 : null, // true → 0(자동), false → 기존 모드 유지
  }),
},
```

**권장**: 옵션 1 (NOT_SUPPORTED) - 명확하고 안전

### 5. 특수 처리: 여름/겨울 타겟온도 (LG)

**옵션 1: NOT_SUPPORTED로 처리 (권장)**

```typescript
SET_SUMMER_CONT_TEMP: 'NOT_SUPPORTED',
GET_SUMMER_CONT_TEMP: 'NOT_SUPPORTED',
SET_WINTER_CONT_TEMP: 'NOT_SUPPORTED',
GET_WINTER_CONT_TEMP: 'NOT_SUPPORTED',
```

**옵션 2: SET_TEMP로 변환**

```typescript
SET_SUMMER_CONT_TEMP: {
  // SET_TEMP로 변환
  type: 'SPECIAL',
  transform: (value: number) => ({
    command: 'SET_TEMP',
    value: value,
  }),
},
SET_WINTER_CONT_TEMP: {
  // SET_TEMP로 변환
  type: 'SPECIAL',
  transform: (value: number) => ({
    command: 'SET_TEMP',
    value: value,
  }),
},
```

**권장**: 옵션 1 (NOT_SUPPORTED) + `SET_TEMP` / `GET_TEMP` 명령 추가

---

## 📝 명령 매핑 파일 예시

### 삼성 프로토콜 매핑 (samsung-hvac.ts)

```typescript
export const samsungHvacProtocol = {
  u001: {
    // ✅ 지원되는 명령
    SET_POWER: {
      functionCode: 0x06,
      address: 0x0034, // 40053
      description: "에어컨 운전 ON/OFF",
      type: "boolean",
    },
    GET_POWER: {
      functionCode: 0x03,
      address: 0x0034,
      description: "에어컨 운전 상태 읽기",
      type: "boolean",
    },
    SET_MODE: {
      functionCode: 0x06,
      address: 0x0035, // 40054
      description: "운전 모드 설정",
      type: "number", // 0:자동, 1:냉방, 2:제습, 3:송풍, 4:난방
    },
    GET_MODE: {
      functionCode: 0x03,
      address: 0x0035,
      description: "운전 모드 읽기",
      type: "number",
    },
    SET_SPEED: {
      functionCode: 0x06,
      address: 0x0036, // 40055
      description: "팬 풍량 설정",
      type: "number", // 0:자동, 1:미용, 2:약풍, 3:강풍
    },
    GET_SPEED: {
      functionCode: 0x03,
      address: 0x0036,
      description: "팬 풍량 읽기",
      type: "number",
    },
    SET_SUMMER_CONT_TEMP: {
      functionCode: 0x06,
      address: 0x003d, // 40062
      description: "냉방 토출 설정온도",
      type: "number", // 8~18℃ × 10
    },
    GET_SUMMER_CONT_TEMP: {
      functionCode: 0x03,
      address: 0x003d,
      description: "냉방 토출 설정온도 읽기",
      type: "number",
    },
    SET_WINTER_CONT_TEMP: {
      functionCode: 0x06,
      address: 0x003e, // 40063
      description: "난방 토출 설정온도",
      type: "number", // 30~43℃ × 10
    },
    GET_WINTER_CONT_TEMP: {
      functionCode: 0x03,
      address: 0x003e,
      description: "난방 토출 설정온도 읽기",
      type: "number",
    },
    GET_CUR_TEMP: {
      functionCode: 0x04,
      address: 0x003b, // 30060
      description: "실내 온도 읽기",
      type: "number", // × 10
    },
    GET_ALARM: {
      functionCode: 0x04,
      address: 0x003f, // 30064
      description: "실내기 통합 에러 코드 읽기",
      type: "number",
    },

    // ❌ 지원하지 않는 명령
    SET_AUTO: "NOT_SUPPORTED",
    GET_AUTO: "NOT_SUPPORTED",
    SET_START_TIME_1: "NOT_SUPPORTED",
    GET_START_TIME_1: "NOT_SUPPORTED",
    SET_END_TIME_1: "NOT_SUPPORTED",
    GET_END_TIME_1: "NOT_SUPPORTED",
  },
};
```

### LG 프로토콜 매핑 (lg-hvac.ts)

```typescript
export const lgHvacProtocol = {
  u001: {
    // ✅ 지원되는 명령
    SET_POWER: {
      functionCode: 0x05, // Write Single Coil
      address: 1, // N × 16 + 1 (N=0인 경우)
      description: "운전(On/Off)",
      type: "boolean",
    },
    GET_POWER: {
      functionCode: 0x01, // Read Coils
      address: 1,
      description: "운전 상태 읽기",
      type: "boolean",
    },
    SET_MODE: {
      functionCode: 0x06,
      address: 1, // N × 20 + 1 (N=0인 경우)
      description: "운전 모드 설정",
      type: "number", // 0:냉방, 1:제습, 2:송풍, 3:자동, 4:난방
    },
    GET_MODE: {
      functionCode: 0x03,
      address: 1,
      description: "운전 모드 읽기",
      type: "number",
    },
    SET_SPEED: {
      functionCode: 0x06,
      address: 2, // N × 20 + 2
      description: "바람 세기 설정",
      type: "number", // 1:약, 2:중, 3:강, 4:자동
    },
    GET_SPEED: {
      functionCode: 0x03,
      address: 2,
      description: "바람 세기 읽기",
      type: "number",
    },
    // ⚠️ LG는 단일 설정온도만 지원 (여름/겨울 구분 없음)
    SET_TEMP: {
      functionCode: 0x06,
      address: 3, // N × 20 + 3
      description: "설정 온도",
      type: "number", // 16.0~30.0℃ × 10
    },
    GET_TEMP: {
      functionCode: 0x03,
      address: 3,
      description: "설정 온도 읽기",
      type: "number",
    },
    GET_CUR_TEMP: {
      functionCode: 0x04,
      address: 2, // N × 20 + 2
      description: "실내 온도 읽기",
      type: "number", // -99.0~99.0℃ × 10
    },
    GET_ALARM: {
      functionCode: 0x04,
      address: 1, // N × 20 + 1
      description: "Error 코드 읽기",
      type: "number", // 0-255
    },

    // ❌ 지원하지 않는 명령
    SET_AUTO: "NOT_SUPPORTED",
    GET_AUTO: "NOT_SUPPORTED",
    SET_SUMMER_CONT_TEMP: "NOT_SUPPORTED",
    GET_SUMMER_CONT_TEMP: "NOT_SUPPORTED",
    SET_WINTER_CONT_TEMP: "NOT_SUPPORTED",
    GET_WINTER_CONT_TEMP: "NOT_SUPPORTED",
    SET_START_TIME_1: "NOT_SUPPORTED",
    GET_START_TIME_1: "NOT_SUPPORTED",
    SET_END_TIME_1: "NOT_SUPPORTED",
    GET_END_TIME_1: "NOT_SUPPORTED",
  },
};
```

---

## ⚠️ 고려사항

### 1. LG의 단일 설정온도 처리

**문제**: LG는 여름/겨울 타겟온도를 구분하지 않고 단일 설정온도만 지원

**해결 방안**:

- 옵션 1: `SET_SUMMER_CONT_TEMP`, `SET_WINTER_CONT_TEMP` → `NOT_SUPPORTED`
- 옵션 2: `SET_TEMP` / `GET_TEMP` 명령 추가 (cooler에도 추가 권장)

**권장**: 옵션 2 - cooler에도 `SET_TEMP` / `GET_TEMP` 추가하여 일관성 유지

### 2. 시작/종료 시간 처리

**문제**: 삼성/LG 모두 스케줄 기능 없음

**해결 방안**: `NOT_SUPPORTED`로 처리

### 3. AUTO 기능 처리

**문제**: 삼성/LG 모두 별도 AUTO 기능 없음 (모드 선택에서 자동 옵션 제공)

**해결 방안**: `NOT_SUPPORTED`로 처리 (UI에서 모드 선택 시 "자동" 옵션 제공)

### 4. 명령 이름 통일

**원칙**: cooler의 명령 이름을 삼성/LG에도 동일하게 사용

**장점**:

- API 일관성 유지
- 프론트엔드 코드 재사용 가능
- 사용자 혼란 최소화

---

## 🎯 구현 체크리스트

### Phase 2: 프로토콜 매핑 레이어

- [ ] `samsung-hvac.ts` 파일 생성 및 명령 매핑 정의
- [ ] `lg-hvac.ts` 파일 생성 및 명령 매핑 정의
- [ ] `NOT_SUPPORTED` 처리 로직 구현
- [ ] `getModbusCommandWithPortMapping` 함수 수정 (외부제어 분기 추가)
- [ ] 에러 메시지 명확화 (제조사별 지원 여부 표시)

### 추가 고려사항

- [ ] `SET_TEMP` / `GET_TEMP` 명령 추가 여부 결정 (LG용)
- [ ] cooler에도 `SET_TEMP` / `GET_TEMP` 추가 여부 결정
- [ ] UI에서 지원하지 않는 명령 비활성화 처리

---

**문서 버전**: 1.0
**최종 검토 일자**: 2025-01-XX
