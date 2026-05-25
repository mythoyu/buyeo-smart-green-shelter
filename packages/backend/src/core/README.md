# Core Module - 아키텍처 개선 가이드

## 📁 디렉토리 구조

```
src/core/
├── 📁 repositories/          # 데이터 접근 레이어
│   ├── 📄 IUserRepository.ts     # 사용자 Repository 인터페이스
│   ├── 📄 IClientRepository.ts   # 클라이언트 Repository 인터페이스
│   ├── 📄 MongoUserRepository.ts # MongoDB 사용자 Repository 구현
│   ├── 📄 MongoClientRepository.ts # MongoDB 클라이언트 Repository 구현
│   └── 📄 index.ts               # Repository 모듈 export
├── 📁 services/              # 비즈니스 로직 레이어
│   ├── 📄 IUserService.ts        # 사용자 서비스 인터페이스
│   ├── 📄 IClientService.ts      # 클라이언트 서비스 인터페이스
│   ├── 📄 UserService.ts         # 사용자 서비스 구현
│   ├── 📄 ClientService.ts       # 클라이언트 서비스 구현
│   └── 📄 index.ts               # Service 모듈 export
├── 📁 container/             # 의존성 주입 컨테이너
│   └── 📄 ServiceContainer.ts    # 서비스 컨테이너 (싱글톤)
└── 📄 index.ts               # Core 모듈 메인 export
```

## 🎯 주요 개선 사항

### 1. Repository 패턴 도입

- **인터페이스 기반 설계**: 데이터 접근 로직을 추상화
- **구현체 분리**: MongoDB, PostgreSQL 등 다양한 데이터베이스 지원 가능
- **테스트 용이성**: Mock Repository로 단위 테스트 가능

### 2. 서비스 패턴 통일

- **인터페이스 정의**: 모든 서비스가 동일한 계약을 따름
- **비즈니스 로직 분리**: 데이터 접근과 비즈니스 로직 분리
- **의존성 주입**: Repository를 서비스에 주입

### 3. 의존성 주입 컨테이너

- **싱글톤 패턴**: 애플리케이션 전체에서 하나의 인스턴스
- **자동 의존성 관리**: 서비스 간 의존성 자동 해결
- **확장성**: 새로운 서비스 추가 시 컨테이너에만 등록

## 🚀 사용법

### API 라우터에서 서비스 사용

```typescript
import { ServiceContainer } from '../../../core/container/ServiceContainer';

export default async function usersRoutes(app: FastifyInstance) {
  const serviceContainer = ServiceContainer.getInstance();
  const userService = serviceContainer.getUserService();

  app.get('/users', async (request, reply) => {
    const { users, total } = await userService.getUsers();
    return { success: true, data: users };
  });
}
```

### 새로운 서비스 추가

1. **Repository 인터페이스 정의**

```typescript
// IDeviceRepository.ts
export interface IDeviceRepository {
  findById(id: string): Promise<Device | null>;
  create(data: CreateDeviceDto): Promise<Device>;
  // ...
}
```

2. **Repository 구현체 생성**

```typescript
// MongoDeviceRepository.ts
export class MongoDeviceRepository implements IDeviceRepository {
  // MongoDB 구현
}
```

3. **서비스 인터페이스 정의**

```typescript
// IDeviceService.ts
export interface IDeviceService {
  getDevice(id: string): Promise<DeviceDto>;
  // ...
}
```

4. **서비스 구현체 생성**

```typescript
// DeviceService.ts
export class DeviceService implements IDeviceService {
  constructor(private deviceRepository: IDeviceRepository, private logger?: ILogger) {}
  // ...
}
```

5. **컨테이너에 등록**

```typescript
// ServiceContainer.ts
private initializeServices(): void {
  const deviceRepository = new MongoDeviceRepository();
  const deviceService = new DeviceService(deviceRepository);

  this.services.set('deviceRepository', deviceRepository);
  this.services.set('deviceService', deviceService);
}
```

## 🔧 테스트

### Mock Repository 사용

```typescript
// MockUserRepository.ts
export class MockUserRepository implements IUserRepository {
  private users: User[] = [];

  async findById(id: string): Promise<User | null> {
    return this.users.find((u) => u._id === id) || null;
  }
  // ...
}

// 테스트에서 사용
const mockUserRepository = new MockUserRepository();
const userService = new UserService(mockUserRepository);
```

## 📊 장점

1. **유지보수성**: 인터페이스 기반 설계로 코드 변경 시 영향 범위 최소화
2. **테스트 용이성**: Mock 객체로 단위 테스트 가능
3. **확장성**: 새로운 데이터베이스나 서비스 추가 시 기존 코드 수정 없이 확장
4. **의존성 관리**: 명확한 의존성 주입으로 결합도 낮춤
5. **코드 재사용**: 인터페이스를 통한 다형성 활용

## API 날짜·시각 (KST)

HTTP 요청·응답에서 **시각 필드**는 `YYYY-MM-DDTHH:mm:ss` 형식으로 내려가며, 값은 **Asia/Seoul 벽시계**입니다(오프셋·`Z` 없음). 달력일만 쓸 때는 `YYYY-MM-DD`(KST 그날). 구현은 [`shared/utils/kstDateTime.ts`](../../shared/utils/kstDateTime.ts)를 사용합니다.

## 🔄 마이그레이션 가이드

기존 코드를 새로운 아키텍처로 마이그레이션하는 방법:

1. **단계적 마이그레이션**: 한 번에 모든 코드를 변경하지 말고 단계적으로 진행
2. **기존 코드 유지**: 새로운 아키텍처와 기존 코드를 병행 운영
3. **테스트 커버리지**: 마이그레이션 전후 테스트로 기능 검증
4. **문서화**: 변경된 API와 사용법을 문서화
