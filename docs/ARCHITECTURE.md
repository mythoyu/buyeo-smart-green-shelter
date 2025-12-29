# 아키텍처 문서

이 문서는 SmartCity Bushub Client 시스템의 아키텍처를 설명합니다.

## 📋 목차

- [아키텍처 개요](#아키텍처-개요)
- [Clean Architecture](#clean-architecture)
- [Repository Pattern](#repository-pattern)
- [Service Container](#service-container)
- [Modbus 통신 아키텍처](#modbus-통신-아키텍처)
- [폴링 시스템](#폴링-시스템)
- [WebSocket 통신](#websocket-통신)
- [데이터 동기화](#데이터-동기화)
- [명령 실행 흐름](#명령-실행-흐름)
- [프론트엔드 아키텍처](#프론트엔드-아키텍처)

---

## 아키텍처 개요

Bushub Client는 **Clean Architecture**와 **Repository Pattern**을 기반으로 설계되었습니다.

### 주요 특징

- **레이어 분리**: 데이터 접근, 비즈니스 로직, 프레젠테이션 레이어 분리
- **의존성 주입**: ServiceContainer를 통한 의존성 관리
- **인터페이스 기반**: 추상화를 통한 유연한 확장성
- **테스트 용이성**: Mock 객체를 통한 단위 테스트 지원

### 전체 구조

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (Fastify API Routes, WebSocket)       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Service Layer                   │
│  (Business Logic, Domain Services)       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Repository Layer                    │
│  (Data Access, MongoDB, Memory)          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Database Layer                  │
│  (MongoDB, File System)                  │
└─────────────────────────────────────────┘
```

---

## Clean Architecture

### 레이어 구조

```
src/
├── api/              # Presentation Layer
│   └── routes/       # API 라우트 핸들러
├── core/             # Domain & Application Layer
│   ├── services/     # 비즈니스 로직
│   ├── repositories/ # 데이터 접근 인터페이스
│   └── container/    # 의존성 주입 컨테이너
├── models/           # Domain Models
├── database/         # Infrastructure Layer
│   └── connection.ts # 데이터베이스 연결
└── utils/            # 유틸리티 함수
```

### 레이어별 책임

#### Presentation Layer (`api/`)

- HTTP 요청/응답 처리
- 요청 검증 및 변환
- 에러 처리 및 응답 포맷팅

#### Service Layer (`core/services/`)

- 비즈니스 로직 구현
- 도메인 규칙 적용
- 트랜잭션 관리

#### Repository Layer (`core/repositories/`)

- 데이터 접근 추상화
- 데이터베이스 독립성 보장
- 쿼리 최적화

#### Infrastructure Layer (`database/`, `models/`)

- 데이터베이스 연결 관리
- 스키마 정의
- 외부 라이브러리 통합

---

## Repository Pattern

### 인터페이스 기반 설계

모든 Repository는 인터페이스를 통해 정의됩니다.

```typescript
// 인터페이스 정의
export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  create(data: CreateUserDto): Promise<User>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}

// 구현체
export class MongoUserRepository implements IUserRepository {
  // MongoDB 구현
}
```

### 주요 Repository

| Repository | 인터페이스 | 구현체 | 용도 |
|------------|-----------|--------|------|
| **UserRepository** | `IUserRepository` | `MongoUserRepository` | 사용자 데이터 관리 |
| **ClientRepository** | `IClientRepository` | `MongoClientRepository` | 클라이언트 정보 관리 |
| **ApiKeyRepository** | `IApiKeyRepository` | `MongoApiKeyRepository` | API 키 관리 |
| **ControlRepository** | `IControlRepository` | `MongoControlRepository` | 제어 명령 로그 |
| **StatusRepository** | `IStatusRepository` | `MongoStatusRepository` | 상태 정보 관리 |
| **ErrorRepository** | `IErrorRepository` | `MongoErrorRepository` | 에러 로그 관리 |
| **ModbusRepository** | `IModbusRepository` | `MemoryModbusRepository` | Modbus 통신 상태 |
| **WebSocketRepository** | `IWebSocketRepository` | `MemoryWebSocketRepository` | WebSocket 연결 관리 |

### 장점

1. **테스트 용이성**: Mock Repository로 단위 테스트 가능
2. **확장성**: 새로운 데이터베이스 추가 시 인터페이스만 구현
3. **유지보수성**: 데이터 접근 로직 변경 시 영향 범위 최소화

---

## Service Container

### 싱글톤 패턴

`ServiceContainer`는 애플리케이션 전체에서 하나의 인스턴스만 존재합니다.

```typescript
const container = ServiceContainer.getInstance();
const userService = container.getUserService();
```

### 서비스 등록

서비스는 `initializeServices()` 메서드에서 등록됩니다.

```typescript
private initializeServices(): void {
  // Repository 생성
  const userRepository = new MongoUserRepository();
  
  // Service 생성 (의존성 주입)
  const userService = new UserService(userRepository, logger);
  
  // 컨테이너에 등록
  this.services.set('userRepository', userRepository);
  this.services.set('userService', userService);
}
```

### 주요 서비스

| 서비스 | 인터페이스 | 용도 |
|--------|-----------|------|
| **UserService** | `IUserService` | 사용자 관리 |
| **ClientService** | `IClientService` | 클라이언트 관리 |
| **ControlService** | `IControlService` | 장비 제어 |
| **SystemService** | `ISystemService` | 시스템 관리 |
| **UnifiedModbusService** | `IModbusService` | Modbus 통신 |
| **WebSocketService** | `IWebSocketService` | WebSocket 통신 |

---

## Modbus 통신 아키텍처

### 통합 Modbus 서비스

`UnifiedModbusService`는 Mock 모드와 실제 하드웨어 모드를 통합 관리합니다.

```
UnifiedModbusService
├── ModbusCommandQueue (명령 큐 관리)
├── UnifiedModbusCommunicationService (통신 서비스)
│   ├── RealModbusService (실제 하드웨어)
│   └── MockModbusService (Mock 모드)
├── PollingDataPersistenceService (폴링 데이터 저장)
└── UnifiedModbusPollerService (폴링 서비스)
```

### 명령 큐 시스템

우선순위 기반 명령 큐를 사용합니다.

| 우선순위 | 설명 | 예시 |
|---------|------|------|
| **high** | 긴급 제어 명령 | 전원 ON/OFF |
| **normal** | 일반 제어 명령 | 온도 설정 |
| **low** | 폴링 명령 | 상태 조회 |

### Mock 모드

개발 및 테스트 환경에서 하드웨어 없이 테스트할 수 있습니다.

```typescript
// Mock 모드 활성화
MODBUS_MOCK_ENABLED=true

// 실제 하드웨어 모드
MODBUS_MOCK_ENABLED=false
```

---

## 폴링 시스템

### MAPPED_ONLY 전용 시스템

매핑 기반 폴링 시스템만 사용합니다.

```
startAllSNGILPolling()
  └── startUnifiedPolling()
      └── startMappedPolling()
          └── Client Port Mappings → HW_PORTS
```

### 폴링 흐름

1. **장비 목록 조회**: Data 컬렉션에서 등록된 장비 조회 (5분 캐싱)
2. **매핑 기반 폴링**: `clientPortMappings`와 `HW_PORTS`를 사용하여 폴링
3. **데이터 저장**: 폴링 결과를 즉시 Data 컬렉션에 저장
4. **에러 처리**: 폴링 실패 시 빈 배열 반환, 로그 기록

### 주요 특징

- **즉시 저장**: 버퍼링 없이 폴링 결과 즉시 저장
- **캐싱**: 장비 목록 5분간 캐싱
- **에러 복구**: 폴링 실패 시 자동 재시도 (최대 1회, 100ms 지연)

---

## WebSocket 통신

### 실시간 통신

WebSocket을 통한 실시간 데이터 전송을 지원합니다.

```
Client (Browser)
  └── WebSocket Connection
      └── WebSocketService
          ├── LogMessage (로그 메시지)
          ├── CommandStatusMessage (명령 상태)
          └── DataUpdateMessage (데이터 업데이트)
```

### 메시지 타입

| 메시지 타입 | 설명 | 예시 |
|-----------|------|------|
| **LogMessage** | 로그 메시지 | 시스템 이벤트 로그 |
| **CommandStatusMessage** | 명령 실행 상태 | 제어 명령 성공/실패 |
| **DataUpdateMessage** | 데이터 업데이트 | 장비 상태 변경 |

---

## 데이터 동기화

### 양방향 동기화

컬렉션 ↔ 하드웨어 간 양방향 동기화를 지원합니다.

```
Data Collection (MongoDB)
  ↕
DataSyncService
  ↕
Hardware (Modbus)
```

### 동기화 흐름

1. **폴링 → 컬렉션**: 하드웨어 상태를 주기적으로 조회하여 컬렉션에 저장
2. **컬렉션 → 하드웨어**: 사용자 제어 명령을 하드웨어에 전송
3. **검증**: 제어 명령 실행 후 결과 검증

### DataSyncService

모든 데이터 동기화 관련 기능을 통합한 서비스입니다.

- **PollingDataMapper**: 폴링 결과 변환 및 매핑
- **PollingDataSyncService**: 데이터 동기화 및 저장
- **DataApplyService**: 하드웨어 제어 및 검증

---

## 명령 실행 흐름

### 제어 명령 실행

```
API Request
  └── ControlService.executeCommand()
      └── CommandExecutionStrategy
          ├── getModbusCommandWithPortMapping()
          └── UnifiedModbusService.executeCommand()
              └── ModbusCommandQueue.enqueue()
                  └── UnifiedModbusCommunicationService
                      └── RealModbusService / MockModbusService
```

### 단계별 설명

1. **API 요청**: 프론트엔드에서 제어 명령 요청
2. **명령 변환**: `ControlService`에서 명령을 Modbus 명령으로 변환
3. **포트 매핑**: `getModbusCommandWithPortMapping()`으로 포트 매핑 조회
4. **큐 등록**: 우선순위에 따라 명령 큐에 등록
5. **실행**: `UnifiedModbusCommunicationService`를 통해 실행
6. **응답**: 실행 결과를 API로 반환

---

## 프론트엔드 아키텍처

### Hook 패턴

재사용 가능한 로직을 Custom Hook으로 분리합니다.

| Hook | 용도 |
|------|------|
| **useApi** | API 호출 및 에러 처리 |
| **useUnitFormManagement** | 폼 상태 관리 및 동기화 |
| **useCommandManager** | 명령 실행 및 상태 관리 |
| **useWebSocket** | 실시간 통신 관리 |
| **usePollingStatus** | 폴링 상태 모니터링 |

### Context 패턴

전역 상태 관리를 위해 React Context를 사용합니다.

| Context | 용도 |
|---------|------|
| **AuthContext** | 인증 상태 및 사용자 정보 |
| **ClientContext** | 클라이언트 정보 및 선택 상태 |
| **LogContext** | 로그 패널 및 실시간 로그 |
| **ApiKeyContext** | API 키 및 토큰 관리 |

### 컴포넌트 구조

```
src/
├── components/
│   ├── pages/           # 페이지 컴포넌트
│   ├── common/          # 공통 컴포넌트
│   │   ├── DeviceCard   # 장비 카드
│   │   ├── UnitCard     # 유닛 카드
│   │   └── SettingsCard # 설정 카드
│   └── ui/              # UI 컴포넌트 (shadcn/ui)
├── hooks/               # Custom Hooks
├── contexts/            # React Contexts
└── utils/              # 유틸리티 함수
```

### 상태 관리 우선순위

1. **API 응답 우선**: `unit.data` > `unitForm`
2. **Cross-device 방지**: 각 유닛별 독립적 상태 관리
3. **실시간 동기화**: 폴링 데이터와 로컬 상태 동기화

---

## 성능 최적화

### 캐싱 전략

- **장비 목록 캐싱**: 5분간 캐싱
- **포트 매핑 캐싱**: TTL 기반 자동 정리
- **React Query 캐싱**: API 응답 캐싱

### 메모리 관리

- **TTL 기반 캐시**: 5분마다 자동 캐시 정리
- **메모리 정리**: 10분마다 메모리 정리
- **캐시 통계**: 각 캐시 레벨별 사용량 모니터링

### 폴링 최적화

- **조건부 폴링**: 캐시 기반 장비 조회
- **즉시 저장**: 버퍼링 제거로 데이터 일관성 보장
- **재시도 메커니즘**: 최대 1회, 100ms 지연

---

## 관련 문서

- [배포 가이드](./DEPLOYMENT_GUIDE.md) - 배포 및 설치 방법
- [환경 변수 가이드](./ENVIRONMENT_VARIABLES.md) - 환경 변수 설명
- [개발 가이드](./DEVELOPMENT_GUIDE.md) - 개발 환경 설정
- [폴링 시스템 통합 가이드](../packages/bushub-client/backend/docs/POLLING_SYSTEM_INTEGRATION.md) - 폴링 시스템 상세

---

**마지막 업데이트**: 2025-01-XX  
**버전**: 1.0.0

