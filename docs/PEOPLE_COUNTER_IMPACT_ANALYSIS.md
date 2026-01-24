# 피플카운터 Enable/Disable 추가 시 다른 코드 영향 분석

## 📋 개요

`runtime.peopleCounterEnabled` 추가 및 `getPeopleCounterState` / `updatePeopleCounterState` 도입 시, 기존 코드에 미치는 영향을 검토한 결과입니다.

---

## 1. 수정이 필요한 부분

### 1.1 MongoSystemRepository.updateSettings (핵심)

**파일**: `packages/bushub-client/backend/src/core/repositories/MongoSystemRepository.ts`

**현재**: `settingsData.runtime`이 있으면 **아래 3개만** `$set`으로 고정 저장합니다.

```ts
$set: {
  'runtime.pollingEnabled': ...,
  'runtime.pollingInterval': ...,
  'runtime.applyInProgress': ...,
  updatedAt: new Date(),
}
```

**영향**:
- `updatePeopleCounterState`는 `runtime.peopleCounterEnabled`만 바꿔서 `updateSettings`를 호출합니다.
- 지금 구조에서는 `peopleCounterEnabled`를 `$set`에 넣지 않으므로 **DB에 반영되지 않습니다.**

**필수 조치**:
- `peopleCounterEnabled`를 `$set`에 추가해야 합니다.
- `updatePollingState`는 `peopleCounterEnabled`를 넘기지 않으므로,  
  `settingsData.runtime.peopleCounterEnabled !== undefined` 일 때만  
  `'runtime.peopleCounterEnabled': settingsData.runtime.peopleCounterEnabled` 를 `$set`에 포함하도록 처리해야 합니다.
- 그렇게 하면 폴링 ON/OFF 할 때는 기존 `peopleCounterEnabled` 값이 유지됩니다.

---

### 1.2 SystemService.getPollingState (초기화 시)

**파일**: `packages/bushub-client/backend/src/core/services/SystemService.ts`

**현재**: `runtime`이 없을 때 `initializeIfMissing`으로 기본값을 넣을 때 다음만 사용합니다.

```ts
const defaultRuntime = {
  pollingEnabled: false,
  pollingInterval: 30000,
  applyInProgress: false,
};
```

**영향**:
- `peopleCounterEnabled`가 없어서, 초기화로 생성되는 `runtime`에 피플카운터 설정이 없습니다.

**필수 조치**:
- `defaultRuntime`에 `peopleCounterEnabled: false`를 추가합니다.
- `getPollingState` 반환 타입은 그대로 두고, `getPeopleCounterState`는 별도 메서드로 두면 됩니다.

---

### 1.3 SystemService.updatePollingInterval (fallback)

**파일**: `packages/bushub-client/backend/src/core/services/SystemService.ts`

**현재**: `currentRuntime` fallback이 다음과 같습니다.

```ts
const currentRuntime = currentSettings?.runtime || {
  pollingEnabled: false,
  pollingInterval: 1000,
  applyInProgress: false,
};
```

**영향**:
- `peopleCounterEnabled`가 없지만, `updatePollingInterval`은 `...currentRuntime`를 쓰므로 보통은 DB에서 읽은 `runtime`이 들어옵니다.
- `runtime`이 아예 없는 극단적인 경우에만 fallback이 쓰이는데, 이때 `peopleCounterEnabled`가 없습니다.

**권장 조치**:
- fallback 객체에 `peopleCounterEnabled: false`를 추가해 두면, 나중에 `updateSettings`로 넘어갈 때 일관됩니다.

---

## 2. 수정 불필요 (영향 없음)

### 2.1 SystemService.updatePollingState

- `cleanRuntime`에 `pollingEnabled`, `pollingInterval`, `applyInProgress`만 넣고, `peopleCounterEnabled`는 포함하지 않습니다.
- Mongo 쪽에서 `peopleCounterEnabled`를 `$set`에 **조건부로만** 넣기로 하면,  
  폴링 ON/OFF 시에는 `peopleCounterEnabled`를 건드리지 않으므로 **기존 동작 유지**됩니다.
- **코드 변경 없음.**

---

### 2.2 SystemService.setApplyLock

- `runtime: { ...currentSettings.runtime, applyInProgress }` 로 `updateSettings` 호출.
- `currentSettings.runtime`에 `peopleCounterEnabled`가 있으면 함께 전달됩니다.
- Mongo에서 `peopleCounterEnabled`를 `$set`에 조건부 추가할 때, **전달된 값이 있으면** 저장되므로 기존처럼 동작합니다.
- **코드 변경 없음.**

---

### 2.3 UnifiedModbusPollerService

- `runtime?.pollingInterval`, `runtime?.pollingEnabled`만 사용.
- `peopleCounterEnabled`는 사용하지 않으므로 **영향 없음.**

---

### 2.4 PollingAutoRecoveryService

- `getPollingState` / `updatePollingState`만 사용.
- **영향 없음.**

---

### 2.5 system/polling API

- `getPollingState` / `updatePollingState`만 사용.
- 응답은 `pollingEnabled`, `applyInProgress`만 반환.
- **영향 없음.**

---

### 2.6 system-monitoring API

- `getSettings()` 결과의 `runtime.pollingEnabled`, `runtime.pollingInterval`, `runtime.applyInProgress`만 사용.
- `runtime`에 `peopleCounterEnabled`가 추가되어도 사용하지 않으므로 **영향 없음.**

---

### 2.7 스냅샷 (snapshots)

- **저장**: `getSettings()`로 system 설정을 통째로 저장.  
  → `peopleCounterEnabled`가 있으면 스냅샷에도 포함됩니다.
- **적용**: `applySnapshotSettings(snapshot.data)` → `updateSettings(snapshotData)`.
  - 스냅샷에 `runtime.peopleCounterEnabled`가 있으면 Mongo `$set`에 포함되어 복원됩니다.
  - **과거 스냅샷**(`peopleCounterEnabled` 없음) 적용 시:
    - Mongo는 `peopleCounterEnabled`를 `$set`하지 않습니다.
    - DB에 이미 있던 `peopleCounterEnabled` 값은 **그대로 유지**됩니다.
- **영향**: 동작은 유지되고, 과거 스냅샷은 피플카운터 설정만 복원하지 않는 정도로 이해하면 됩니다.

---

### 2.8 client 초기화 (initializeSystemSettings)

- `getDefaultSettings()`를 spread 해서 `systemSettings`를 만들고 `updateSettings` 호출.
- `getDefaultSettings()`의 `runtime`에 `peopleCounterEnabled: false`만 추가하면,  
  새 클라이언트 초기화 시 피플카운터 비활성화가 기본으로 들어갑니다.
- **SystemSchema / getDefaultSettings 측 수정만 필요**, client 라우트 자체는 **수정 불필요.**

---

### 2.9 resetToDefault / MongoSystemRepository 새 문서 생성

- `getDefaultSettings()` 사용.
- `getDefaultSettings()`에 `peopleCounterEnabled: false` 추가하면,  
  리셋·신규 생성 시 모두 `peopleCounterEnabled`가 들어갑니다.
- **SystemSchema 측 수정만 필요**, 리포지토리·리셋 로직은 **추가 수정 불필요.**

---

## 3. 요약

| 구분 | 대상 | 조치 |
|------|------|------|
| **필수** | MongoSystemRepository `updateSettings` | `peopleCounterEnabled`를 `$set`에 **조건부** 추가 |
| **필수** | SystemSchema + getDefaultSettings | `runtime.peopleCounterEnabled` 및 기본값 `false` 추가 |
| **필수** | SystemService.getPollingState | 초기화용 `defaultRuntime`에 `peopleCounterEnabled: false` 추가 |
| **권장** | SystemService.updatePollingInterval | fallback 객체에 `peopleCounterEnabled: false` 추가 |
| **신규** | SystemService | `getPeopleCounterState` / `updatePeopleCounterState` 추가 |
| **신규** | API / 프론트 | people-counter 전용 라우트·훅·UI 추가 |
| **변경 없음** | updatePollingState, setApplyLock, 폴링/모니터링 API, 스냅샷, client 초기화 등 | 그대로 두어도 됨 |

---

## 4. 주의사항

1. **Mongo `$set`**
   - `peopleCounterEnabled`는 **값이 `undefined`가 아닐 때만** `$set`에 넣어야 합니다.  
     그래야 `updatePollingState` 호출 시 기존 `peopleCounterEnabled`가 덮어씌워지지 않습니다.

2. **기존 DB 문서**
   - 이미 있는 system 문서에는 `runtime.peopleCounterEnabled`가 없을 수 있습니다.
   - `getPeopleCounterState` 등에서는 `peopleCounterEnabled`가 없으면 `false`로 간주하는 처리가 필요합니다.

3. **과거 스냅샷**
   - 예전에 만든 스냅샷에는 `peopleCounterEnabled`가 없습니다.
   - 적용 시 피플카운터 설정만큼은 “복원하지 않고, 기존 DB 값 유지”라고 보면 됩니다.

---

**문서 작성일**: 2025-01-09
