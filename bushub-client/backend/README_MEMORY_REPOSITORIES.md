# 인메모리 Repository 사용 가이드

## 개요

이 프로젝트는 성능 향상을 위해 인메모리 Repository 구조를 지원합니다. 환경 변수를 통해 MongoDB 전용, 메모리 전용, 하이브리드 모드를 선택할 수 있습니다.

## 지원 모드

### 1. MongoDB 전용 모드 (기본)

- 모든 데이터를 MongoDB에 저장
- 기본 설정으로 사용됨

### 2. 메모리 전용 모드

- 모든 데이터를 메모리에 저장
- 빠른 응답 속도, 서버 재시작 시 데이터 손실

### 3. 하이브리드 모드

- 메모리와 MongoDB를 함께 사용
- 메모리에서 먼저 조회, 없으면 MongoDB에서 조회 후 메모리에 캐시
- 데이터 안정성과 성능을 모두 확보

## 환경 변수 설정

### 메모리 전용 모드 활성화

```bash
export USE_MEMORY_REPOSITORIES=true
```

### 하이브리드 모드 활성화

```bash
export USE_HYBRID_REPOSITORIES=true
```

### Docker 환경에서 설정

```yaml
# docker-compose.yaml
environment:
  - USE_MEMORY_REPOSITORIES=true
  # 또는
  - USE_HYBRID_REPOSITORIES=true
```

## 구현된 인메모리 Repository

### 1. MemoryClientRepository

- 클라이언트 정보 관리
- 실시간 상태 업데이트 지원

### 2. MemoryUserRepository

- 사용자 정보 관리
- 이메일, 사용자명 인덱싱 지원

### 3. MemoryNotificationRepository

- 알림 데이터 관리
- TTL 기반 자동 정리

### 4. MemorySystemRepository (제거됨)

- ~~시스템 설정 관리~~
- ~~단일 인스턴스 패턴~~
- **MongoDB 전용 모드로 단순화됨**

### 5. MemoryModbusRepository (기존)

- Modbus 연결 상태 관리
- 통신 히스토리 저장

### 6. MemoryWebSocketRepository (기존)

- WebSocket 클라이언트 관리
- 실시간 연결 상태 추적

## 하이브리드 Repository

### 1. HybridClientRepository

- 메모리와 MongoDB 이중 쓰기
- 캐시 미스 시 자동 로드

### 2. HybridUserRepository

- 사용자 데이터 하이브리드 관리
- 인덱스 기반 빠른 조회

## 성능 모니터링

### MemoryMetrics 클래스

```typescript
import { MemoryMetrics } from '../utils/MemoryMetrics';

const metrics = MemoryMetrics.getInstance();
const clientMetrics = metrics.getMetric('MemoryClientRepository');
console.log('Hit Rate:', clientMetrics?.hitRate);
console.log('Cache Size:', clientMetrics?.size);
```

### 메트릭 정보

- `hits`: 캐시 히트 횟수
- `misses`: 캐시 미스 횟수
- `hitRate`: 캐시 히트율
- `size`: 현재 캐시 크기
- `lastUpdated`: 마지막 업데이트 시간

## 사용 예시

### 1. MongoDB 전용 모드 (기본)

```bash
# 환경 변수 설정 없음 (기본값)
# 애플리케이션 시작
npm start
```

### 2. 메모리 전용 모드 (제거됨)

```bash
# ~~환경 변수 설정~~
# ~~export USE_MEMORY_REPOSITORIES=true~~
# ~~애플리케이션 시작~~
# ~~npm start~~
# **더 이상 지원되지 않음**
```

### 3. 하이브리드 모드 (제거됨)

```bash
# ~~환경 변수 설정~~
# ~~export USE_HYBRID_REPOSITORIES=true~~
# ~~애플리케이션 시작~~
# ~~npm start~~
# **더 이상 지원되지 않음**
```

### 3. 코드에서 확인

```typescript
import { ServiceContainer } from '../core/container/ServiceContainer';

const container = ServiceContainer.getInstance();
const clientService = container.getClientService();

// 메모리에서 빠르게 조회
const client = await clientService.getClientInfo('client_001');
```

## 주의사항

### 1. 메모리 사용량

- 메모리 전용 모드는 데이터가 많을 경우 메모리 사용량이 증가할 수 있습니다.
- 정기적인 모니터링이 필요합니다.

### 2. 데이터 지속성

- 메모리 전용 모드에서는 서버 재시작 시 데이터가 손실됩니다.
- 중요한 데이터는 하이브리드 모드를 사용하세요.

### 3. 동시성

- 현재 구현은 단일 프로세스 환경을 가정합니다.
- 다중 프로세스 환경에서는 추가적인 동기화 메커니즘이 필요합니다.

## 성능 최적화

### 1. 캐시 크기 조정

```typescript
// LRUCache 사용 예시
import { LRUCache } from '../utils/LRUCache';

const cache = new LRUCache<Client>(1000); // 최대 1000개 항목
```

### 2. TTL 설정

```typescript
// 알림 데이터 자동 정리
await notificationRepository.deleteOldNotifications(30); // 30일 이전 데이터 삭제
```

### 3. 인덱스 활용

```typescript
// 사용자 조회 시 인덱스 활용
const userByEmail = await userRepository.findByEmail('user@example.com');
const userByUsername = await userRepository.findByUsername('username');
```

## 문제 해결

### 1. 메모리 부족

- 캐시 크기를 줄이거나 LRU 정책을 조정
- 불필요한 데이터 정리

### 2. 데이터 불일치

- 하이브리드 모드 사용
- 정기적인 데이터 동기화

### 3. 성능 저하

- 메트릭을 통한 캐시 히트율 확인
- 캐시 크기 및 정책 조정
