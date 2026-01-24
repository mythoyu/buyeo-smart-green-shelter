# 스냅샷 제거 + 피플카운터 추가: 종합 영향도 분석

## 📋 개요

**두 작업을 동시에 진행할 때의 영향도, 겹침 여부, 난이도를 종합 분석한 결과**입니다.

---

## 1. 작업 요약

### 1.1 작업 A: 스냅샷 기능 제거

| 항목 | 내용 |
|------|------|
| **목적** | 사용하지 않는 스냅샷 기능 완전 제거 |
| **수정 파일 수** | 백엔드 7개, 프론트엔드 5개 (총 12개) |
| **작업 유형** | **코드 삭제** (제거 작업) |

### 1.2 작업 B: 피플카운터 추가

| 항목 | 내용 |
|------|------|
| **목적** | 피플카운터 Enable/Disable 기능 추가 |
| **수정 파일 수** | 백엔드 8개, 프론트엔드 4개 (총 12개) |
| **작업 유형** | **코드 추가** (신규 기능) |

---

## 2. 겹침 분석 (충돌 여부)

### 2.1 겹치는 파일

| 파일 | 작업 A (스냅샷 제거) | 작업 B (피플카운터 추가) | 충돌 여부 |
|------|---------------------|------------------------|----------|
| `SystemService.ts` | `applySnapshotSettings()` 제거 | `getPeopleCounterState()`, `updatePeopleCounterState()` 추가 | ❌ **충돌 없음** (다른 메서드) |
| `ISystemService.ts` | `applySnapshotSettings()` 시그니처 제거 | `getPeopleCounterState()`, `updatePeopleCounterState()` 시그니처 추가 | ❌ **충돌 없음** (다른 메서드) |
| `SystemSchema.ts` | 변경 없음 | `runtime.peopleCounterEnabled` 추가 | ❌ **충돌 없음** |
| `MongoSystemRepository.ts` | 변경 없음 | `updateSettings()`에 `peopleCounterEnabled` 조건부 추가 | ❌ **충돌 없음** |

### 2.2 겹치지 않는 파일

**작업 A만 수정:**
- `snapshots.ts` (API 라우트) - **파일 삭제**
- `SnapshotScheduler.ts` - **파일 삭제**
- `SnapshotSchema.ts` - **파일 삭제**
- `DataApplyService.ts` - 스냅샷 메서드만 제거
- 프론트엔드 스냅샷 관련 컴포넌트들 - **파일 삭제**

**작업 B만 수정:**
- `people-counter.ts` (API 라우트) - **신규 파일**
- `SystemSettingsPage.tsx` - 피플카운터 UI 추가
- `people-counter.ts` (API 훅) - **신규 파일**

---

## 3. 영향도 분석

### 3.1 코드 영향 범위

| 구분 | 작업 A (스냅샷 제거) | 작업 B (피플카운터 추가) | 합계 |
|------|---------------------|------------------------|------|
| **파일 삭제** | 5개 | 0개 | 5개 |
| **파일 수정** | 7개 | 12개 | 19개 |
| **파일 신규 생성** | 0개 | 2개 | 2개 |
| **총 영향 파일** | 12개 | 12개 | **24개** |

### 3.2 기능적 영향

| 기능 | 작업 A 영향 | 작업 B 영향 | 종합 영향 |
|------|------------|------------|----------|
| **시스템 설정 관리** | 스냅샷 관련 메서드 제거 | 피플카운터 설정 추가 | ✅ 독립적 |
| **데이터 적용** | 스냅샷 데이터 적용 제거 | 영향 없음 | ✅ 독립적 |
| **DB 스키마** | Snapshot 컬렉션 스키마 제거 | System.runtime에 필드 추가 | ✅ 독립적 |
| **API 라우트** | `/snapshots/*` 제거 | `/system/people-counter/*` 추가 | ✅ 독립적 |
| **프론트엔드 UI** | 스냅샷 다이얼로그 제거 | SystemSettingsPage에 토글 추가 | ✅ 독립적 |

---

## 4. 난이도 분석

### 4.1 작업 A: 스냅샷 제거

| 항목 | 난이도 | 이유 |
|------|--------|------|
| **전체 난이도** | ⭐⭐☆☆☆ (쉬움) | 코드 삭제 위주 |
| **백엔드** | ⭐⭐☆☆☆ (쉬움) | 파일 삭제 + 메서드 제거 |
| **프론트엔드** | ⭐⭐☆☆☆ (쉬움) | 파일 삭제 + import 제거 |
| **주의사항** | ⚠️ **DataApplyService** | 백업/복원 메서드가 스냅샷 전용인지 확인 필요 |

**예상 작업 시간**: 2-3시간

---

### 4.2 작업 B: 피플카운터 추가

| 항목 | 난이도 | 이유 |
|------|--------|------|
| **전체 난이도** | ⭐⭐⭐☆☆ (보통) | 신규 기능 추가 |
| **백엔드** | ⭐⭐⭐☆☆ (보통) | 스키마 수정 + 서비스 메서드 추가 + API 라우트 |
| **프론트엔드** | ⭐⭐☆☆☆ (쉬움) | API 훅 + UI 토글 추가 |
| **주의사항** | ⚠️ **MongoSystemRepository** | `peopleCounterEnabled` 조건부 `$set` 로직 주의 |

**예상 작업 시간**: 4-6시간

---

### 4.3 두 작업 동시 진행

| 항목 | 난이도 | 이유 |
|------|--------|------|
| **전체 난이도** | ⭐⭐⭐☆☆ (보통) | 독립적이므로 난이도 합산 |
| **충돌 가능성** | ⭐☆☆☆☆ (매우 낮음) | 거의 겹치지 않음 |
| **테스트 복잡도** | ⭐⭐⭐☆☆ (보통) | 두 기능 모두 테스트 필요 |

**예상 작업 시간**: 6-9시간 (순차 진행 시)

---

## 5. 작업 순서 권장사항

### 5.1 순서 1: 스냅샷 제거 먼저 (권장)

**이유:**
- ✅ 코드가 더 간단 (삭제 위주)
- ✅ 먼저 제거하면 피플카운터 추가 시 스냅샷 관련 고려 불필요
- ✅ 테스트 범위가 작음

**단계:**
1. 프론트엔드 스냅샷 UI 제거
2. 백엔드 스냅샷 API 제거
3. 스냅샷 서비스/스키마 제거
4. 빌드/테스트 확인
5. **그 다음** 피플카운터 추가

---

### 5.2 순서 2: 피플카운터 추가 먼저

**이유:**
- ⚠️ 스냅샷이 `getSettings()`를 사용하므로, 피플카운터 추가 후 스냅샷 저장 시 `peopleCounterEnabled`도 포함됨
- ⚠️ 하지만 스냅샷을 제거할 예정이므로 큰 문제는 아님

**단계:**
1. 피플카운터 기능 추가
2. 빌드/테스트 확인
3. **그 다음** 스냅샷 제거

---

### 5.3 순서 3: 동시 진행 (고급)

**조건:**
- 두 작업을 병렬로 진행 가능
- Git 브랜치 전략 활용 (각각 별도 브랜치 → 머지)

**주의:**
- `SystemService.ts`에서 같은 파일을 수정하므로 머지 시 주의 필요
- 하지만 다른 메서드이므로 충돌 가능성 낮음

---

## 6. 코드 영향 상세 분석

### 6.1 SystemService.ts (겹치는 파일)

**작업 A (스냅샷 제거):**
```typescript
// 제거할 메서드
- applySnapshotSettings()
- validateSnapshotSettings()
```

**작업 B (피플카운터 추가):**
```typescript
// 추가할 메서드
+ getPeopleCounterState()
+ updatePeopleCounterState()
```

**결론**: ✅ **충돌 없음** (다른 메서드, 다른 위치)

---

### 6.2 MongoSystemRepository.ts (겹치지 않음)

**작업 A**: 변경 없음

**작업 B**: `updateSettings()` 메서드 수정
```typescript
// 수정 전
$set: {
  'runtime.pollingEnabled': ...,
  'runtime.pollingInterval': ...,
  'runtime.applyInProgress': ...,
}

// 수정 후
$set: {
  'runtime.pollingEnabled': ...,
  'runtime.pollingInterval': ...,
  'runtime.applyInProgress': ...,
  // 조건부 추가
  ...(settingsData.runtime.peopleCounterEnabled !== undefined && {
    'runtime.peopleCounterEnabled': settingsData.runtime.peopleCounterEnabled
  })
}
```

**결론**: ✅ **충돌 없음** (작업 A는 이 파일 수정 안 함)

---

### 6.3 SystemSchema.ts (겹치지 않음)

**작업 A**: 변경 없음

**작업 B**: `runtime` 스키마에 필드 추가
```typescript
runtime: {
  pollingEnabled: { type: Boolean },
  pollingInterval: { type: Number, default: 20000 },
  applyInProgress: { type: Boolean, default: false },
  peopleCounterEnabled: { type: Boolean }, // 추가
}
```

**결론**: ✅ **충돌 없음** (작업 A는 이 파일 수정 안 함)

---

## 7. 잠재적 이슈 및 해결 방안

### 7.1 이슈 1: DataApplyService 백업/복원 메서드

**문제:**
- `createDataBackup()`, `restoreDataBackup()`이 스냅샷 전용인지 확인 필요
- 일반 `applyData()`에서도 사용하는지 확인 필요

**해결:**
- 코드 확인 결과: `applySnapshotData()`에서만 사용됨
- ✅ 스냅샷 제거 시 함께 제거 가능

---

### 7.2 이슈 2: 스냅샷이 getSettings() 사용

**문제:**
- 스냅샷 저장 시 `getSettings()`를 호출
- 피플카운터 추가 후 스냅샷 저장 시 `peopleCounterEnabled`도 포함됨

**해결:**
- ⚠️ 하지만 스냅샷을 제거할 예정이므로 문제 없음
- 스냅샷 제거 후에는 영향 없음

---

### 7.3 이슈 3: MongoSystemRepository 조건부 $set

**문제:**
- `peopleCounterEnabled`를 조건부로 `$set`해야 함
- `updatePollingState()` 호출 시 기존 값 유지 필요

**해결:**
- ✅ `settingsData.runtime.peopleCounterEnabled !== undefined` 체크
- ✅ 조건부 추가로 해결 가능

---

## 8. 최종 결론

### 8.1 코드 영향도

| 항목 | 평가 |
|------|------|
| **전체 영향도** | ⭐⭐⭐☆☆ (보통) |
| **충돌 가능성** | ⭐☆☆☆☆ (매우 낮음) |
| **작업 복잡도** | ⭐⭐⭐☆☆ (보통) |

### 8.2 난이도

| 작업 | 난이도 | 예상 시간 |
|------|--------|----------|
| **스냅샷 제거** | ⭐⭐☆☆☆ (쉬움) | 2-3시간 |
| **피플카운터 추가** | ⭐⭐⭐☆☆ (보통) | 4-6시간 |
| **합계** | ⭐⭐⭐☆☆ (보통) | 6-9시간 |

### 8.3 권장 작업 순서

1. ✅ **스냅샷 제거 먼저** (권장)
   - 더 간단한 작업
   - 먼저 정리하면 피플카운터 추가 시 깔끔함

2. ✅ **그 다음 피플카운터 추가**
   - 스냅샷 관련 고려 불필요
   - 집중해서 구현 가능

### 8.4 동시 진행 가능 여부

✅ **가능하지만 권장하지 않음**

- 두 작업이 거의 독립적이므로 동시 진행 가능
- 하지만 순차 진행이 더 안전하고 테스트하기 쉬움
- Git 브랜치 전략 활용 시 병렬 진행 가능

---

## 9. 체크리스트

### 9.1 스냅샷 제거 체크리스트

- [ ] 프론트엔드 스냅샷 UI 제거
- [ ] 백엔드 스냅샷 API 라우트 제거
- [ ] `SystemService.applySnapshotSettings()` 제거
- [ ] `DataApplyService.applySnapshotData()` 제거
- [ ] `SnapshotScheduler` 제거
- [ ] `SnapshotSchema` 제거
- [ ] `ServiceContainer`에서 스냅샷 관련 코드 제거
- [ ] 빌드/테스트 확인

### 9.2 피플카운터 추가 체크리스트

- [ ] `SystemSchema`에 `peopleCounterEnabled` 추가
- [ ] `MongoSystemRepository.updateSettings()` 수정
- [ ] `SystemService`에 피플카운터 메서드 추가
- [ ] API 라우트 추가
- [ ] 프론트엔드 API 훅 추가
- [ ] `SystemSettingsPage`에 UI 추가
- [ ] 빌드/테스트 확인

---

**문서 작성일**: 2025-01-09
