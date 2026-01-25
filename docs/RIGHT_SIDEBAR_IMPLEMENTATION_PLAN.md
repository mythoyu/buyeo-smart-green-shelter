# 오른쪽 사이드바 및 레이아웃 개선 구현 계획

## 📋 개요

1. **FAB를 헤더로 이동**: 플로팅 액션 버튼을 상단 헤더로 이동
2. **오른쪽 사이드바 추가**: 페이지별 컨텐츠를 오른쪽 사이드바에 배치
3. **모바일 UX 개선**: 사용자 정보를 Popover로 표시
4. **파비콘 변경**: Train 아이콘으로 변경

---

## 1. FAB를 헤더로 이동

### 1.1 수정 파일
- `packages/bushub-client/frontend/src/components/layout/MainLayout.tsx`

### 1.2 수정 내용
- **현재**: FAB가 오른쪽 하단 고정 (`fixed right-4 bottom-4`)
- **변경**: 헤더 오른쪽 영역으로 이동

### 1.3 구현 세부사항
- 헤더 오른쪽에 FAB 버튼 3개 배치:
  - 폴링 ON/OFF 버튼
  - 에러 패널 버튼
  - 실시간 로그 버튼
- 버튼 크기 조정: `w-14 h-14` → `w-10 h-10` 또는 `w-12 h-12` (헤더 공간 고려)
- 모바일에서도 헤더에 표시 (공간 부족 시 아이콘만 표시)
- 숨김 토글 버튼 제거 (헤더에 항상 표시)

### 1.4 헤더 레이아웃 구조
```
[메뉴] [클라이언트]          [시간] [사용자] [폴링] [에러] [로그]
```

---

## 2. 오른쪽 사이드바 추가

### 2.1 수정 파일
- `packages/bushub-client/frontend/src/components/layout/MainLayout.tsx`
- `packages/bushub-client/frontend/src/components/layout/RightSidebar.tsx` (신규)
- `packages/bushub-client/frontend/src/contexts/RightSidebarContext.tsx` (신규)

### 2.2 사이드바 기본 구조
- 위치: `fixed top-16 bottom-0 right-0 z-50`
- 너비: `w-64` 또는 `w-80` (데스크탑)
- 모바일: 오버레이로 동작, 왼쪽 사이드바와 상호 배타적

### 2.3 페이지별 컨텐츠

#### 2.3.1 대시보드 페이지
**컨텐츠:**
- `DashboardFilterBar` (타입/상태 필터)
- `ModeControlCard` (모드 제어)

**수정 파일:**
- `packages/bushub-client/frontend/src/components/pages/DashboardPage.tsx`

**변경 사항:**
- 메인 콘텐츠에서 `DashboardFilterBar`, `ModeControlCard` 제거
- 오른쪽 사이드바로 이동

---

#### 2.3.2 현장설정 페이지
**컨텐츠:**
- 비워둠 (빈 사이드바)

**수정 파일:**
- `packages/bushub-client/frontend/src/components/pages/DeviceRegistrationPage.tsx`

**변경 사항:**
- 오른쪽 사이드바 비워둠

---

#### 2.3.3 사용자 관리 페이지
**컨텐츠:**
- 사용자 등록 버튼
- 필터 (역할별 필터링)

**수정 파일:**
- `packages/bushub-client/frontend/src/components/pages/UserManagementPage.tsx`

**변경 사항:**
- 상단의 사용자 등록 버튼을 사이드바로 이동
- 필터 (`selectedFilter`)를 사이드바로 이동
- 메인 콘텐츠는 사용자 목록 테이블만 표시

---

#### 2.3.4 로그 분석 페이지
**컨텐츠:**
- 컨트롤 패널:
  - 파일 선택 드롭다운
  - 검색 입력 + 검색 버튼
  - 라인 수 선택
  - 다운로드 버튼
  - 정렬 토글 버튼
  - 새로고침 버튼

**수정 파일:**
- `packages/bushub-client/frontend/src/components/pages/LogAnalysisPage.tsx`

**변경 사항:**
- 메인 콘텐츠의 컨트롤 패널 (351-450줄)을 사이드바로 이동
- 메인 콘텐츠는 로그 뷰어만 표시

---

#### 2.3.5 시스템 설정 페이지
**컨텐츠:**
- 그룹화된 설정 카테고리:
  - **네트워크**
    - 유선 네트워크 설정
    - SoftAP 설정
  - **시간**
    - NTP 설정
    - DDC 시간 설정
  - **운영·장비**
    - 절기 설정
    - DDC 폴링 간격
    - 피플카운터
  - **유지보수**
    - 시스템 재기동

**수정 파일:**
- `packages/bushub-client/frontend/src/components/pages/SystemSettingsPage.tsx`

**변경 사항:**
- 사이드바에 그룹화된 카테고리 목록 표시
- 선택한 카테고리만 메인에 표시
- 아코디언 형태로 그룹 접기/펼치기

---

#### 2.3.6 시스템 분석 페이지
**컨텐츠:**
- 그룹화된 모니터링 항목:
  - **시스템·인프라**
    - 서버 상태
    - 상위 서버
    - 핑 테스트
    - 시스템 요약
  - **데이터**
    - 데이터베이스
  - **하드웨어**
    - 하드웨어
  - **서비스**
    - 서비스
  - **폴링·동기화**
    - 폴링
    - 복구 시스템
    - 시간 동기화

**수정 파일:**
- `packages/bushub-client/frontend/src/components/pages/SystemMonitoringPage.tsx`

**변경 사항:**
- 사이드바에 그룹화된 항목 목록 표시
- 선택한 그룹/항목만 메인에 표시
- 아코디언 형태로 그룹 접기/펼치기

---

#### 2.3.7 직접 제어 페이지
**컨텐츠:**
- 하드웨어 타입 선택:
  - DO 포트 제어 (체크박스)
  - DI 포트 제어 (체크박스)
  - HVAC 제어 (체크박스)
  - 통합센서 (체크박스, 읽기 전용)
  - 시스템 설정 (체크박스)

**수정 파일:**
- `packages/bushub-client/frontend/src/components/pages/HardwareControlPage.tsx`
- `packages/bushub-client/frontend/src/components/common/HardwareControl/HardwareControlTabs.tsx`

**변경 사항:**
- 기존 탭 구조를 사이드바 선택 방식으로 변경
- 사이드바에서 선택한 항목만 메인에 표시
- 여러 항목 동시 선택 가능 (선택적)

---

## 3. 모바일 UX 개선

### 3.1 사용자 정보 Popover
**수정 파일:**
- `packages/bushub-client/frontend/src/components/layout/MainLayout.tsx`

**수정 내용:**
- 모바일에서 사용자 정보를 Popover로 표시
- 클라이언트 정보 Popover와 동일한 패턴 사용
- User 아이콘 버튼 클릭 시 Popover 표시

**구조:**
```tsx
<Popover>
  <PopoverTrigger asChild>
    <Button variant='ghost' size='icon' className='md:hidden'>
      <User className='h-5 w-5 text-primary' />
    </Button>
  </PopoverTrigger>
  <PopoverContent>
    {/* 사용자 정보 */}
  </PopoverContent>
</Popover>
```

---

## 4. 파비콘 변경

### 4.1 수정 파일
- `packages/bushub-client/frontend/public/favicon.svg` (수정)
- `packages/bushub-client/frontend/index.html` (수정)

### 4.2 수정 내용
- Train 아이콘 SVG 경로 추출
- `favicon.svg` 파일 생성/수정
- `index.html`에서 SVG 파비콘 사용

**Train 아이콘 SVG 구조:**
- lucide-react Train 아이콘의 SVG 경로 사용
- 색상: primary (Green 계열)
- 크기: 32x32 또는 64x64

---

## 5. Context API 구조

### 5.1 RightSidebarContext 생성
**파일:** `packages/bushub-client/frontend/src/contexts/RightSidebarContext.tsx`

**기능:**
- 오른쪽 사이드바 컨텐츠 주입
- 페이지별 컨텐츠 설정
- 선택된 항목 상태 관리 (시스템설정, 시스템분석, 직접제어)

**인터페이스:**
```typescript
interface RightSidebarContextValue {
  content: React.ReactNode | null;
  setContent: (content: React.ReactNode | null) => void;
  selectedItems: string[];
  setSelectedItems: (items: string[]) => void;
}
```

---

## 6. RightSidebar 컴포넌트

### 6.1 컴포넌트 생성
**파일:** `packages/bushub-client/frontend/src/components/layout/RightSidebar.tsx`

**기능:**
- 오른쪽 사이드바 렌더링
- 페이지별 컨텐츠 표시
- 모바일 오버레이 처리
- 열림/닫기 상태 관리

---

## 7. 레이아웃 조정

### 7.1 메인 콘텐츠 마진
- 왼쪽 사이드바: `lg:ml-20` (기존)
- 오른쪽 사이드바: `lg:mr-64` 또는 `lg:mr-80` (신규)
- 메인 콘텐츠: `lg:ml-20 lg:mr-64` 또는 `lg:ml-20 lg:mr-80`

### 7.2 반응형 처리
- 데스크탑 (≥1024px): 양쪽 사이드바 모두 표시 가능
- 모바일 (<1024px): 좌우 사이드바 상호 배타적, 오버레이로 동작

---

## 8. 구현 순서

### Phase 1: 기본 구조
1. RightSidebarContext 생성
2. RightSidebar 컴포넌트 생성
3. MainLayout에 오른쪽 사이드바 추가
4. 레이아웃 마진 조정

### Phase 2: FAB 이동
5. FAB를 헤더로 이동
6. 버튼 크기/스타일 조정
7. 모바일 반응형 처리

### Phase 3: 페이지별 컨텐츠
8. 대시보드: FilterBar, ModeControlCard 이동
9. 사용자관리: 등록 버튼, 필터 이동
10. 로그분석: 컨트롤 패널 이동
11. 시스템설정: 그룹화된 카테고리 추가
12. 시스템분석: 그룹화된 항목 추가
13. 직접제어: 선택 방식으로 변경

### Phase 4: 모바일 UX
14. 사용자 정보 Popover 추가
15. 좌우 사이드바 상호 배타적 처리

### Phase 5: 파비콘
16. Train 아이콘 SVG 생성
17. favicon.svg 수정
18. index.html 수정

---

## 9. 파일 목록

### 신규 생성 파일
- `packages/bushub-client/frontend/src/contexts/RightSidebarContext.tsx`
- `packages/bushub-client/frontend/src/components/layout/RightSidebar.tsx`

### 수정 파일
- `packages/bushub-client/frontend/src/components/layout/MainLayout.tsx`
- `packages/bushub-client/frontend/src/components/pages/DashboardPage.tsx`
- `packages/bushub-client/frontend/src/components/pages/DeviceRegistrationPage.tsx`
- `packages/bushub-client/frontend/src/components/pages/UserManagementPage.tsx`
- `packages/bushub-client/frontend/src/components/pages/LogAnalysisPage.tsx`
- `packages/bushub-client/frontend/src/components/pages/SystemSettingsPage.tsx`
- `packages/bushub-client/frontend/src/components/pages/SystemMonitoringPage.tsx`
- `packages/bushub-client/frontend/src/components/pages/HardwareControlPage.tsx`
- `packages/bushub-client/frontend/src/components/common/HardwareControl/HardwareControlTabs.tsx`
- `packages/bushub-client/frontend/public/favicon.svg`
- `packages/bushub-client/frontend/index.html`

---

## 10. 주의사항

### 10.1 상태 관리
- 오른쪽 사이드바 컨텐츠는 페이지별로 다름
- Context API로 전역 상태 관리
- 페이지 이동 시 사이드바 컨텐츠 자동 변경

### 10.2 성능
- 페이지별 컨텐츠는 필요 시에만 렌더링
- React.memo, useMemo 활용
- 지연 로딩 (lazy loading) 고려

### 10.3 접근성
- 키보드 네비게이션 지원
- 스크린 리더 지원
- 포커스 관리

---

## 11. 테스트 체크리스트

### 기능 테스트
- [ ] FAB 버튼이 헤더에 정상 표시
- [ ] 오른쪽 사이드바가 정상 표시/숨김
- [ ] 페이지별 컨텐츠가 정상 표시
- [ ] 그룹화된 항목 선택이 정상 동작
- [ ] 모바일에서 Popover가 정상 동작
- [ ] 파비콘이 Train 아이콘으로 변경됨

### 반응형 테스트
- [ ] 데스크탑에서 양쪽 사이드바 동시 표시
- [ ] 모바일에서 좌우 사이드바 상호 배타적 동작
- [ ] 헤더 FAB 버튼이 모바일에서도 정상 표시

### 성능 테스트
- [ ] 페이지 이동 시 사이드바 컨텐츠 변경 성능
- [ ] 그룹 선택 시 메인 콘텐츠 필터링 성능
- [ ] 메모리 누수 없음

---

**문서 작성일**: 2025-01-09
**최종 수정일**: 2025-01-09
