# 🚀 릴리즈 가이드

## 📋 릴리즈 프로세스

### **1. 릴리즈 스크립트 실행**

#### **방법 1: 직접 실행**

```bash
# 루트 디렉토리에서
./scripts/release.sh <version>

# 예시
./scripts/release.sh 1.0.0
```

#### **방법 2: pnpm 사용**

```bash
# 루트 디렉토리에서
pnpm run release <version>

# 예시
pnpm run release 1.0.0
```

### **2. 릴리즈 스크립트 동작 과정**

1. **안전장치 확인**: 커밋되지 않은 변경사항이 있는지 확인
2. **중복 태그 확인**: 이미 존재하는 태그인지 확인
3. **버전 업데이트**:
   - 루트 `package.json` 버전 업데이트
   - 하위 패키지 버전 동기화 (`bushub-client/frontend`, `bushub-client/backend`)
4. **커밋 & 푸시**: 변경사항을 커밋하고 푸시
5. **태그 생성**: `v<version>` 태그 생성 및 푸시

### **3. 릴리즈 후 자동 실행되는 GitHub Actions**

#### **`deploy-ghcr.yml`**

- **트리거**: 태그 푸시 시 자동 실행
- **동작**:
  - `bushub-frontend:v<version>` 이미지 빌드 및 GHCR 푸시
  - `bushub-backend:v<version>` 이미지 빌드 및 GHCR 푸시

#### **`mirror-images.yml`**

- **트리거**: 수동 실행
- **동작**: 외부 이미지들 (`mongo:6.0.15`, `nginx:1.28.0`) GHCR에 미러링

## 🔧 릴리즈 전 체크리스트

### **필수 확인사항**

- [ ] 모든 변경사항이 커밋되어 있는지 확인
- [ ] 테스트가 통과하는지 확인
- [ ] 린트 오류가 없는지 확인
- [ ] 버전 번호가 올바른지 확인

### **명령어로 확인**

```bash
# 변경사항 확인
git status

# 테스트 실행
pnpm test

# 린트 확인
pnpm lint

# 버전 확인
cat package.json | grep version
```

## 📝 릴리즈 예시

### **v1.0.0 릴리즈**

```bash
# 1. 릴리즈 스크립트 실행
./scripts/release.sh 1.0.0

# 2. GitHub Actions 확인
# - deploy-ghcr.yml 자동 실행
# - 이미지 빌드 및 GHCR 푸시 확인

# 3. 오프라인 패키지 생성 (Windows PC에서)
# update-windows.bat 실행
```

### **v1.0.1 릴리즈**

```bash
# 1. 릴리즈 스크립트 실행
./scripts/release.sh 1.0.1

# 2. GitHub Actions 확인
# - deploy-ghcr.yml 자동 실행
# - 이미지 빌드 및 GHCR 푸시 확인

# 3. 오프라인 패키지 생성 (Windows PC에서)
# update-windows.bat 실행
```

## 🚨 문제 해결

### **커밋되지 않은 변경사항이 있을 때**

```bash
# 변경사항 확인
git status

# 변경사항 커밋
git add .
git commit -m "feat: 변경사항 설명"

# 릴리즈 재시도
./scripts/release.sh 1.0.0
```

### **이미 존재하는 태그일 때**

```bash
# 기존 태그 확인
git tag -l

# 기존 태그 삭제 (필요한 경우)
git tag -d v1.0.0
git push origin :refs/tags/v1.0.0

# 릴리즈 재시도
./scripts/release.sh 1.0.0
```

### **GitHub Actions 실패 시**

1. **GitHub Actions 탭**에서 실패한 워크플로우 확인
2. **로그 확인**하여 구체적인 오류 파악
3. **수정 후 재시도** 또는 **수동 실행**

## 📋 버전 관리 규칙

### **시맨틱 버저닝 (Semantic Versioning)**

- **MAJOR.MINOR.PATCH** 형식
- **MAJOR**: 호환되지 않는 API 변경
- **MINOR**: 하위 호환되는 기능 추가
- **PATCH**: 하위 호환되는 버그 수정

### **예시**

- `1.0.0`: 첫 번째 안정 버전
- `1.0.1`: 버그 수정
- `1.1.0`: 새로운 기능 추가
- `2.0.0`: 호환되지 않는 변경

## 🔗 관련 링크

- **GitHub Actions**: https://github.com/mythoyu/buyeo-smart-green-shelter/actions
- **GHCR**: https://github.com/mythoyu/buyeo-smart-green-shelter/pkgs
- **릴리즈 태그**: https://github.com/mythoyu/buyeo-smart-green-shelter/tags

## 📞 지원

문제가 발생하면 다음을 확인하세요:

1. **GitHub Actions 로그** 확인
2. **Docker 이미지 빌드** 상태 확인
3. **GHCR 푸시** 성공 여부 확인
4. **오프라인 패키지 생성** 테스트

---

**마지막 업데이트**: 2025-01-09
