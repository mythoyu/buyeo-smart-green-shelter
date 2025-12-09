# 백엔드 코딩 스타일 가이드

## 📋 **일반 원칙**

### 1. **일관성 유지**

- 프로젝트 전체에서 동일한 스타일 적용
- 팀원 간 코드 리뷰 시 스타일 통일성 확인

### 2. **가독성 우선**

- 코드의 의도가 명확히 드러나도록 작성
- 적절한 주석과 문서화

### 3. **유지보수성**

- 재사용 가능한 서비스 설계
- 명확한 네이밍 컨벤션

## 🎨 **코딩 스타일 규칙**

### **Import 순서**

```typescript
// 1. Node.js 내장 모듈
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';

// 2. 외부 라이브러리
import fastify from 'fastify';
import mongoose from 'mongoose';
import pino from 'pino';

// 3. 내부 모듈
import { UserService } from '../services/UserService';
import { DatabaseService } from '../services/DatabaseService';

// 4. 타입 정의
import type { User, UserDocument } from '../models/User';
```

### **함수 작성 스타일**

```typescript
// ✅ 좋은 예 - async/await 사용
const createUser = async (userData: CreateUserDto): Promise<User> => {
  try {
    const user = await UserService.create(userData);
    await logger.info('사용자 생성됨', { userId: user.id });
    return user;
  } catch (error) {
    await logger.error('사용자 생성 실패', { error, userData });
    throw error;
  }
};

// ❌ 나쁜 예 - 콜백 사용
const createUser = (userData: CreateUserDto, callback: (error: Error, user: User) => void) => {
  UserService.create(userData, (error, user) => {
    if (error) {
      logger.error('사용자 생성 실패', error);
      callback(error, null);
    } else {
      logger.info('사용자 생성됨', user);
      callback(null, user);
    }
  });
};
```

### **서비스 클래스 작성 스타일**

```typescript
// ✅ 좋은 예 - 의존성 주입
class UserService {
  constructor(private readonly userRepository: IUserRepository, private readonly logger: ILogger) {}

  async createUser(userData: CreateUserDto): Promise<User> {
    const user = await this.userRepository.create(userData);
    await this.logger.info('사용자 생성됨', { userId: user.id });
    return user;
  }
}

// ✅ 인터페이스 정의
interface IUserRepository {
  create(userData: CreateUserDto): Promise<User>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: Partial<User>): Promise<User>;
  delete(id: string): Promise<void>;
}
```

### **타입 정의**

```typescript
// ✅ 명확한 인터페이스 정의
interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role: UserRole;
}

// ✅ 유니온 타입 사용
type UserRole = 'admin' | 'user' | 'guest';

// ✅ 제네릭 활용
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: Date;
}

// ✅ Mongoose 스키마 타입
interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
```

### **상수 정의**

```typescript
// ✅ 상수는 대문자로
const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  GUEST: 'guest',
} as const;

// ✅ 환경변수 타입 정의
const CONFIG = {
  PORT: process.env.PORT || 3000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret',
} as const;
```

### **에러 처리**

```typescript
// ✅ try-catch 사용
const handleUserCreation = async (userData: CreateUserDto): Promise<ApiResponse<User>> => {
  try {
    const user = await userService.create(userData);
    return {
      success: true,
      data: user,
      message: '사용자가 성공적으로 생성되었습니다.',
      timestamp: new Date(),
    };
  } catch (error) {
    logger.error('사용자 생성 실패', { error, userData });
    return {
      success: false,
      data: null,
      message: '사용자 생성에 실패했습니다.',
      timestamp: new Date(),
    };
  }
};

// ✅ 커스텀 에러 클래스
class ValidationError extends Error {
  constructor(message: string, public field: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### **Fastify 라우트 작성**

```typescript
// ✅ 라우트 핸들러
const createUserHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const { body } = request;

  try {
    const user = await userService.create(body);
    return reply.code(201).send({
      success: true,
      data: user,
      message: '사용자가 생성되었습니다.',
    });
  } catch (error) {
    logger.error('사용자 생성 실패', { error, body });
    return reply.code(500).send({
      success: false,
      message: '서버 오류가 발생했습니다.',
    });
  }
};

// ✅ 스키마 정의
const createUserSchema = {
  body: {
    type: 'object',
    required: ['username', 'email', 'password'],
    properties: {
      username: { type: 'string', minLength: 3 },
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
    },
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' },
        message: { type: 'string' },
      },
    },
  },
};
```

## 🔧 **도구 설정**

### **Prettier 설정**

- 자동 포맷팅 적용
- 팀원 간 동일한 스타일 유지

### **ESLint 규칙**

- 코드 품질 향상
- 잠재적 버그 방지

### **TypeScript 설정**

- 엄격한 타입 체크
- 타입 안전성 보장

## 📝 **주석 작성**

```typescript
/**
 * 사용자를 생성합니다.
 * @param userData - 생성할 사용자 데이터
 * @returns 생성된 사용자 정보
 * @throws ValidationError - 유효하지 않은 데이터인 경우
 * @throws DatabaseError - 데이터베이스 오류인 경우
 */
const createUser = async (userData: CreateUserDto): Promise<User> => {
  // 입력 데이터 검증
  if (!userData.email || !userData.password) {
    throw new ValidationError('이메일과 비밀번호는 필수입니다.', 'validation');
  }

  // 비밀번호 해시화
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  // 사용자 생성
  const user = await userRepository.create({
    ...userData,
    password: hashedPassword,
  });

  return user;
};
```

## 🚀 **성능 최적화**

### **데이터베이스 최적화**

```typescript
// ✅ 인덱스 활용
const findUserByEmail = async (email: string): Promise<User | null> => {
  return await User.findOne({ email }).select('+password');
};

// ✅ 배치 처리
const createManyUsers = async (users: CreateUserDto[]): Promise<User[]> => {
  return await User.insertMany(users);
};

// ✅ 프로젝션 활용
const getUserSummary = async (id: string): Promise<UserSummary> => {
  return await User.findById(id).select('username email role createdAt');
};
```

### **로깅 최적화**

```typescript
// ✅ 구조화된 로깅
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
    },
  },
});

// ✅ 로그 레벨 활용
logger.info('서버 시작됨', { port: CONFIG.PORT, env: process.env.NODE_ENV });
logger.error('데이터베이스 연결 실패', { error: error.message });
logger.debug('쿼리 실행', { query: 'SELECT * FROM users' });
```

## 📋 **체크리스트**

- [ ] Import 순서 준수
- [ ] 일관된 네이밍 컨벤션
- [ ] 적절한 타입 정의
- [ ] 에러 처리 구현
- [ ] 로깅 구현
- [ ] 주석 및 문서화
- [ ] 테스트 코드 작성
- [ ] 코드 리뷰 완료

## 🔄 **자동화**

### **Pre-commit Hook**

```bash
# package.json에 추가
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.ts": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

이 가이드를 따라 일관된 백엔드 코드 스타일을 유지하세요!
