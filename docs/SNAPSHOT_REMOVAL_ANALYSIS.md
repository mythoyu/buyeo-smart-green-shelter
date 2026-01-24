# 스냅샷 기능 제거 가능 여부 검토

## 📋 개요

스냅샷 기능을 제거할 수 있는지, 제거 시 영향 범위를 검토한 결과입니다.

---

## 1. 스냅샷 기능의 현재 사용 현황

### 1.1 백엔드

| 구성 요소 | 파일 경로 | 용도 | 제거 가능 여부 |
|----------|----------|------|---------------|
| **API 라우트** | `backend/src/api/v1/routes/snapshots.ts` | 스냅샷 CRUD API (저장/로드/목록/삭제/내보내기) | ✅ 제거 가능 |
| **API 등록** | `backend/src/api/v1/routes/system/system.ts` | `snapshotsRoutes(app)` 등록 | ✅ 제거 가능 |
| **스케줄러** | `backend/src/core/services/SnapshotScheduler.ts` | 자동 스냅샷 생성 (일일) | ✅ 제거 가능 |
| **스케줄러 등록** | `backend/src/core/container/ServiceContainer.ts` | `snapshotScheduler` 서비스 등록 | ✅ 제거 가능 |
| **DB 스키마** | `backend/src/models/schemas/SnapshotSchema.ts` | MongoDB 스냅샷 컬렉션 정의 | ✅ 제거 가능 |
| **SystemService 메서드** | `backend/src/core/services/SystemService.ts` | `applySnapshotSettings()` | ✅ 제거 가능 |
| **DataApplyService 메서드** | `backend/src/core/services/DataApplyService.ts` | `applySnapshotData()` | ⚠️ **주의 필요** |

### 1.2 프론트엔드

| 구성 요소 | 파일 경로 | 용도 | 제거 가능 여부 |
|----------|----------|------|---------------|
| **API 훅** | `frontend/src/api/queries/snapshots.ts` | 스냅샷 관련 React Query 훅 | ✅ 제거 가능 |
| **목록 다이얼로그** | `frontend/src/components/common/SnapshotListDialog.tsx` | 스냅샷 목록/적용/삭제 UI | ✅ 제거 가능 |
| **상세 다이얼로그** | `frontend/src/components/common/SnapshotDetailDialog.tsx` | 스냅샷 상세 정보 UI | ✅ 제거 가능 |
| **적용 진행 다이얼로그** | `frontend/src/components/common/SnapshotApplyProgressDialog.tsx` | 스냅샷 적용 진행 상황 UI | ⚠️ **주의 필요** |
| **DataApplyCard** | `frontend/src/components/common/DataApplyCard.tsx` | 데이터 적용 카드 (스냅샷 기능 포함) | ⚠️ **주의 필요** |
| **SystemSettingsPage** | `frontend/src/components/pages/SystemSettingsPage.tsx` | 주석 처리된 스냅샷 코드 | ✅ 제거 가능 |

---

## 2. 제거 시 주의사항

### 2.1 DataApplyService.applySnapshotData() ⚠️

**위치**: `backend/src/core/services/DataApplyService.ts`

**현황**:
- `applySnapshotData()`는 스냅샷 전용 메서드입니다.
- `DataApplyService` 자체는 **일반 데이터 적용**에도 사용됩니다 (`applyData()` 메서드).
- `applySnapshotData()`는 스냅샷 관련 코드만 포함하므로 **안전하게 제거 가능**합니다.

**제거 방법**:
```typescript
// 제거할 메서드:
- applySnapshotData()
- validateSnapshotData()
- restoreSnapshotToDataCollection()
- createDataBackup() (스냅샷 전용인지 확인 필요)
- restoreDataBackup() (스냅샷 전용인지 확인 필요)
```

**주의**: `createDataBackup()` / `restoreDataBackup()`이 일반 `applyData()`에서도 사용되는지 확인 필요.

---

### 2.2 SystemService.applySnapshotSettings() ✅

**위치**: `backend/src/core/services/SystemService.ts`

**현황**:
- 스냅샷 전용 메서드입니다.
- `validateSnapshotSettings()`도 함께 제거 가능합니다.

**제거 방법**:
```typescript
// 제거할 메서드:
- applySnapshotSettings()
- validateSnapshotSettings()
```

**인터페이스도 제거 필요**:
- `backend/src/core/services/interfaces/ISystemService.ts`에서 `applySnapshotSettings()` 시그니처 제거

---

### 2.3 SnapshotApplyProgressDialog ⚠️

**위치**: `frontend/src/components/common/SnapshotApplyProgressDialog.tsx`

**현황**:
- 스냅샷 적용 진행 상황을 표시하는 다이얼로그입니다.
- `DataApplyCard`에서도 사용됩니다.

**제거 방법**:
- `DataApplyCard`에서 스냅샷 관련 코드 제거 후, 이 다이얼로그도 제거 가능합니다.
- 또는 일반 데이터 적용 진행 상황 표시용으로 재사용 가능 (이름 변경 필요).

---

### 2.4 DataApplyCard ⚠️

**위치**: `frontend/src/components/common/DataApplyCard.tsx`

**현황**:
- 데이터 적용 카드 컴포넌트입니다.
- 스냅샷 기능이 **통합**되어 있습니다:
  - 스냅샷 목록 조회
  - 스냅샷 적용
  - 스냅샷 저장
  - 스냅샷 목록 다이얼로그

**제거 방법**:
- 스냅샷 관련 코드만 제거하고, **일반 데이터 적용 기능은 유지**해야 합니다.
- 제거할 부분:
  ```typescript
  // import 제거
  - useGetSnapshots, useLoadSnapshot, useSaveSnapshot, useDeleteSnapshot
  - SnapshotListDialog, SnapshotApplyProgressDialog
  
  // state 제거
  - showSnapshotDialog
  - snapshotsData
  
  // UI 제거
  - 스냅샷 선택 드롭다운
  - 스냅샷 저장 버튼
  - 스냅샷 목록 보기 버튼
  - SnapshotListDialog 컴포넌트
  ```

---

### 2.5 SnapshotScheduler 자동 실행 여부 확인 필요 ⚠️

**위치**: `backend/src/core/services/SnapshotScheduler.ts`

**현황**:
- `ServiceContainer`에서 인스턴스 생성 및 등록은 하지만, **`start()` 호출하는 곳을 찾지 못했습니다**.
- 자동 실행되지 않을 수도 있습니다.

**확인 필요**:
- `ServerInitializer`에서 `snapshotScheduler.start()` 호출하는지 확인
- 다른 곳에서 자동 실행되는지 확인

**제거 방법**:
- `start()`가 호출되지 않는다면, 단순히 등록 코드만 제거하면 됩니다.
- `start()`가 호출된다면, 해당 호출 코드도 제거해야 합니다.

---

## 3. 제거 가능 여부 결론

### ✅ **제거 가능**

스냅샷 기능은 **독립적인 기능**이므로 제거 가능합니다. 다만 다음 사항을 주의해야 합니다:

1. **DataApplyCard**: 스냅샷 관련 코드만 제거하고, 일반 데이터 적용 기능은 유지
2. **DataApplyService**: 스냅샷 전용 메서드만 제거하고, 일반 `applyData()`는 유지
3. **백업/복원 메서드**: 스냅샷 전용인지 일반 적용에서도 사용하는지 확인 필요

---

## 4. 제거 시 수정 대상 파일 목록

### 4.1 백엔드 (완전 제거)

| 파일 | 작업 |
|------|------|
| `backend/src/api/v1/routes/snapshots.ts` | **파일 삭제** |
| `backend/src/api/v1/routes/system/system.ts` | `snapshotsRoutes` import 및 등록 제거 |
| `backend/src/core/services/SnapshotScheduler.ts` | **파일 삭제** |
| `backend/src/core/container/ServiceContainer.ts` | `SnapshotScheduler` import, 생성, 등록, `getSnapshotScheduler()` 제거 |
| `backend/src/models/schemas/SnapshotSchema.ts` | **파일 삭제** |
| `backend/src/core/services/SystemService.ts` | `applySnapshotSettings()`, `validateSnapshotSettings()` 제거 |
| `backend/src/core/services/interfaces/ISystemService.ts` | `applySnapshotSettings()` 시그니처 제거 |
| `backend/src/core/services/DataApplyService.ts` | `applySnapshotData()`, `validateSnapshotData()`, `restoreSnapshotToDataCollection()` 제거 (백업/복원 메서드는 확인 후 결정) |

### 4.2 프론트엔드 (완전 제거)

| 파일 | 작업 |
|------|------|
| `frontend/src/api/queries/snapshots.ts` | **파일 삭제** |
| `frontend/src/components/common/SnapshotListDialog.tsx` | **파일 삭제** |
| `frontend/src/components/common/SnapshotDetailDialog.tsx` | **파일 삭제** |
| `frontend/src/components/common/SnapshotApplyProgressDialog.tsx` | **파일 삭제** (또는 일반 진행 상황 다이얼로그로 재사용) |
| `frontend/src/components/common/DataApplyCard.tsx` | 스냅샷 관련 코드만 제거 (일반 데이터 적용 기능 유지) |
| `frontend/src/components/pages/SystemSettingsPage.tsx` | 주석 처리된 스냅샷 코드 제거 |

### 4.3 데이터베이스

| 작업 | 설명 |
|------|------|
| **MongoDB 컬렉션** | `snapshots` 컬렉션은 **수동으로 삭제**하거나 그대로 둬도 됨 (스키마만 제거하면 접근 불가) |

---

## 5. 제거 후 영향 없는 부분

다음 기능들은 스냅샷과 **독립적**이므로 영향 없습니다:

- ✅ 일반 데이터 적용 (`DataApplyService.applyData()`)
- ✅ 시스템 설정 관리 (`SystemService`의 다른 메서드들)
- ✅ 폴링, DDC 시간 동기화, 로그 스케줄러 등 다른 서비스들
- ✅ API 라우트 (스냅샷 라우트만 제거)

---

## 6. 제거 순서 권장사항

1. **프론트엔드 먼저**: 스냅샷 UI 제거 → 사용자 접근 차단
2. **백엔드 API 제거**: 스냅샷 API 라우트 제거
3. **서비스 제거**: `SnapshotScheduler`, `SystemService` 스냅샷 메서드 제거
4. **스키마 제거**: `SnapshotSchema` 제거
5. **의존성 정리**: `ServiceContainer`, `DataApplyService`에서 스냅샷 관련 코드 제거
6. **최종 확인**: 빌드 에러, 타입 에러 확인

---

## 7. 주의사항 요약

| 항목 | 상태 | 조치 |
|------|------|------|
| **DataApplyService 백업/복원 메서드** | ⚠️ 확인 필요 | 일반 `applyData()`에서도 사용하는지 확인 |
| **SnapshotApplyProgressDialog** | ⚠️ 확인 필요 | 일반 진행 상황 표시로 재사용 가능 여부 확인 |
| **SnapshotScheduler 자동 실행** | ⚠️ 확인 필요 | `start()` 호출하는 곳 확인 |
| **기존 스냅샷 데이터** | ℹ️ 선택 | MongoDB 컬렉션은 그대로 둬도 됨 (스키마만 제거) |

---

**문서 작성일**: 2025-01-09
