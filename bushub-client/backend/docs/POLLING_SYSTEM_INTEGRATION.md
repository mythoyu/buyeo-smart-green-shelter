# 🚀 폴링 시스템 통합 가이드

## 📋 개요

이 문서는 기존의 하드코딩된 Modbus 폴링 시스템을 새로운 매핑 기반 폴링 시스템으로 통합하는 과정을 설명합니다.

## 🎯 목표

1. **기존 하드코딩 폴링 제거**: 직접적인 레지스터 주소 사용 제거
2. **매핑 기반 폴링 구현**: `clientPortMappings`와 `HW_PORTS` 활용
3. **단계적 전환**: 안전한 마이그레이션을 위한 점진적 접근
4. **완전 통합**: 최종적으로 하나의 통합된 폴링 시스템 구축

## 🔧 구현 단계

### **1단계: 조건부 폴링 구현** ✅

- [x] `getRegisteredDevicesWithCache()` - Data 컬렉션에서 장비 목록 조회
- [x] `startLegacyPolling()` - 기존 하드코딩 폴링 (fallback용)
- [x] `startMappedPolling()` - 새로운 매핑 기반 폴링
- [x] `startMappedPollingWithTimer()` - 매핑 폴링 타이머
- [x] Data 컬렉션 상태에 따른 폴링 방식 자동 선택

### **2단계: 점진적 전환** ✅

- [x] 폴링 모드 상수 시스템 (`MAPPED_ONLY`만 지원)
- [x] 환경변수 기반 제어 (`POLLING_MODE`, `POLLING_FALLBACK_ENABLED`)
- [x] 통합 폴링 시스템 (`startUnifiedPolling`)

### **3단계: 완전 통합** ✅

- [x] `startSNGILUnifiedPolling()` - 통합 폴링 시스템 사용
- [x] `startBasicPolling()` - 필수 폴링으로 변경
- [x] `executeEssentialPolling()` - 시스템 상태 확인 로직 구현
- [x] `ServerInitializer.ts` - 통합 폴링 시스템 사용
- [x] `SystemService.ts` - 통합 폴링 시스템 사용
- [x] MAPPED_ONLY 전용 시스템으로 단순화
- [x] 최종 테스트 및 검증

### **4단계: Backend Actions 제거 및 단순화** ✅

- [x] `backendActions.ts` 파일 삭제
- [x] `deviceBackendActions.ts` 파일 삭제
- [x] `executePollingForDevice` 메서드 단순화
- [x] Client Port Mappings 직접 사용으로 변경
- [x] 불필요한 중간 레이어 제거
- [x] Action 이름 불일치 문제 완전 해결

## 🏗️ 아키텍처

### **기존 시스템**

```
startAllSNGILPolling() → startSNGILUnifiedPolling() → executePollingLogic()
                                                      ↓
                                              하드코딩된 레지스터 주소
```

### **새로운 시스템 (MAPPED_ONLY 전용, Backend Actions 제거)**

```
startAllSNGILPolling() → startUnifiedPolling() → startMappedPolling()
                                                    ↓
                                            매핑 기반 폴링 시스템
                                            (Client Port Mappings → HW_PORTS)
```

### **Backend Actions 제거 효과**

```
이전: 프론트엔드 → Backend Actions → Client Port Mappings → HW_PORTS
     ↓                    ↓                    ↓                    ↓
  GET_MODE           GET_HVAC_MODE         GET_MODE           실제 하드웨어
     ❌                    ❌                    ✅                    ✅

현재: 프론트엔드 → Client Port Mappings → HW_PORTS
     ↓                    ↓                    ↓
  GET_MODE              GET_MODE           실제 하드웨어
     ✅                    ✅                    ✅
```

## ⚙️ 환경변수 설정

### **폴링 모드**

```bash
# 🆕 폴링 모드 설정 (MAPPED_ONLY 전용)
POLLING_MODE=mapped_only              # mapped_only만 지원
```

### **모드별 동작**

- **`mapped_only`**: 새로운 매핑 폴링만 실행 (기본값)
- **에러 처리**: 폴링 실패 시 빈 배열 반환, fallback 없음

## 🔄 마이그레이션 전략

### **MAPPED_ONLY 전용 시스템**

- **기본 동작**: 항상 새로운 매핑 폴링 실행
- **에러 처리**: 폴링 실패 시 빈 배열 반환
- **단순성**: 복잡한 fallback 로직 없음
- **직접 연결**: Backend Actions 없이 Client Port Mappings 직접 사용

### **에러 처리 메커니즘**

- 폴링 실패 시 빈 배열 반환
- 시스템 안정성 유지
- 로그를 통한 문제 추적

## 📊 성능 및 모니터링

### **캐싱 시스템**

- 장비 목록 5분간 캐싱
- 불필요한 데이터베이스 쿼리 방지
- 폴링 성능 최적화

### **로깅 및 모니터링**

- 각 폴링 단계별 상세 로깅
- 폴링 성공/실패 통계
- 시스템 리소스 사용량 모니터링

## 🧪 테스트 전략

### **단위 테스트**

- 각 폴링 모드별 동작 검증
- 에러 상황 및 fallback 동작 확인
- 캐싱 시스템 동작 검증

### **통합 테스트**

- 실제 Modbus 장비와의 연동 테스트
- Data 컬렉션 저장 및 동기화 검증
- 시스템 모드 변경 시 폴링 동작 확인

### **성능 테스트**

- 다양한 장비 수에서의 폴링 성능 측정
- 메모리 사용량 및 CPU 사용률 모니터링
- 폴링 간격 변경 시 시스템 안정성 확인

## 🚨 주의사항

### **데이터 무결성**

- 기존 폴링과 새로운 폴링 간 데이터 일관성 보장
- 폴링 실패 시 데이터 손실 방지
- 백업 및 복구 메커니즘 구현

### **시스템 안정성**

- 폴링 실패 시 자동 fallback (제거됨)
- 시스템 리소스 사용량 모니터링
- 장시간 실행 시 메모리 누수 방지

## 🔮 향후 계획

### **단기 목표**

- [x] 기존 하드코딩 메서드들 완전 제거
- [x] Backend Actions 제거 및 단순화
- [x] 폴링 성능 최적화
- [ ] 모니터링 대시보드 구축

### **장기 목표**

- [ ] 실시간 폴링 상태 모니터링
- [ ] 자동 폴링 간격 조정
- [ ] 머신러닝 기반 폴링 최적화

## 📞 지원 및 문의

폴링 시스템 통합 관련 문의사항이 있으시면 개발팀에 연락해주세요.

---

**마지막 업데이트**: 2024년 12월
**버전**: 2.0.0
**상태**: Backend Actions 제거 완료, 단순화된 폴링 시스템 구축
