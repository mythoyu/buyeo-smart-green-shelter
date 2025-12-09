# Git 커밋 메시지 컨벤션 가이드

## 📝 개요

이 문서는 SmartCity 프로젝트에서 사용하는 Git 커밋 메시지 작성 규칙을 정의합니다. 일관된 커밋 메시지를 통해 프로젝트 히스토리를 명확하게 관리하고 팀 협업을 원활하게 합니다.

## 🏗️ 기본 구조

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 구성 요소

- **Type**: 커밋의 성격을 나타내는 타입
- **Scope**: 변경사항의 범위 (선택사항)
- **Subject**: 변경사항에 대한 간단한 설명
- **Body**: 변경사항에 대한 상세한 설명 (선택사항)
- **Footer**: 이슈 번호, 브레이킹 체인지 등 (선택사항)

## 🔧 Type (타입)

| 타입        | 설명                          | 예시                                    |
| ----------- | ----------------------------- | --------------------------------------- |
| `feat`      | 새로운 기능 추가              | `feat: 로그인 기능 추가`                |
| `fix`       | 버그 수정                     | `fix: 로그인 시 오류 수정`              |
| `docs`      | 문서 수정                     | `docs: README 업데이트`                 |
| `style`     | 코드 포맷팅, 세미콜론 누락 등 | `style: 코드 포맷팅 수정`               |
| `refactor`  | 코드 리팩토링                 | `refactor: 로그인 로직 개선`            |
| `test`      | 테스트 코드 추가/수정         | `test: 로그인 테스트 추가`              |
| `chore`     | 빌드 프로세스, 도구 변경      | `chore: 패키지 의존성 업데이트`         |
| `perf`      | 성능 개선                     | `perf: 로그인 속도 개선`                |
| `ci`        | CI/CD 설정 변경               | `ci: GitHub Actions 워크플로우 추가`    |
| `build`     | 빌드 시스템 변경              | `build: Webpack 설정 변경`              |
| `revert`    | 이전 커밋 되돌리기            | `revert: feat: 로그인 기능 추가`        |
| `structure` | 폴더/파일 구조 변경           | `structure: Repository 인터페이스 분리` |

## 🎯 Scope (범위) - 선택사항

SmartCity 프로젝트에서 사용하는 주요 범위들:

| 범위      | 설명           | 예시                                             |
| --------- | -------------- | ------------------------------------------------ |
| `auth`    | 인증 관련      | `feat(auth): 소셜 로그인 추가`                   |
| `ui`      | UI 컴포넌트    | `fix(ui): 버튼 스타일 수정`                      |
| `api`     | API 관련       | `feat(api): 사용자 정보 조회 API 추가`           |
| `db`      | 데이터베이스   | `fix(db): 사용자 테이블 스키마 수정`             |
| `map`     | 지도 관련      | `feat(map): 마커 클릭 이벤트 추가`               |
| `devices` | 디바이스 관리  | `fix(devices): 디바이스 상태 업데이트 오류 수정` |
| `bushub`  | 버스 허브 관련 | `feat(bushub): 실시간 버스 정보 표시`            |
| `shared`  | 공통 컴포넌트  | `refactor(shared): 공통 UI 컴포넌트 분리`        |
| `deploy`  | 배포 관련      | `chore(deploy): Docker 설정 업데이트`            |
| `core`    | 핵심 아키텍처  | `structure(core): Repository 인터페이스 분리`    |

## 📝 실제 예시

### 🚀 기능 추가

```bash
feat(auth): 소셜 로그인 (Google, GitHub) 기능 추가

- Google OAuth2 로그인 구현
- GitHub OAuth 로그인 구현
- 소셜 로그인 후 사용자 정보 저장 로직 추가
- 로그인 상태 관리 훅 추가

Closes #123
```

### 🐛 버그 수정

```bash
fix(ui): 로그인 폼에서 비밀번호 입력 시 오류 수정

- 비밀번호 입력 필드에서 특수문자 입력 시 발생하는 오류 해결
- 입력값 검증 로직 개선
- 에러 메시지 표시 방식 개선

Fixes #456
```

### 🔧 리팩토링

```bash
refactor(map): 지도 컴포넌트 구조 개선

- MapPage 컴포넌트를 더 작은 단위로 분리
- 마커 관리 로직을 별도 훅으로 분리
- 성능 최적화를 위한 메모이제이션 적용
- 타입 안정성 개선

BREAKING CHANGE: MapPage 컴포넌트 props 구조 변경
```

### 📚 문서 업데이트

```bash
docs: 프로젝트 설정 가이드 업데이트

- 개발 환경 설정 방법 추가
- 배포 프로세스 문서화
- API 문서 링크 추가
- 트러블슈팅 가이드 추가
```

## 🎨 SmartCity 프로젝트 특화 예시

### 🗺️ 지도 관련

```bash
feat(map): MapLibre GL JS 지도 렌더링 구현

- MapLibre GL JS 라이브러리 통합
- 벡터 타일 서버 연결
- 버스 허브 마커 및 팝업 추가
- 지도 컨트롤 (줌, 팬) 구현
- 지도 스타일 커스터마이징 지원
```

### 🚌 버스 허브 관련

```bash
feat(bushub): 버스 정류장 실시간 정보 표시

- 실시간 버스 도착 정보 API 연동
- 정류장별 버스 노선 정보 표시
- 도착 예정 시간 카운트다운 기능
- 버스 위치 실시간 추적
- 알림 기능 추가
```

### 🎨 UI/UX 관련

```bash
feat(ui): Tailwind CSS 디자인 시스템 구축

- spacing과 maxWidth 분리 관리
- 공통 컴포넌트 라이브러리 구축
- 다크모드 지원 추가
- 반응형 디자인 적용
- 접근성 개선
```

### 🔧 개발 도구

```bash
chore: 개발 환경 설정 개선

- pnpm 워크스페이스 설정
- TypeScript 설정 최적화
- ESLint 및 Prettier 설정 추가
- Git LFS 설정 (대용량 파일 관리)
- Husky를 통한 커밋 메시지 검증
```

### 🏗️ 폴더 구조 변경

```bash
structure(core): Repository 인터페이스 분리

- Repository 인터페이스를 interfaces/ 폴더로 분리
- Service 인터페이스를 interfaces/ 폴더로 분리
- 구현체와 인터페이스 구조 명확화
- import 경로 업데이트
- 코드 구조 개선으로 가독성 향상

BREAKING CHANGE: Repository 인터페이스 import 경로 변경
```

```bash
structure(shared): 공통 컴포넌트 폴더 구조 개선

- components/common/ 폴더 생성
- UI 컴포넌트들을 기능별로 분류
- utils/ 폴더에 헬퍼 함수들 정리
- hooks/ 폴더에 커스텀 훅들 분리
- 타입 정의를 types/ 폴더로 이동
```

### 🐳 배포 관련

```bash
chore(deploy): Docker 컨테이너화 완료

- Frontend Docker 이미지 빌드 설정
- Backend Docker 이미지 빌드 설정
- Docker Compose 설정 추가
- Nginx 리버스 프록시 설정
- 환경변수 관리 개선
```

## 📋 커밋 메시지 작성 규칙

### ✅ 해야 할 것

1. **제목은 50자 이내로 작성**
2. **제목 첫 글자는 소문자로 시작**
3. **제목 끝에 마침표 사용하지 않음**
4. **명령형 어조 사용** (add, fix, update, remove 등)
5. **한국어와 영어 혼용 가능** (팀 컨벤션에 따라)
6. **변경사항의 이유를 명확히 설명**
7. **구조 변경 시 BREAKING CHANGE 명시**

### ❌ 하지 말아야 할 것

1. **너무 긴 제목 사용**
2. **모호한 표현 사용** (fix bug, update code 등)
3. **개인적인 의견이나 감정 표현**
4. **불필요한 세부사항 나열**
5. **구조 변경 시 영향도 설명 생략**

## 🔗 유용한 도구들

### Commitizen

대화형 커밋 메시지 생성 도구

```bash
# 설치
pnpm add -D commitizen cz-conventional-changelog

# package.json에 스크립트 추가
{
  "scripts": {
    "commit": "cz"
  }
}
```

### Conventional Changelog

자동 CHANGELOG 생성

```bash
# 설치
pnpm add -D conventional-changelog-cli

# CHANGELOG 생성
npx conventional-changelog -p angular -i CHANGELOG.md -s
```

### Husky

Git hooks를 통한 커밋 메시지 검증

```bash
# 설치
pnpm add -D husky @commitlint/cli @commitlint/config-conventional

# 설정
npx husky install
npx husky add .husky/commit-msg 'npx --no -- commitlint --edit $1'
```

## 📊 커밋 히스토리 예시

```
feat(map): MapLibre GL JS 지도 렌더링 구현
fix(ui): 로그인 폼 스타일 오류 수정
docs: API 문서 업데이트
refactor(shared): 공통 컴포넌트 분리
test(auth): 로그인 기능 테스트 추가
chore: 패키지 의존성 업데이트
perf(map): 지도 렌더링 성능 개선
ci: GitHub Actions 워크플로우 추가
build: Webpack 설정 최적화
structure(core): Repository 인터페이스 분리
revert: feat: 실험적 기능 제거
```

## 🎯 팀 협업 가이드

1. **커밋 전 코드 리뷰**: 모든 변경사항은 팀원의 리뷰를 받습니다
2. **작은 단위로 커밋**: 한 번에 하나의 논리적 변경사항만 커밋합니다
3. **명확한 설명**: 변경사항의 이유와 영향을 명확히 설명합니다
4. **이슈 연결**: 관련 이슈 번호를 커밋 메시지에 포함합니다
5. **구조 변경 시 팀 공유**: 폴더 구조 변경은 팀원들과 사전 논의합니다

## 📞 문의

커밋 메시지 컨벤션에 대한 질문이나 제안사항이 있으시면 팀 리더에게 문의해주세요.

---

**마지막 업데이트**: 2024년 12월
**버전**: 1.0.0
