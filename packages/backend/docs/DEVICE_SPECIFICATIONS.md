# 장비별 스케줄 지원 현황 및 특성

## 📋 **개요**

이 문서는 SmartCity 시스템의 각 장비 타입별로 지원하는 스케줄 기능과 제한사항을 상세히 설명합니다.

## 🎯 **스케줄 지원 현황 요약**

| 장비 타입      | 스케줄1 (DO1~DO13, DO16) | 스케줄2 (DO1~DO4) | 지원 이유                                |
| -------------- | ------------------------ | ----------------- | ---------------------------------------- |
| **lighting**   | ✅ 지원                  | ✅ 지원           | 복잡한 조명 제어를 위해 다중 스케줄 필요 |
| **cooler**     | ✅ 지원                  | ❌ 미지원         | 기본적인 온도 제어만 필요                |
| **aircurtain** | ✅ 지원                  | ❌ 미지원         | 기본적인 풍량 제어만 필요                |
| **bench**      | ✅ 지원                  | ❌ 미지원         | 기본적인 온열 제어만 필요                |
| **door**       | ✅ 지원                  | ❌ 미지원         | 기본적인 자동문 제어만 필요              |
| **externalsw** | ✅ 지원                  | ❌ 미지원         | 기본적인 스위치 제어만 필요              |
| **exchanger**  | ✅ 지원                  | ❌ 미지원         | 기본적인 열교환 제어만 필요              |

## 🔍 **장비별 상세 명세**

### **1. 조명 (Lighting) - d011**

#### **스케줄 지원**

- **스케줄1**: DO1~DO13, DO16 지원

  - `SET_START_TIME_1`: 시작시간1 설정 (address: 42)
  - `SET_END_TIME_1`: 종료시간1 설정 (address: 74)
  - `SET_START_TIME_1_HOUR`: 시작시간1 시 설정 (address: 42)
  - `SET_START_TIME_1_MINUTE`: 시작시간1 분 설정 (address: 58)
  - `SET_END_TIME_1_HOUR`: 종료시간1 시 설정 (address: 74)
  - `SET_END_TIME_1_MINUTE`: 종료시간1 분 설정 (address: 90)

- **스케줄2**: DO1~DO4 지원 (유일하게 지원)
  - `SET_START_TIME_2`: 시작시간2 설정 (address: 106)
  - `SET_END_TIME_2`: 종료시간2 설정 (address: 138)
  - `SET_START_TIME_2_HOUR`: 시작시간2 시 설정 (address: 106)
  - `SET_START_TIME_2_MINUTE`: 시작시간2 분 설정 (address: 122)
  - `SET_END_TIME_2_HOUR`: 종료시간2 시 설정 (address: 138)
  - `SET_END_TIME_2_MINUTE`: 종료시간2 분 설정 (address: 154)

#### **지원 이유**

- 복잡한 조명 제어 시나리오 지원
- 주간/야간 모드 분리
- 계절별 조명 패턴 설정

### **2. 냉난방기 (Cooler) - d021**

#### **스케줄 지원**

- **스케줄1**: DO1~DO13, DO16 지원

  - `SET_START_TIME_1`: 시작시간1 설정 (address: 42)
  - `SET_END_TIME_1`: 종료시간1 설정 (address: 74)
  - `SET_START_TIME_1_HOUR`: 시작시간1 시 설정 (address: 42)
  - `SET_START_TIME_1_MINUTE`: 시작시간1 분 설정 (address: 58)
  - `SET_END_TIME_1_HOUR`: 종료시간1 시 설정 (address: 74)
  - `SET_END_TIME_1_MINUTE`: 종료시간1 분 설정 (address: 90)

- **스케줄2**: ❌ 미지원
  - `SET_START_TIME_2`: 지원하지 않음
  - `SET_END_TIME_2`: 지원하지 않음

#### **지원 이유**

- 기본적인 온도 제어만 필요
- 단일 스케줄로 충분한 운영 가능
- 복잡한 다중 스케줄링 불필요

#### **제한사항**

- 스케줄2 관련 명령어 요청 시 오류 발생
- 오류 메시지: "Command 'SET_START_TIME_2' not supported for cooler device type. Only lighting device supports schedule2 (START_TIME_2, END_TIME_2). Use schedule1 (START_TIME_1, END_TIME_1) instead."

### **3. 공기커튼 (Air Curtain) - d021**

#### **스케줄 지원**

- **스케줄1**: DO1~DO13, DO16 지원

  - `SET_START_TIME_1`: 시작시간1 설정 (address: 42)
  - `SET_END_TIME_1`: 종료시간1 설정 (address: 74)
  - `SET_START_TIME_1_HOUR`: 시작시간1 시 설정 (address: 42)
  - `SET_START_TIME_1_MINUTE`: 시작시간1 분 설정 (address: 58)
  - `SET_END_TIME_1_HOUR`: 종료시간1 시 설정 (address: 74)
  - `SET_END_TIME_1_MINUTE`: 종료시간1 분 설정 (address: 90)

- **스케줄2**: ❌ 미지원

#### **지원 이유**

- 기본적인 풍량 제어만 필요
- 단일 스케줄로 충분한 운영 가능

### **4. 온열벤치 (Bench) - d041**

#### **스케줄 지원**

- **스케줄1**: DO1~DO13, DO16 지원

  - `SET_START_TIME_1`: 시작시간1 설정 (address: 42)
  - `SET_END_TIME_1`: 종료시간1 설정 (address: 74)
  - `SET_START_TIME_1_HOUR`: 시작시간1 시 설정 (address: 42)
  - `SET_START_TIME_1_MINUTE`: 시작시간1 분 설정 (address: 58)
  - `SET_END_TIME_1_HOUR`: 종료시간1 시 설정 (address: 74)
  - `SET_END_TIME_1_MINUTE`: 종료시간1 분 설정 (address: 90)

- **스케줄2**: ❌ 미지원

#### **지원 이유**

- 기본적인 온열 제어만 필요
- 단일 스케줄로 충분한 운영 가능

### **5. 자동문 (Door) - d051**

#### **스케줄 지원**

- **스케줄1**: DO1~DO13, DO16 지원

  - `SET_START_TIME_1`: 시작시간1 설정 (address: 42)
  - `SET_END_TIME_1`: 종료시간1 설정 (address: 74)
  - `SET_START_TIME_1_HOUR`: 시작시간1 시 설정 (address: 42)
  - `SET_START_TIME_1_MINUTE`: 시작시간1 분 설정 (address: 58)
  - `SET_END_TIME_1_HOUR`: 종료시간1 시 설정 (address: 74)
  - `SET_END_TIME_1_MINUTE`: 종료시간1 분 설정 (address: 90)

- **스케줄2**: ❌ 미지원

#### **지원 이유**

- 기본적인 자동문 제어만 필요
- 단일 스케줄로 충분한 운영 가능

### **6. 외부스위치 (External Switch) - d071**

#### **스케줄 지원**

- **스케줄1**: DO1~DO13, DO16 지원

  - `SET_START_TIME_1`: 시작시간1 설정 (address: 42)
  - `SET_END_TIME_1`: 종료시간1 설정 (address: 74)
  - `SET_START_TIME_1_HOUR`: 시작시간1 시 설정 (address: 42)
  - `SET_START_TIME_1_MINUTE`: 시작시간1 분 설정 (address: 58)
  - `SET_END_TIME_1_HOUR`: 종료시간1 시 설정 (address: 74)
  - `SET_END_TIME_1_MINUTE`: 종료시간1 분 설정 (address: 90)

- **스케줄2**: ❌ 미지원

#### **지원 이유**

- 기본적인 스위치 제어만 필요
- 단일 스케줄로 충분한 운영 가능

### **7. 전열교환기 (Exchanger) - d061**

#### **스케줄 지원**

- **스케줄1**: DO1~DO13, DO16 지원

  - `SET_START_TIME_1`: 시작시간1 설정 (address: 42)
  - `SET_END_TIME_1`: 종료시간1 설정 (address: 74)
  - `SET_START_TIME_1_HOUR`: 시작시간1 시 설정 (address: 42)
  - `SET_START_TIME_1_MINUTE`: 시작시간1 분 설정 (address: 58)
  - `SET_END_TIME_1_HOUR`: 종료시간1 시 설정 (address: 74)
  - `SET_END_TIME_1_MINUTE`: 종료시간1 분 설정 (address: 90)

- **스케줄2**: ❌ 미지원

#### **지원 이유**

- 기본적인 열교환 제어만 필요
- 단일 스케줄로 충분한 운영 가능

## ⚠️ **제한사항 및 주의사항**

### **1. 스케줄2 미지원 장비에서의 오류 처리**

- `SET_START_TIME_2`, `SET_END_TIME_2` 명령어 요청 시 명확한 오류 메시지 제공
- 대안으로 스케줄1 사용을 안내

### **2. 프론트엔드 UI 제한**

- 스케줄2 미지원 장비에서는 해당 컨트롤이 표시되지 않음
- 사용자가 잘못된 명령을 요청할 수 없도록 UI 차단

### **3. API 응답 제한**

- 스케줄2 미지원 장비에서 해당 명령어 요청 시 HTTP 400 오류 반환
- 오류 메시지에 지원하지 않는 이유와 대안 명시

## 🔧 **개발 가이드라인**

### **1. 새로운 장비 추가 시**

- 기본적으로 스케줄1만 지원하도록 설계
- 스케줄2가 필요한 경우 별도 검토 후 구현

### **2. 스케줄 관련 명령어 처리**

- `ControlService.ts`의 시간 명령어 처리 로직 활용
- 장비 타입별 지원 여부 확인 후 적절한 오류 메시지 제공

### **3. 문서화**

- 장비별 스케줄 지원 현황을 이 문서에 반영
- API 문서에도 제한사항 명시

## 📚 **참고 자료**

- [SNGIL DDC Commands Documentation](../README_SNGIL_DDC_COMMANDS.md)
- [Protocol Specifications](../src/meta/protocols/)
- [API Endpoints](../docs/API_ENDPOINTS.md)

---

**마지막 업데이트**: 2025년 1월 21일  
**문서 버전**: 1.0  
**작성자**: SmartCity Development Team
