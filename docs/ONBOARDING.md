# 로컬 온보딩

모노레포 루트에서 작업합니다.

## 1. 사전 요구

- Node.js 20+
- pnpm 10+
- MongoDB 6 (로컬 Docker 권장)

로컬 dev 포트(`.env.development`): 백엔드 **13031**, 프론트 **15461**.

## 2. 환경 파일

```bash
cp .env.development.example .env.development
# MONGO_ROOT_PASSWORD, JWT_SECRET 등 편집
```

Windows RS-485: `cp .env.windows.example .env.windows` → `MODBUS_PORT=COMx`, **baud 9600**.

## 3. MongoDB

```bash
./packages/start-mongodb-dev.sh
# 중지: ./packages/stop-mongodb-dev.sh
```

## 4. 앱 실행

```bash
pnpm install
pnpm dev:backend    # http://localhost:13031
pnpm dev:frontend   # http://localhost:15461
```

## 5. 현장·운영 도구 (Ubuntu)

| 경로 | 용도 |
|------|------|
| `scripts/install-field.sh` | 현장 3단계 설치 |
| `packages/tools/bushub-*.sh` | compose 기동·헬스·로그 등 |
| `packages/scripts/` | systemd·운영 스크립트 |

자세한 배포: [DEPLOYMENT.md](DEPLOYMENT.md)
