## 기술 스택 (SmartCity BusHub)

### Frontend

- **React (TypeScript)**: SPA(싱글페이지앱) 기반 UI 개발, 컴포넌트 단위 구조, 타입 안정성 강화
- **React Router**: 페이지/탭/상세 등 라우팅 처리, 인증/권한 기반 라우팅 지원
- **Tailwind CSS**: 유틸리티 CSS 프레임워크, 반응형/다크모드/커스텀 테마 지원
- **shadcn/ui**: 접근성/일관성 높은 모던 UI 컴포넌트, 디자인 시스템 기반
- **Axios**: API 통신, 인터셉터로 인증/에러 처리 일원화
- **Context API/Custom Hooks**: 인증, API키, 알림 등 글로벌 상태 관리
- **Vite**: 빠른 개발 서버, HMR, 빌드 최적화
- **ESLint/Prettier**: 코드 스타일/품질 자동화

### Backend

- **Fastify (TypeScript)**: 고성능 Node.js 웹 프레임워크, 미들웨어/플러그인 구조, 타입 기반 API 설계
- **Mongoose**: MongoDB ODM, 스키마/모델/밸리데이션/인덱스 관리
- **Modbus Serial**: 시리얼 기반 장비 통신, 실시간 제어/모니터링 (SNGIL DDC 컨트롤러 지원)
- **Node Cron**: 주기적 데이터 수집/백업/알림 등 스케줄링
- **JWT/Custom API Key**: 인증/권한 관리, 내부/외부/관리자 구분
- **환경설정/명령 API**: 시스템/네트워크/NTP/SoftAP 등 하드웨어/운영 환경 동적 관리
- **테스트/로깅**: Jest, winston 등 활용(확장 가능)

### Database

- **MongoDB**: NoSQL, 장비/유닛/상태/데이터/유저/API키 등 도메인별 컬렉션 분리
- **Mongoose 스키마**: 컬렉션명 명시, 타입/인덱스/관계/밸리데이션 일관성 유지
- **싱글톤/복수형 구분**: client, system 등은 단수, 나머지는 복수 컬렉션

### DevOps & Infra

- **Docker / Docker Compose**: 개발/운영 환경 일치, 멀티 컨테이너 오케스트레이션
- **Nginx**: 리버스 프록시, 정적 파일 서빙, HTTPS/도메인 관리
- **pnpm**: 모노레포 패키지/워크스페이스 매니저, 빠른 설치/빌드
- **환경변수 관리**: .env, dotenv, Vite/Node 환경 분리

### 아키텍처 특징

- **모노레포 구조**: bushub-client(frontend/backend), smartcity-platform 등 패키지 분리
- **Clean Architecture + Repository Pattern**: 레이어 분리, 의존성 주입, 인터페이스 기반 설계
- **API 일원화**: 내부/외부/관리자 API, action 기반 시스템 명령, RESTful 설계
- **실시간/스케줄링**: 장비 제어, 상태 모니터링, 주기적 데이터 수집 (폴링 시스템)
- **Modbus 통신**: UnifiedModbusService 기반 통합 통신, 우선순위 큐, 재시도 메커니즘
- **보안**: API Key, 인증/권한 분리, CORS, HTTPS(운영)
- **테스트/운영 자동화**: CI/CD, 테스트, 린트, 포맷터 적용(확장 가능)

### 부가 기술/운영 도구/테스트/보안/문서화

- **테스트**: Jest, React Testing Library, supertest (API/유닛/통합 테스트)
- **상태관리**: Context API, useReducer, Custom Hooks 패턴
- **API 문서화**: Swagger(OpenAPI), Redoc, Postman Collection
- **CI/CD**: GitHub Actions, DockerHub, 자동화 배포
- **코드 분석/품질**: ESLint, Prettier, Husky(커밋 훅), lint-staged
- **로깅/모니터링**: winston, pino(Fastify 내부), winston-daily-rotate-file
- **보안**: helmet, rate-limiter, CORS, HTTPS, dotenv, API Key 관리, XSS/CSRF 방어
- **국제화/다국어**: i18next, react-i18next (확장 가능)
- **빌드/배포**: Vite, Webpack, Babel, tsup 등
- **유틸리티**: lodash, dayjs, classnames 등
- **문서화**: Markdown, Mermaid, Storybook, README, 운영/기술 문서
- **기타**: 린트/포맷 자동화, strict 타입, 커밋 메시지 규칙, 브랜치 전략 등

### 하드웨어 통신

- **SNGIL DDC 컨트롤러**: Modbus RTU 프로토콜 기반 실시간 제어/모니터링
- **통합 HVAC 센서**: 온도, 습도, CO2, VOC, PM 센서 데이터 수집
- **디지털 입출력**: DO(Digital Output), DI(Digital Input) 제어
- **계절 설정**: 동절기/하절기 자동 판단 및 월별 설정
- **시리얼 통신**: RS-485 기반 Modbus 통신, CRC-16 검증
