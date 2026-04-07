# 자주 사용하는 명령어 모음

이 문서는 SmartCity 프로젝트에서 자주 사용하는 명령어들을 정리합니다.

---

## 🐳 Docker 명령어

### 개발환경 실행

```bash
# 개발환경 시작 (모노레포 루트)
pnpm install
pnpm dev:backend   # 한 터미널
pnpm dev:frontend  # 다른 터미널
```

MongoDB 등은 로컬 설치 또는 별도 컨테이너로 맞춥니다.

### 프로덕션(현장) 스택

```bash
# 현장 설치(루트): ./scripts/install-field.sh
# 이미 준비된 호스트에서 스택만:
# 모노레포 루트에서
./scripts/lib/start-docker-compose-integrated.sh
# 또는 USB-RS485: ./scripts/lib/start-docker-compose-usb485.sh
```

### Docker 관리

```bash
# 실행 중인 컨테이너 확인
docker ps

# 컨테이너 로그 확인
docker logs <container-name>

# 실시간 로그 확인
docker logs -f <container-name>

# 컨테이너 중지
docker stop <container-name>

# 컨테이너 삭제
docker rm <container-name>

# 모든 컨테이너 중지 및 삭제
docker stop $(docker ps -q) && docker rm $(docker ps -aq)

# Docker 시스템 정리
docker system prune -a
```

### MongoDB 관리

```bash
# MongoDB 컨테이너 실행
docker run -d --name bushub-mongo \
  -p 27017:27017 \
  -v bushub-mongo-data:/data/db \
  mongo:6.0.15

# MongoDB 접속
docker exec -it bushub-mongo mongosh

# MongoDB 중지
docker stop bushub-mongo

# MongoDB 삭제
docker rm bushub-mongo
```

---

## 📦 pnpm 명령어

### 패키지 관리

```bash
# 의존성 설치
pnpm install

# 패키지 추가
pnpm add <package-name>

# 개발 의존성 추가
pnpm add -D <package-name>

# 패키지 제거
pnpm remove <package-name>

# 전역 패키지 설치
pnpm add -g <package-name>
```

### 개발 및 빌드

```bash
# 개발 서버 시작
pnpm dev

# 프로덕션 빌드
pnpm build

# 빌드 미리보기
pnpm preview

# 린팅 (자동 수정)
pnpm lint

# 린팅 검사만
pnpm lint:check

# 타입 검사
pnpm type-check

# 코드 품질 검사 (lint + format + type-check)
pnpm code-quality
```

### 테스트

```bash
# 단위 테스트
pnpm test:unit

# 통합 테스트
pnpm test:integration

# 전체 테스트
pnpm test
```

---

## 🔧 Git 명령어

### 기본 작업

```bash
# 상태 확인
git status

# 변경사항 추가
git add .

# 커밋
git commit -m "feat: 새로운 기능 추가"

# 푸시
git push origin main

# 풀
git pull origin main
```

### 브랜치 관리

```bash
# 브랜치 목록 확인
git branch

# 새 브랜치 생성
git checkout -b feature/new-feature

# 브랜치 전환
git checkout <branch-name>

# 브랜치 삭제
git branch -d <branch-name>

# 원격 브랜치 삭제
git push origin --delete <branch-name>
```

### 태그 관리

```bash
# 태그 생성
git tag v1.0.0

# 태그 푸시
git push origin v1.0.0

# 모든 태그 푸시
git push origin --tags

# 태그 목록 확인
git tag

# 태그 삭제
git tag -d v1.0.0

# 원격 태그 삭제
git push origin --delete v1.0.0
```

### 커밋 히스토리

```bash
# 커밋 히스토리 확인
git log --oneline

# 특정 파일 히스토리
git log --oneline <file-path>

# 차이점 확인
git diff

# 스테이징된 변경사항 확인
git diff --cached
```

---

## 🔍 포트 및 프로세스 관리

### 포트 점유 프로세스 확인 및 종료 (Git Bash)

#### 1. 포트 사용 중인 프로세스(PID) 확인

```bash
netstat -ano | grep ':3000'
```

#### 2. 해당 PID의 프로세스 정보 확인

```bash
cmd /c "tasklist /FI \"PID eq 27268\""
```

#### 3. 해당 프로세스 강제 종료

```bash
cmd /c "taskkill /PID 27268 /F"
```

#### 전체 예시 워크플로우

```bash
# 1. 포트 점유 프로세스 확인
netstat -ano | grep ':3000'

# 2. PID가 27268이라면, 프로세스 정보 확인
cmd /c "tasklist /FI \"PID eq 27268\""

# 3. 프로세스 강제 종료
cmd /c "taskkill /PID 27268 /F"
```

> 💡 참고: Git Bash에서는 Windows 명령어(tasklist, taskkill 등)를 사용할 때 반드시 `cmd /c`를 붙여야 합니다.

---

## 🚀 배포 명령어

### GitHub Actions 배포

```bash
# 태그 생성 및 푸시 (자동 배포 트리거)
git tag v1.0.0
git push origin v1.0.0
```

### 서버 업데이트

```bash
# 프로덕션 서버에서 실행
cd /path/to/deployment
./update.sh
```

---

## 🛠️ 개발 도구 명령어

### Vite 개발 서버

```bash
# 개발 서버 시작
pnpm dev

# 특정 포트로 실행
pnpm dev --port 3000

# 호스트 바인딩
pnpm dev --host
```

### TypeScript 컴파일

```bash
# 타입 검사만
pnpm type-check

# 빌드
pnpm build

# 감시 모드
pnpm build --watch
```

### ESLint 및 Prettier

```bash
# ESLint 자동 수정
pnpm lint

# ESLint 검사만
pnpm lint:check

# Prettier 포맷팅
pnpm format

# Prettier 검사만
pnpm format:check
```

---

## 📋 유용한 단축키 및 팁

### Git Bash 단축키

- `Ctrl + C`: 현재 실행 중인 명령어 중단
- `Ctrl + D`: 세션 종료
- `Tab`: 자동완성
- `↑/↓`: 이전 명령어 히스토리

### Docker 단축키

- `docker ps`: 실행 중인 컨테이너 확인
- `docker logs -f <container>`: 실시간 로그 확인
- `docker exec -it <container> sh`: 컨테이너 내부 접속

### pnpm 단축키

- `pnpm <script>`: 스크립트 실행
- `pnpm add <package>`: 패키지 설치
- `pnpm remove <package>`: 패키지 제거

---

## 🔧 문제 해결

### 포트 충돌 해결

```bash
# 포트 사용 중인 프로세스 확인
netstat -ano | grep ':3000'

# 프로세스 종료
cmd /c "taskkill /PID <PID> /F"
```

### Docker 문제 해결

```bash
# Docker 시스템 정리
docker system prune -a

# 볼륨 정리
docker volume prune

# 캐시 없이 재빌드
docker build --no-cache -t <image-name> .
```

### Git 문제 해결

```bash
# 변경사항 되돌리기
git checkout -- <file>

# 마지막 커밋 되돌리기
git reset --soft HEAD~1

# 원격 저장소와 동기화
git fetch origin
git reset --hard origin/main
```

---

## 📝 문서 내에서 실행하는 방법

### 1. **복사 & 붙여넣기**

- 각 명령어 블록을 복사하여 터미널에 붙여넣기

### 2. **스크립트 파일 생성**

```bash
# 자주 사용하는 명령어를 스크립트로 저장 (예: 루트에서 백엔드만)
echo '#!/bin/bash' > quick-commands.sh
echo 'pnpm dev:backend' >> quick-commands.sh
chmod +x quick-commands.sh
./quick-commands.sh
```

### 3. **별칭(Alias) 설정**

```bash
# .bashrc 또는 .bash_profile에 추가
alias devfe='pnpm dev:frontend'
alias devbe='pnpm dev:backend'
# Docker 스택 로그 예(모노레포 루트): docker compose -f docker-compose.integrated.yml logs -f
```

### 4. **VS Code 터미널 통합**

- VS Code에서 `Ctrl + `` (백틱)으로 터미널 열기
- 명령어 블록을 선택하고 `Ctrl + Shift + P` → "Terminal: Run Selected Text"

### 5. **GitHub Codespaces 활용**

- GitHub Codespaces에서 이 문서를 열고 터미널에서 직접 실행
- 클라우드 환경에서 일관된 개발 환경 제공
