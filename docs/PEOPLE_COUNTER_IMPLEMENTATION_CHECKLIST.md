# 피플카운터 기능 구현 체크리스트

## 📋 개요

피플카운터 기능을 시스템 설정 페이지에서 Enable/Disable 할 수 있도록 구현하기 위한 수정 사항을 정리한 문서입니다.

---

## 🎯 구현 목표

1. **선택적 기능**: 피플카운터가 없는 제품도 같은 버전으로 릴리즈 가능
2. **시스템 설정 UI**: 운영 중 ON/OFF 변경 가능
3. **기본값**: `false` (비활성화 상태로 시작)

---

## 📝 수정 사항 체크리스트

### 1. 사양서 문서 수정

#### 1.1 `docs/PEOPLE_COUNTER_SPEC.md` 수정

- [x] **7. 환경 설정** 섹션에 시스템 설정 UI 방식 추가
- [x] 환경 변수 방식은 선택사항으로 변경
- [x] **11. 참고사항**에 "선택적 기능" 섹션 추가
- [x] 피플카운터 없이도 릴리즈 가능 명시

**수정 위치:**
- `## 7. 환경 설정` → 시스템 설정 UI 방식 추가
- `## 11. 참고사항` → 선택적 기능 설명 추가

---

### 2. 백엔드 수정 사항

#### 2.1 데이터베이스 스키마

**파일**: `bushub-client/backend/src/models/schemas/SystemSchema.ts`

- [x] `ISystem` 인터페이스의 `runtime` 타입에 `peopleCounterEnabled?: boolean` 추가
- [x] `SystemSchema`의 `runtime` 스키마에 `peopleCounterEnabled: { type: Boolean }` 추가
- [x] `getDefaultSettings()` 정적 메서드에 `peopleCounterEnabled: false` 추가

**예시:**
```typescript
runtime: {
  pollingEnabled: { type: Boolean },
  pollingInterval: { type: Number, default: 20000 },
  applyInProgress: { type: Boolean, default: false },
  peopleCounterEnabled: { type: Boolean }, // 추가
}
```

---

#### 2.2 Repository 인터페이스

**파일**: `bushub-client/backend/src/core/repositories/interfaces/ISystemRepository.ts`

- [x] `SystemUpdateParams` 인터페이스의 `runtime` 타입에 `peopleCounterEnabled?: boolean` 추가

**예시:**
```typescript
runtime?: {
  pollingEnabled?: boolean;
  pollingInterval?: number;
  applyInProgress?: boolean;
  peopleCounterEnabled?: boolean; // 추가
};
```

---

#### 2.3 SystemService

**파일**: `bushub-client/backend/src/core/services/SystemService.ts`

- [x] `getPeopleCounterState(initializeIfMissing = false)` 메서드 추가
  - `getSettings()` 호출
  - `runtime.peopleCounterEnabled` 반환
  - 없으면 `initializeIfMissing`이 true일 때 기본값 `false`로 초기화

- [x] `updatePeopleCounterState(enabled: boolean)` 메서드 추가
  - 기존 `runtime` 설정 유지하면서 `peopleCounterEnabled`만 업데이트
  - `updateSettings({ runtime: { ...currentRuntime, peopleCounterEnabled: enabled } })` 호출

**예시:**
```typescript
async getPeopleCounterState(initializeIfMissing = false): Promise<{
  peopleCounterEnabled: boolean;
} | null> {
  // getPollingState()와 동일한 패턴
}

async updatePeopleCounterState(enabled: boolean): Promise<SystemSettings | null> {
  // updatePollingState()와 동일한 패턴
}
```

---

#### 2.4 SystemService 인터페이스

**파일**: `bushub-client/backend/src/core/services/interfaces/ISystemService.ts`

- [x] `getPeopleCounterState(initializeIfMissing?: boolean)` 메서드 시그니처 추가
- [x] `updatePeopleCounterState(enabled: boolean)` 메서드 시그니처 추가

---

#### 2.5 API 라우트

**파일**: `bushub-client/backend/src/api/v1/routes/system/people-counter.ts` (신규 생성)

- [x] `GET /system/people-counter/state` 엔드포인트 추가
  - `systemService.getPeopleCounterState(true)` 호출
  - `{ success: true, data: { peopleCounterEnabled } }` 반환

- [x] `POST /system/people-counter` 엔드포인트 추가
  - Request body: `{ peopleCounterEnabled: boolean }`
  - `systemService.updatePeopleCounterState(peopleCounterEnabled)` 호출
  - 성공 시 `PeopleCounterPollerService` 재시작/중지 로직 호출 (선택사항)

**참고**: `bushub-client/backend/src/api/v1/routes/system/polling.ts`를 참고하여 동일한 패턴으로 구현

---

#### 2.6 API 라우트 등록

**파일**: `bushub-client/backend/src/api/v1/routes/system/index.ts` (또는 해당 라우트 등록 파일)

- [x] `people-counter` 라우트 등록
  ```typescript
  import peopleCounterRoutes from './people-counter';
  await fastify.register(peopleCounterRoutes);
  ```

---

#### 2.7 PeopleCounterPollerService

**파일**: `bushub-client/backend/src/core/services/PeopleCounterPollerService.ts` (신규 생성 예정)

- [x] 서비스 초기화 시 `getPeopleCounterState()` 확인  
      (`initializeDataDocument()` 및 `tick()` 내부에서 상태 확인)
- [x] `peopleCounterEnabled === true`일 때만 실제 통신/저장 로직 수행  
      (`peopleCounterEnabled === false`인 경우 `tick()`에서 즉시 return)
- [x] 폴링 루프에서 주기적으로 상태 확인 (`tick()` 호출 시마다 상태 조회)

**예시:**
```typescript
async startPolling() {
  const state = await systemService.getPeopleCounterState();
  if (!state?.peopleCounterEnabled) {
    this.logger?.info('피플카운터가 비활성화되어 있습니다');
    return;
  }
  // 폴링 시작 로직
}
```

---

#### 2.8 ServerInitializer

**파일**: `bushub-client/backend/src/core/ServerInitializer.ts`

- [x] `PeopleCounterPollerService`를 서버 초기화 시점에 시작 (`startPeopleCounterPoller()`)  
      (폴러 내부에서 `peopleCounterEnabled` 상태를 확인하여 실질 동작 여부를 결정)
- [x] 서비스 초기화 실패 시에도 로그만 남기고 시스템 중단 없이 계속 진행

---

### 3. 프론트엔드 수정 사항

#### 3.1 API 훅 생성

**파일**: `bushub-client/frontend/src/api/queries/people-counter.ts` (신규 생성)

- [x] `useGetPeopleCounterState()` 훅 추가
  - `GET /system/people-counter/state` 호출
  - React Query를 활용해 상태 캐싱/자동 갱신

- [x] `useUpdatePeopleCounterState()` 훅 추가
  - `POST /system/people-counter` 호출
  - 성공 시 `['people-counter', 'state']` 쿼리 무효화

**참고**: `bushub-client/frontend/src/api/queries/polling.ts`를 참고하여 동일한 패턴으로 구현

---

#### 3.2 타입 정의

**파일**: `bushub-client/frontend/src/api/queries/people-counter.ts`

- [x] `PeopleCounterState` 인터페이스 정의
  ```typescript
  export interface PeopleCounterState {
    peopleCounterEnabled: boolean;
  }
  ```

---

#### 3.3 SystemSettingsPage 컴포넌트

**파일**: `bushub-client/frontend/src/components/pages/SystemSettingsPage.tsx`

- [x] `useGetPeopleCounterState`, `useUpdatePeopleCounterState` 훅 import
- [x] 피플카운터 상태 조회 및 업데이트 로직 추가
- [x] 새로운 `SettingsCard` 추가 (DDC 폴링 간격 설정 다음에 배치)

**UI 구조:**
```tsx
<SettingsCard
  icon={Users} // 또는 적절한 아이콘
  title='피플카운터'
  description='인원 카운트 기능 활성화/비활성화'
  // onApply 없음 (즉시 적용)
>
  <div className='flex items-center justify-between p-3 bg-muted rounded-lg'>
    <div>
      <span className='text-sm font-medium'>피플카운터 활성화</span>
      <p className='text-xs text-muted-foreground mt-1'>
        현재: {peopleCounterState?.peopleCounterEnabled ? '활성화' : '비활성화'}
      </p>
    </div>
    <OnOffToggleButton
      checked={!!peopleCounterState?.peopleCounterEnabled}
      onChange={handlePeopleCounterToggle}
      labelOn='ON'
      labelOff='OFF'
    />
  </div>
</SettingsCard>
```

**핸들러:**
```typescript
const handlePeopleCounterToggle = async (enabled: boolean) => {
  updatePeopleCounterStateMutation.mutate(enabled, {
    onSuccess: () => {
      toast.success(`피플카운터가 ${enabled ? '활성화' : '비활성화'}되었습니다`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || '피플카운터 설정 변경 실패');
    },
  });
};
```

---

#### 3.4 아이콘 import

**파일**: `bushub-client/frontend/src/components/pages/SystemSettingsPage.tsx`

- [x] `lucide-react`에서 적절한 아이콘 import (예: `Users`, `UserCheck`, `UsersRound`)

---

### 4. 선택적 기능 관련 수정

#### 4.1 API 응답 처리

**파일**: `bushub-client/backend/src/api/v1/routes/data.ts`

- [x] `GET /data` 엔드포인트에서 피플카운터 데이터 조회 시
  - `getPeopleCounterState()` 확인
  - `peopleCounterEnabled === false`이면 피플카운터 장비(`d082`) 제외

---

**파일**: `bushub-client/backend/src/api/v1/routes/people-counter-external.ts` (통계/로우데이터 엔드포인트)

- [x] `GET /people-counter/stats` 엔드포인트
  - `getPeopleCounterState()` 확인
  - `peopleCounterEnabled === false`이면 `404` 또는 빈 응답 반환

- [x] `GET /people-counter/raw` 엔드포인트
  - `getPeopleCounterState()` 확인
  - `peopleCounterEnabled === false`이면 `404` 또는 빈 응답 반환

---

#### 4.2 에러 처리

**파일**: `bushub-client/backend/src/core/services/PeopleCounterService.ts` (신규 생성 예정)

- [x] 시리얼 포트 연결 실패 시
  - 로그만 기록하고 시스템 중단 없이 계속 진행
  - `peopleCounterEnabled === false`로 자동 변경하지 않음 (사용자가 수동으로 변경)

---

#### 4.3 Docker 설정 (선택사항)

**파일**: `docker-compose.integrated.yml`(모노레포 루트)

- [x] `ttyS1` 마운트는 선택사항으로 명시
- [x] 피플카운터 없을 때는 마운트 없어도 정상 동작

---

### 5. 문서 업데이트

#### 5.1 `docs/PEOPLE_COUNTER_SPEC.md` 수정

- [x] **7. 환경 설정** 섹션 수정
  - 시스템 설정 UI 방식 추가
  - 환경 변수는 선택사항으로 변경

- [x] **11. 참고사항** 섹션에 추가
  - 선택적 기능 명시
  - 피플카운터 없이도 릴리즈 가능
  - 기본값 `false` (비활성화)

- [x] **12. 선택적 기능** 섹션 신규 추가 (선택사항)
  - 시스템 설정에서 활성화/비활성화 방법
  - 피플카운터 없는 제품 릴리즈 가이드

---

## 🔄 구현 순서 권장

1. **백엔드 스키마/타입 수정** (2.1, 2.2)
2. **SystemService 메서드 추가** (2.3, 2.4)
3. **API 라우트 생성** (2.5, 2.6)
4. **프론트엔드 훅 생성** (3.1, 3.2)
5. **SystemSettingsPage UI 추가** (3.3, 3.4)
6. **PeopleCounterPollerService 상태 확인 로직** (2.7)
7. **선택적 기능 처리** (4.1, 4.2)
8. **문서 업데이트** (5.1)

---

## ✅ 검증 체크리스트

### 기능 검증

- [ ] 시스템 설정 페이지에서 피플카운터 ON/OFF 토글 동작 확인
- [ ] `peopleCounterEnabled = false`일 때 피플카운터 폴링 중지 확인
- [ ] `peopleCounterEnabled = true`일 때 피플카운터 폴링 시작 확인
- [ ] 피플카운터 없이도 시스템 정상 동작 확인
- [ ] `/data` 엔드포인트에서 피플카운터 비활성화 시 장비 제외 확인
- [ ] `/people-counter/*` 엔드포인트 비활성화 시 적절한 응답 확인

### 에러 처리 검증

- [ ] 시리얼 포트 연결 실패 시 시스템 중단 없음 확인
- [ ] 피플카운터 서비스 초기화 실패 시 시스템 중단 없음 확인
- [ ] API 호출 실패 시 적절한 에러 메시지 표시 확인

### 릴리즈 검증

- [ ] 피플카운터 없는 제품으로 릴리즈 가능 확인
- [ ] 기본값 `false`로 시작하는지 확인
- [ ] 시스템 설정에서 활성화 후 정상 동작 확인

---

## 📌 참고사항

### 기존 패턴 참고

- **폴링 ON/OFF**: `bushub-client/backend/src/api/v1/routes/system/polling.ts`
- **SystemService**: `bushub-client/backend/src/core/services/SystemService.ts` (updatePollingState, getPollingState)
- **프론트엔드 훅**: `bushub-client/frontend/src/api/queries/polling.ts`
- **UI 컴포넌트**: `bushub-client/frontend/src/components/pages/SystemSettingsPage.tsx` (SoftAP 토글 참고)

### 주의사항

1. **기본값**: 항상 `false` (비활성화)로 시작
2. **시스템 영향 없음**: 피플카운터 오류가 다른 기능에 영향 주지 않음
3. **선택적 기능**: 피플카운터 없이도 정상 릴리즈 가능해야 함

---

**문서 작성일**: 2025-01-09
**최종 수정일**: 2026-02-24
