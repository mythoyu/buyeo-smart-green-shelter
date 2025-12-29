# 냉난방기 외부제어 구현 - 기존 시스템 영향도 분석

## 📋 분석 개요

**분석 목적**: 포트별 RealModbusService 인스턴스 관리 구조로 냉난방기 외부제어 기능을 추가할 때, 기존 시스템에 미치는 영향을 분석하고 안전성을 검증합니다.

**분석 일자**: 2025-01-XX

---

## ✅ 안전성 검증 결과

### 전체 평가: **🟢 안전 (Low Risk)**

기존 시스템에 미치는 영향은 최소화되며, 하위 호환성을 유지할 수 있습니다.

---

## 🔍 주요 변경 지점 분석

### 1. getModbusCommandWithPortMapping 함수

**현재 구조**:
```typescript
export const getModbusCommandWithPortMapping = (unit: IUnit, commandKey: string): ModbusCommand => {
  // 동기 함수, CLIENT_PORT_MAPPINGS에서 조회
}
```

**변경 계획**:
- 외부제어 확인 로직 추가
- 외부제어 시 프로토콜별 매핑 함수 호출
- 기존 로직은 유지 (외부제어가 아닌 경우)

**영향도**: 🟢 **Low**
- ✅ 동기 함수 유지 (비동기 변경 불필요)
- ✅ Unit.data는 동기 접근 가능
- ✅ 외부제어가 아닌 경우 기존 로직 그대로 실행
- ✅ 호출부 변경 불필요 (ControlService 4곳)

**호출 위치**:
- `ControlService.executeGeneralModbusCommand()` - 1곳
- `ControlService.executeTimeCommand()` - 2곳
- `ControlService.executeIntegratedTimeCommand()` - 1곳

**위험 완화**:
```typescript
// 안전한 체크 로직
const hvacConfig = getHvacConfigForUnit(unit); // 동기 함수
if (!hvacConfig?.externalControlEnabled || unit.type !== 'cooler') {
  // 기존 로직 실행 (100% 동일)
  return existingLogic();
}
// 외부제어 로직 실행
```

---

### 2. UnifiedModbusPollerService.executePollingForDevice

**현재 구조**:
```typescript
async executePollingForDevice(deviceId: string, unitId: string, deviceType: string): Promise<any> {
  // CLIENT_PORT_MAPPINGS에서 직접 조회
  // GET_* 액션만 필터링하여 폴링 실행
}
```

**변경 계획**:
- deviceType이 'cooler'일 때 외부제어 확인
- 외부제어 활성화 시: ttyS1 직접 폴링 로직 실행
- 외부제어 비활성화 시: 기존 로직 실행 (변경 없음)

**영향도**: 🟢 **Low**
- ✅ 조건부 분기로 기존 로직 보호
- ✅ 외부제어가 아닌 경우 100% 기존 동작
- ✅ cooler가 아닌 deviceType은 영향 없음

**위험 완화**:
```typescript
// 안전한 체크 로직
if (deviceType === 'cooler') {
  const hvacConfig = await getHvacConfigForUnit(unit); // 비동기 (System 조회 가능)
  if (hvacConfig?.externalControlEnabled) {
    // 외부제어 폴링 로직
    return await executeExternalControlPolling(...);
  }
}
// 기존 로직 실행 (100% 동일)
return await executeExistingPolling(...);
```

---

### 3. UnifiedModbusCommunicationService - 포트별 인스턴스 관리

**현재 구조**:
```typescript
export class UnifiedModbusCommunicationService {
  private realService: RealModbusService; // 단일 인스턴스
  private mockService: MockModbusService;
  
  constructor(logger?: ILogger) {
    this.realService = new RealModbusService(logger); // 단일 포트 (/dev/ttyS0)
  }
}
```

**변경 계획**:
- 포트별 RealModbusService 인스턴스 관리 (Map<string, RealModbusService>)
- ttyS0 인스턴스는 기존과 동일하게 유지
- ttyS1 인스턴스는 외부제어 전용

**영향도**: 🟡 **Medium** (구조 변경이지만 안전함)
- ⚠️ 내부 구조 변경
- ✅ ttyS0 인스턴스는 기존과 동일 (하위 호환성)
- ✅ 기존 API 인터페이스 유지 (readRegisters, writeRegister)
- ✅ 포트별 인스턴스는 lazy initialization

**위험 완화**:
```typescript
// 안전한 초기화 로직
private getRealServiceForPort(port: string): RealModbusService {
  if (!this.realServices.has(port)) {
    // 기존 ttyS0는 기존 설정 유지
    const config = port === '/dev/ttyS0' 
      ? getModbusConfig() // 기존 설정
      : getHvacModbusConfig(port); // 새로운 설정
    this.realServices.set(port, new RealModbusService(this.logger, config));
  }
  return this.realServices.get(port)!;
}
```

**기존 호출부 영향**:
- ✅ `UnifiedModbusService.readRegisters()` - 변경 없음
- ✅ `UnifiedModbusService.writeRegister()` - 변경 없음
- ✅ `ControlService` - 변경 없음

---

### 4. ControlService.executeGeneralModbusCommand

**현재 구조**:
```typescript
private async executeGeneralModbusCommand(...): Promise<CommandResult> {
  const commandSpec = getModbusCommandWithPortMapping(unit, commandKey);
  // 기존 Modbus 통신 실행
}
```

**변경 계획**:
- `getModbusCommandWithPortMapping` 내부에서 외부제어 확인 (호출부 변경 없음)
- 외부제어 시 프로토콜별 매핑 사용
- UnifiedModbusService는 포트별 라우팅 (내부 처리)

**영향도**: 🟢 **Very Low**
- ✅ 호출부 변경 불필요
- ✅ 내부 로직만 변경
- ✅ 외부제어가 아닌 경우 100% 기존 동작

---

### 5. 폴링 로직 - 외부제어 스킵 vs 경로 분기

**원래 계획**: 외부제어 시 폴링 스킵
**수정된 계획**: 외부제어 시 ttyS1 직접 폴링

**영향도**: 🟢 **Low**
- ✅ 폴링 자체는 유지 (데이터 수집 보장)
- ✅ 경로만 분기 (ttyS0 → ttyS1)
- ✅ 기존 폴링 사이클과 독립적

---

## 🔒 하위 호환성 검증

### 1. API 인터페이스

| 인터페이스 | 변경 여부 | 호환성 |
|-----------|----------|--------|
| `IUnifiedModbusCommunication` | ❌ 변경 없음 | ✅ 100% 호환 |
| `IModbusCommunication` | ❌ 변경 없음 | ✅ 100% 호환 |
| `getModbusCommandWithPortMapping` | ⚠️ 내부 로직 변경 | ✅ 시그니처 동일 |
| `executePollingForDevice` | ⚠️ 내부 로직 변경 | ✅ 시그니처 동일 |

**결론**: 모든 공개 API 인터페이스가 유지되므로 기존 코드는 변경 불필요

---

### 2. 데이터 스키마

| 스키마 | 변경 여부 | 호환성 |
|--------|----------|--------|
| `Unit.data` | ✅ 확장 (선택적 필드) | ✅ 하위 호환 |
| `System.settings` | ✅ 확장 (hvac 필드 추가) | ✅ 하위 호환 |

**결론**: 기존 데이터는 영향 없음, 새 필드는 선택적

---

### 3. 환경변수

| 환경변수 | 기본값 | 영향 |
|---------|--------|------|
| `HVAC_EXTERNAL_CONTROL_ENABLED` | `false` | ✅ 기본값으로 기존 동작 유지 |
| `HVAC_MANUFACTURER` | `""` | ✅ 빈 값으로 기존 동작 유지 |
| `HVAC_MODBUS_PORT` | `/dev/ttyS1` | ✅ 기존 ttyS0 사용에 영향 없음 |
| `HVAC_MODBUS_BAUD_RATE` | `9600` | ✅ 기존 설정과 독립적 |
| `HVAC_MODBUS_PARITY` | `even` | ✅ 기존 설정과 독립적 |

**결론**: 기본값이 `false`이므로 기존 동작 100% 유지

---

## ⚠️ 잠재적 위험 요소 및 완화 방법

### 위험 1: 포트별 인스턴스 관리 복잡도 증가

**위험도**: 🟡 Medium
**영향**: 메모리 사용량 증가, 연결 관리 복잡도 증가

**완화 방법**:
- ✅ Lazy initialization (필요할 때만 생성)
- ✅ Connection pooling 고려 (필요 시)
- ✅ 메모리 모니터링 추가

---

### 위험 2: 외부제어 설정 오류 시 기존 시스템 영향

**위험도**: 🟢 Low
**영향**: 외부제어 설정 오류 시 냉난방기만 영향

**완화 방법**:
- ✅ 기본값이 `false`이므로 실수로 활성화되지 않음
- ✅ 유효성 검증 추가 (manufacturer, port 확인)
- ✅ 에러 로깅 강화

---

### 위험 3: 프로토콜 매핑 오류

**위험도**: 🟡 Medium
**영향**: 외부제어 명령 실패

**완화 방법**:
- ✅ 프로토콜 문서 기반 매핑 (검증됨)
- ✅ 단위 테스트 작성
- ✅ 통합 테스트 (Mock 장비)

---

### 위험 4: 폴링 성능 영향

**위험도**: 🟢 Low
**영향**: ttyS1 폴링 추가로 인한 성능 영향 최소

**완화 방법**:
- ✅ 외부제어 활성화 시에만 ttyS1 폴링 실행
- ✅ 기존 폴링 사이클과 독립적
- ✅ 성능 모니터링 추가

---

## 📊 영향 범위 요약

### 변경 범위

| 범위 | 파일 수 (예상) | 위험도 |
|------|---------------|--------|
| 신규 파일 | ~10개 | 🟢 Low |
| 기존 파일 수정 | ~8개 | 🟡 Medium |
| 인터페이스 변경 | 0개 | ✅ None |
| 스키마 변경 | 2개 (확장) | 🟢 Low |

### 영향받는 서비스

| 서비스 | 영향도 | 비고 |
|--------|--------|------|
| ControlService | 🟢 Low | 내부 로직만 변경 |
| UnifiedModbusPollerService | 🟡 Medium | 폴링 로직 분기 추가 |
| UnifiedModbusCommunicationService | 🟡 Medium | 포트별 인스턴스 관리 |
| RealModbusService | ✅ None | 변경 없음 (인스턴스만 추가) |
| 기타 서비스 | ✅ None | 영향 없음 |

---

## ✅ 최종 검증 체크리스트

### 기능 안전성

- [x] 외부제어 비활성화 시 기존 동작 100% 유지
- [x] cooler가 아닌 deviceType은 영향 없음
- [x] 공개 API 인터페이스 유지
- [x] 환경변수 기본값이 안전 (false)
- [x] 데이터 스키마 하위 호환

### 구조 안전성

- [x] 포트별 인스턴스 관리가 기존 인스턴스에 영향 없음
- [x] Lazy initialization으로 메모리 효율
- [x] 에러 처리 및 로깅 강화
- [x] 폴링 경로 분기로 데이터 수집 보장

### 테스트 가능성

- [x] 단위 테스트 작성 가능
- [x] 통합 테스트 작성 가능
- [x] Mock 모드에서 테스트 가능
- [x] 점진적 배포 가능

---

## 🎯 결론

### 구현 가능성: ✅ **가능**

**이유**:
1. 기존 시스템 구조를 유지하면서 확장 가능
2. 하위 호환성 보장 (기본값이 안전)
3. 영향 범위가 제한적 (cooler 타입만)
4. 점진적 구현 및 테스트 가능

### 기존 시스템 영향: 🟢 **최소 (Low Risk)**

**이유**:
1. 외부제어 비활성화 시 기존 동작 100% 유지
2. 공개 API 인터페이스 변경 없음
3. 데이터 스키마 하위 호환
4. 조건부 분기로 기존 로직 보호

### 권장 사항

1. ✅ **단계별 구현**: Phase 1 → Phase 2 → ... 순서대로 진행
2. ✅ **테스트 우선**: 각 Phase마다 단위 테스트 작성
3. ✅ **기본값 유지**: 환경변수 기본값을 `false`로 유지
4. ✅ **로깅 강화**: 외부제어 관련 로그 추가
5. ✅ **모니터링**: 포트별 인스턴스 상태 모니터링

---

## 📝 다음 단계

1. Phase 1부터 순차적으로 구현 시작
2. 각 Phase마다 테스트 및 검증
3. 점진적 배포 (외부제어 비활성화 상태로 배포)
4. 통합 테스트 완료 후 외부제어 활성화

---

**문서 버전**: 1.0
**최종 검토 일자**: 2025-01-XX
