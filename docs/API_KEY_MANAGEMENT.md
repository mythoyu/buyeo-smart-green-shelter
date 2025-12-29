# API 키 관리 시스템

## 개요

API 키 관리 시스템은 외부 API와 내부 API를 구분하여 회사별로 관리할 수 있는 종합적인 시스템입니다. 이 시스템은 보안, 모니터링, 사용량 추적 기능을 제공합니다.

## 주요 기능

### 1. 회사 관리

- 회사 정보 등록/수정/삭제
- 회사별 API 키 통계
- 회사 상태 관리 (활성/비활성)

### 2. API 키 관리

- 회사별 API 키 생성/수정/삭제
- 외부용/내부용 API 키 구분
- 권한 기반 접근 제어
- 만료일 설정 및 자동 만료 처리
- Rate Limiting 설정

### 3. 사용량 모니터링

- API 키별 사용량 통계
- 실시간 요청 로그
- 성공/실패 요청 분석
- 응답 시간 모니터링

### 4. 보안 기능

- API 키 인증 미들웨어
- 권한 검증
- Rate Limiting
- 사용 로그 기록

## 데이터베이스 스키마

### Company (회사)

```typescript
interface Company {
  _id: string;
  name: string; // 회사명
  contactPerson: string; // 담당자
  email: string; // 이메일
  phone: string; // 전화번호
  address: string; // 주소
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}
```

### ApiKey (API 키)

```typescript
interface ApiKey {
  _id: string;
  key: string; // API 키 (암호화된 형태)
  companyId: ObjectId; // 회사 ID
  name: string; // API 키 이름
  type: 'external' | 'internal'; // 외부용/내부용
  description: string; // 설명
  permissions: string[]; // 권한 목록
  status: 'active' | 'inactive' | 'expired';
  createdBy: string; // 생성자
  expiresAt?: Date; // 만료일
  lastUsedAt?: Date; // 마지막 사용일
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  usageStats: {
    totalRequests: number;
    lastMonthRequests: number;
    lastWeekRequests: number;
  };
  createdAt: Date;
  updatedAt: Date;
}
```

### ApiUsageLog (API 사용 로그)

```typescript
interface ApiUsageLog {
  _id: string;
  apiKeyId: ObjectId; // API 키 ID
  companyId: ObjectId; // 회사 ID
  endpoint: string; // 엔드포인트
  method: string; // HTTP 메서드
  statusCode: number; // 응답 상태 코드
  responseTime: number; // 응답 시간 (ms)
  ipAddress: string; // 요청 IP
  userAgent: string; // User Agent
  requestBody?: any; // 요청 본문
  responseBody?: any; // 응답 본문
  errorMessage?: string; // 오류 메시지
  timestamp: Date; // 요청 시간
}
```

## API 엔드포인트

### 회사 관리 API

#### GET /api/admin/companies

회사 목록 조회

```bash
GET /api/admin/companies?status=active&search=부여&page=1&limit=10
```

#### POST /api/admin/companies

회사 생성

```bash
POST /api/admin/companies
Content-Type: application/json

{
    "name": "부여군청",
    "contactPerson": "김철수",
    "email": "kim@buyeo.go.kr",
    "phone": "041-123-4567",
    "address": "충청남도 부여군 부여읍"
}
```

#### GET /api/admin/companies/:id

회사 상세 조회

```bash
GET /api/admin/companies/507f1f77bcf86cd799439011
```

#### PUT /api/admin/companies/:id

회사 정보 수정

```bash
PUT /api/admin/companies/507f1f77bcf86cd799439011
Content-Type: application/json

{
    "name": "부여군청 (수정)",
    "contactPerson": "김철수",
    "email": "kim@buyeo.go.kr",
    "phone": "041-123-4567",
    "address": "충청남도 부여군 부여읍"
}
```

#### DELETE /api/admin/companies/:id

회사 삭제

```bash
DELETE /api/admin/companies/507f1f77bcf86cd799439011
```

### API 키 관리 API

#### GET /api/admin/api-keys

API 키 목록 조회

```bash
GET /api/admin/api-keys?companyId=507f1f77bcf86cd799439011&type=external&status=active&page=1&limit=10
```

#### POST /api/admin/api-keys

API 키 생성

```bash
POST /api/admin/api-keys
Content-Type: application/json

{
    "companyId": "507f1f77bcf86cd799439011",
    "name": "부여군청 외부 API",
    "type": "external",
    "description": "부여군청 외부 시스템 연동용 API 키",
    "permissions": ["read:devices", "read:logs"],
    "createdBy": "admin",
    "expiresAt": "2024-12-31T23:59:59.000Z",
    "rateLimit": {
        "requestsPerMinute": 100,
        "requestsPerHour": 1000
    }
}
```

#### GET /api/admin/api-keys/:id

API 키 상세 조회

```bash
GET /api/admin/api-keys/507f1f77bcf86cd799439011
```

#### PUT /api/admin/api-keys/:id

API 키 수정

```bash
PUT /api/admin/api-keys/507f1f77bcf86cd799439011
Content-Type: application/json

{
    "name": "부여군청 외부 API (수정)",
    "description": "수정된 설명",
    "permissions": ["read:devices", "read:logs", "write:devices"],
    "status": "active",
    "rateLimit": {
        "requestsPerMinute": 150,
        "requestsPerHour": 1500
    }
}
```

#### DELETE /api/admin/api-keys/:id

API 키 삭제

```bash
DELETE /api/admin/api-keys/507f1f77bcf86cd799439011
```

#### PATCH /api/admin/api-keys/:id/toggle

API 키 상태 토글

```bash
PATCH /api/admin/api-keys/507f1f77bcf86cd799439011/toggle
```

#### GET /api/admin/api-keys/:id/stats

API 키 사용량 통계

```bash
GET /api/admin/api-keys/507f1f77bcf86cd799439011/stats?period=month
```

#### GET /api/admin/companies/:id/api-key-stats

회사별 API 키 통계

```bash
GET /api/admin/companies/507f1f77bcf86cd799439011/api-key-stats
```

### 외부 API (인증 필요)

#### GET /api/external/devices

장비 정보 조회 (API 키 인증 필요)

```bash
GET /api/external/devices
Authorization: Bearer YOUR_API_KEY
```

## 권한 시스템

### 권한 종류

- `read:devices`: 장비 조회 권한
- `write:devices`: 장비 수정 권한
- `read:logs`: 로그 조회 권한
- `write:logs`: 로그 수정 권한
- `admin:system`: 시스템 관리 권한

### API 키 타입별 권한

- **외부용 (external)**: 제한된 권한 (read:devices, read:logs)
- **내부용 (internal)**: 모든 권한 가능

## Rate Limiting

### 기본 설정

- 분당 요청: 100회
- 시간당 요청: 1,000회

### 설정 방법

API 키 생성/수정 시 rateLimit 필드로 설정:

```json
{
  "rateLimit": {
    "requestsPerMinute": 100,
    "requestsPerHour": 1000
  }
}
```

## 보안 고려사항

### 1. API 키 보안

- API 키는 암호화하여 저장
- 만료일 설정으로 자동 만료 처리
- 사용하지 않는 API 키는 비활성화

### 2. 접근 제어

- 회사별 API 키 분리
- 권한 기반 접근 제어
- IP 기반 접근 제한 (선택사항)

### 3. 모니터링

- 모든 API 요청 로그 기록
- 비정상적인 사용 패턴 감지
- 실시간 사용량 모니터링

## 프론트엔드 사용법

### 1. API 키 관리 페이지 접근

```
http://localhost:3000/api-keys
```

### 2. 회사 관리

- 회사 추가/수정/삭제
- 회사별 API 키 통계 확인

### 3. API 키 관리

- API 키 생성/수정/삭제
- 권한 설정
- Rate Limiting 설정
- 만료일 설정

### 4. 사용량 모니터링

- API 키별 사용량 통계
- 실시간 요청 로그
- 성공/실패 요청 분석

## 샘플 데이터

시스템 초기화 시 다음 샘플 데이터가 자동으로 생성됩니다:

### 샘플 회사

1. 부여군청
2. 부여군 교통과
3. 부여군 환경과
4. 부여군 도시계획과
5. 부여군 정보통신과

### 샘플 API 키

1. 부여군청 외부 API (external)
2. 부여군청 내부 API (internal)
3. 교통과 외부 API (external)
4. 환경과 외부 API (external)
5. 도시계획과 내부 API (internal)

## 배포 및 운영

### 1. 환경 변수 설정

```bash
# MongoDB 연결 문자열
MONGODB_URI=mongodb://localhost:27017/bushub

# API 키 암호화 키
API_KEY_SECRET=your-secret-key

# 로그 레벨
LOG_LEVEL=info
```

### 2. 데이터베이스 초기화

```bash
# 개발 환경
pnpm run dev

# 프로덕션 환경
pnpm run build
pnpm start
```

### 3. 정기 정리 작업

- 만료된 API 키 자동 정리
- 오래된 사용 로그 자동 삭제 (90일)
- 사용량 통계 업데이트

## 문제 해결

### 1. API 키 인증 실패

- API 키가 올바른지 확인
- API 키 상태가 active인지 확인
- 만료일이 지나지 않았는지 확인
- 회사 상태가 active인지 확인

### 2. Rate Limiting 오류

- 분당/시간당 요청 한도 확인
- API 키의 rateLimit 설정 확인

### 3. 권한 오류

- API 키의 permissions 확인
- 요청하는 리소스에 대한 권한 확인

### 4. 데이터베이스 연결 오류

- MongoDB 서버 상태 확인
- 연결 문자열 확인
- 네트워크 연결 확인

## 향후 개선 사항

1. **고급 보안 기능**

   - IP 화이트리스트/블랙리스트
   - 2FA 인증
   - API 키 순환

2. **모니터링 강화**

   - 실시간 알림
   - 대시보드 개선
   - 리포트 생성

3. **성능 최적화**

   - 캐싱 시스템
   - 데이터베이스 인덱스 최적화
   - 로그 압축

4. **사용자 경험 개선**
   - API 키 생성 마법사
   - 드래그 앤 드롭 권한 설정
   - 실시간 사용량 차트
