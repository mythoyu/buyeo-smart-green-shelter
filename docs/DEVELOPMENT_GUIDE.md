# 개발 가이드

이 문서는 SmartCity Bushub Client 프로젝트의 개발 환경 설정 및 개발 워크플로우를 설명합니다.

## 📋 목차

- [프로젝트 구조](#프로젝트-구조)
- [개발 환경 설정](#개발-환경-설정)
- [개발 워크플로우](#개발-워크플로우)
- [코딩 스타일](#코딩-스타일)
- [테스트 가이드](#테스트-가이드)
- [디버깅](#디버깅)
- [문제 해결](#문제-해결)

---

## 프로젝트 구조

### 모노레포 구조

```
buyeo-smart-green-shelter/
├── packages/
│   ├── bushub-client/
│   │   ├── backend/          # 백엔드 (Fastify)
│   │   ├── frontend/          # 프론트엔드 (React + Vite)
│   │   ├── network-control-api/  # Network Control API
│   │   └── nginx/            # Nginx 설정
│   └── smartcity-platform/   # SmartCity Platform
├── docs/                     # 문서
├── scripts/                  # 공통 스크립트
└── package.json              # 루트 package.json
```

### 백엔드 구조

```
backend/
├── src/
│   ├── api/                  # API 라우트
│   ├── core/                 # 핵심 비즈니스 로직
│   │   ├── services/         # 서비스 레이어
│   │   ├── repositories/     # Repository 레이어
│   │   └── container/       # 의존성 주입 컨테이너
│   ├── data/                 # 데이터 매핑 및 명령어
│   ├── models/               # MongoDB 스키마
│   ├── config/               # 설정 파일
│   └── utils/                # 유틸리티 함수
├── tests/                    # 테스트 파일
│   ├── unit/                 # 단위 테스트
│   └── integration/         # 통합 테스트
└── package.json
```

### 프론트엔드 구조

```
frontend/
├── src/
│   ├── components/           # React 컴포넌트
│   │   ├── pages/           # 페이지 컴포넌트
│   │   ├── common/          # 공통 컴포넌트
│   │   └── ui/              # UI 컴포넌트 (shadcn/ui)
│   ├── hooks/               # Custom Hooks
│   ├── contexts/            # React Contexts
│   ├── utils/               # 유틸리티 함수
│   └── types/               # TypeScript 타입
├── public/                  # 정적 파일
└── package.json
```

---

## 개발 환경 설정

### 사전 요구사항

- **Node.js**: 18.17.0 이상
- **pnpm**: 10.13.1 이상
- **Docker**: 20.10 이상 (선택사항)
- **Git**: 2.30 이상

### 초기 설정

#### 1. 저장소 클론

```bash
git clone git@github.com:mythoyu/buyeo-smart-green-shelter.git
cd buyeo-smart-green-shelter
```

#### 2. 의존성 설치

```bash
# 루트에서 모든 패키지 설치
pnpm install
```

#### 3. 환경 변수 설정

```bash
# 백엔드 환경 변수
cd packages/bushub-client/backend
cp .env.development.example .env.development
# .env.development 파일 편집

# 프론트엔드 환경 변수
cd ../frontend
cp .env.development.example .env.development
# .env.development 파일 편집
```

#### 4. 개발 서버 실행

**방법 1: Docker Compose 사용 (권장)**

```bash
cd packages/bushub-client
./start-dev.sh
```

**방법 2: 로컬 실행**

```bash
# 백엔드
cd packages/bushub-client/backend
pnpm run dev

# 프론트엔드 (새 터미널)
cd packages/bushub-client/frontend
pnpm run dev
```

### 개발 서버 접속

- **Frontend**: http://localhost:4173
- **Backend API**: http://localhost:3000
- **Nginx 프록시**: http://localhost:8081

---

## 개발 워크플로우

### 1. 브랜치 전략

```bash
# 기능 개발
git checkout -b feature/feature-name

# 버그 수정
git checkout -b fix/bug-name

# 핫픽스
git checkout -b hotfix/issue-name
```

### 2. 개발 프로세스

1. **브랜치 생성**: `git checkout -b feature/new-feature`
2. **코드 작성**: 기능 구현
3. **테스트**: `pnpm test`
4. **린트**: `pnpm lint`
5. **커밋**: `git commit -m "[feat] feature: description"`
6. **푸시**: `git push origin feature/new-feature`
7. **Pull Request**: GitHub에서 PR 생성

### 3. 커밋 메시지 규칙

```
[type] scope: message

타입:
- feat: 새로운 기능
- fix: 버그 수정
- docs: 문서 수정
- style: 코드 스타일 변경
- refactor: 리팩토링
- test: 테스트 추가/수정
- chore: 빌드/설정 변경

예시:
[feat] auth: add login functionality
[fix] modbus: fix connection timeout issue
[docs] readme: update installation guide
```

자세한 내용은 [Git 컨벤션](./GIT_CONVENTION.md)을 참조하세요.

---

## 코딩 스타일

### TypeScript 규칙

- **strict 모드**: 활성화
- **타입 명시**: 모든 함수 매개변수와 반환값에 타입 명시
- **인터페이스 우선**: 타입보다 인터페이스 사용 권장

### Import 순서

```typescript
// 1. Node.js 내장 모듈
import { readFileSync } from 'fs';

// 2. 외부 라이브러리
import fastify from 'fastify';
import mongoose from 'mongoose';

// 3. 내부 모듈
import { UserService } from '../services/UserService';

// 4. 타입 정의
import type { User } from '../types';
```

### 함수 작성 스타일

```typescript
// ✅ 좋은 예 - async/await 사용
const createUser = async (userData: CreateUserDto): Promise<User> => {
  try {
    const user = await userService.create(userData);
    return user;
  } catch (error) {
    logger.error('사용자 생성 실패', { error });
    throw error;
  }
};
```

### React 컴포넌트 스타일

```typescript
// ✅ 함수형 컴포넌트
const DeviceCard: React.FC<DeviceCardProps> = ({ device, onSelect }) => {
  return (
    <div className="device-card">
      <DeviceHeader device={device} />
      <DeviceContent device={device} />
    </div>
  );
};

export default React.memo(DeviceCard);
```

자세한 내용은 각 프로젝트의 `CODING_STYLE.md`를 참조하세요:
- [백엔드 코딩 스타일](../packages/bushub-client/backend/CODING_STYLE.md)
- [프론트엔드 코딩 스타일](../packages/bushub-client/frontend/CODING_STYLE.md)

---

## 테스트 가이드

### 테스트 구조

```
tests/
├── unit/              # 단위 테스트
│   └── services/      # 서비스 단위 테스트
└── integration/      # 통합 테스트
    └── api/          # API 통합 테스트
```

### 테스트 실행

```bash
# 단위 테스트
pnpm test:unit

# 통합 테스트
pnpm test:integration

# 전체 테스트
pnpm test

# 커버리지 확인
pnpm test:coverage
```

### 테스트 작성 예시

#### 단위 테스트

```typescript
// tests/unit/services/UserService.test.ts
import { UserService } from '../../../src/core/services/UserService';
import { MockUserRepository } from '../../mocks/MockUserRepository';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: MockUserRepository;

  beforeEach(() => {
    mockRepository = new MockUserRepository();
    userService = new UserService(mockRepository);
  });

  it('should create a user', async () => {
    const userData = { username: 'test', email: 'test@example.com' };
    const user = await userService.createUser(userData);
    
    expect(user).toBeDefined();
    expect(user.username).toBe('test');
  });
});
```

#### 통합 테스트

```typescript
// tests/integration/api/users.test.ts
import request from 'supertest';
import { app } from '../../../src/index';

describe('Users API', () => {
  it('should create a user', async () => {
    const response = await request(app)
      .post('/api/v1/users')
      .send({ username: 'test', email: 'test@example.com' });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

### 테스트 커버리지

- **목표 커버리지**: 80% 이상
- **중요 로직**: 90% 이상 권장

---

## 디버깅

### 백엔드 디버깅

#### 로그 확인

```bash
# 실시간 로그 확인
tail -f logs/app.log

# 특정 레벨 로그만 확인
tail -f logs/app.log | grep "ERROR"

# Modbus 관련 로그만 확인
tail -f logs/app.log | grep "Modbus"
```

#### VS Code 디버깅

`.vscode/launch.json` 설정:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/packages/bushub-client/backend",
      "env": {
        "NODE_ENV": "development"
      }
    }
  ]
}
```

### 프론트엔드 디버깅

#### React DevTools

- Chrome/Firefox 확장 프로그램 설치
- 컴포넌트 상태 및 Props 확인
- Hook 상태 추적

#### 브라우저 콘솔

```typescript
// 환경 정보 확인
import { logEnvironmentInfo } from './utils/environment';
logEnvironmentInfo();

// 모든 환경 변수 확인
import { debugAllEnvironmentVariables } from './utils/environment';
debugAllEnvironmentVariables();
```

---

## 문제 해결

### 포트 충돌

```bash
# 포트 사용 중인 프로세스 확인
netstat -ano | grep ':3000'

# 프로세스 종료 (Windows)
taskkill /PID <PID> /F

# 프로세스 종료 (Linux)
kill -9 <PID>
```

### 의존성 문제

```bash
# node_modules 삭제 후 재설치
rm -rf node_modules
pnpm install

# 캐시 정리
pnpm store prune
```

### 타입 오류

```bash
# 타입 검사 실행
pnpm type-check

# TypeScript 서버 재시작 (VS Code)
Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### 빌드 오류

```bash
# 빌드 캐시 정리
rm -rf dist
rm -rf node_modules/.vite

# 재빌드
pnpm build
```

---

## 개발 팁

### 1. Hot Module Replacement (HMR)

Vite와 Fastify 모두 HMR을 지원합니다. 코드 변경 시 자동으로 반영됩니다.

### 2. 환경 변수 변경

환경 변수 변경 후 서버를 재시작해야 합니다.

```bash
# Docker Compose 재시작
docker compose -f docker-compose.dev.yml restart backend

# 로컬 실행 재시작
# Ctrl + C로 중지 후 다시 실행
```

### 3. API 테스트

Postman 또는 curl을 사용하여 API를 테스트할 수 있습니다.

```bash
# Health Check
curl http://localhost:3000/api/v1/health

# API 호출 (인증 필요)
curl -H "Authorization: Bearer YOUR_API_KEY" \
  http://localhost:3000/api/v1/devices
```

### 4. 데이터베이스 확인

```bash
# MongoDB 접속
docker exec -it bushub-db mongosh

# 데이터베이스 선택
use bushub_client

# 컬렉션 확인
show collections

# 데이터 조회
db.devices.find().pretty()
```

---

## 관련 문서

- [공통 명령어](./COMMON_COMMANDS.md) - 자주 사용하는 명령어
- [Git 컨벤션](./GIT_CONVENTION.md) - Git 사용 규칙
- [아키텍처 문서](./ARCHITECTURE.md) - 시스템 아키텍처
- [환경 변수 가이드](./ENVIRONMENT_VARIABLES.md) - 환경 변수 설명
- [배포 가이드](./DEPLOYMENT_GUIDE.md) - 배포 방법

---

**마지막 업데이트**: 2025-01-XX  
**버전**: 1.0.0

