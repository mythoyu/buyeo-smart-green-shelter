# 릴리즈 가이드

## 릴리즈 프로세스

```bash
# 루트에서
./scripts/release.sh 1.0.0
# 또는
pnpm run release 1.0.0
```

1. 워킹트리 clean 확인
2. frontend/backend 빌드 테스트
3. 버전 bump (`package.json`, `packages/*`)
4. 커밋·푸시·태그 `vX.Y.Z`

## GitHub Actions (`release-on-tag.yml`)

- **infra-docker-images.tar** (mongo, nginx, node) Release 첨부
- 현장: USB `docker-images/` 또는 Release asset → `install-field install`
- 앱 이미지: `install-field post-ports` 에서 소스 `docker build`

자세한 현장 절차: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## 릴리즈 전 체크리스트

- [ ] `git status` clean
- [ ] `pnpm -C bushub-client/backend build:production`
- [ ] `pnpm -C bushub-client/frontend build`
- [ ] `pnpm lint` (선택)
