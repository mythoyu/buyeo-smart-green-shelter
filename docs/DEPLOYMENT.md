# 배포 가이드

**Bushub Client** 모노레포 배포 요약. 일상 명령은 [COMMON_COMMANDS.md](COMMON_COMMANDS.md).

## 개요

| 구분 | 방식 |
|------|------|
| 로컬 개발 | `pnpm dev` + `.env.development` + Mongo |
| CI | 태그 `v*.*.*` → Release + **`infra-docker-images.tar`** (mongo/nginx/node) |
| 현장 | `install-field` → **infra tar 로드** + **소스로 앱 이미지 빌드** |

- **infra** (mongo, nginx, node): Release asset 또는 USB `docker-images/` — [packages/docker-images/README.md](../packages/docker-images/README.md)
- **앱** (bushub-backend/frontend): 현장 `rebuild-docker-images.sh` (GHCR 없음)

## 배포 흐름

```bash
# 릴리즈 (루트) — [RELEASE.md](../RELEASE.md)
./scripts/release.sh 1.2.0
# → 태그 푸시 후 Actions가 Release 생성
```

## 1. 로컬 개발

```bash
pnpm install
cp .env.development.example .env.development   # MONGO_*, JWT, PORT 등
./packages/start-mongodb-dev.sh                # 로컬 Mongo (usb485 compose db)
# Windows RS-485: cp .env.windows.example .env.windows  # COM, baud 9600
pnpm dev:backend    # :13031
pnpm dev:frontend   # :15461
```

## 2. Docker Compose (선택)

| 파일 | 용도 |
|------|------|
| `docker-compose.integrated.yml` | 내장 RS-485 (`/dev/ttyS0`, baud **9600**) |
| `docker-compose.usb485.yml` | USB RS-485 (`/dev/bushub-controller`, baud **9600**) |
| `docker-compose.common.people-counter.yml` | 피플카운터 공통 |

```bash
./scripts/lib/rebuild-and-up-integrated.sh
```

Mongo/JWT 는 `docker-compose.*.yml` 에 고정 (`.env.prod` 와 동기). `PEOPLE_COUNTER_COUNT` 는 ports 마법사 → `.env` → compose export.

compose YAML 에 `build:` 없음. 앱 이미지는 `rebuild-docker-images.sh` 선행 필요.

## 3. 현장 설치 (install-field, 오프라인)

> **OS**: Ubuntu Linux 전용 (`scripts/lib/field-guard.sh`).

### USB 번들 (권장)

```text
bushub-deploy/
├── buyeo-smart-green-shelter/   # git checkout vX.Y.Z
└── docker-images/
    └── infra-docker-images.tar
```

모노레포 **루트**에서:

```bash
./scripts/install-field.sh install
# 재부팅·재로그인 후
./scripts/install-field.sh ports
git fetch origin --tags && git checkout vX.Y.Z
export GITHUB_REF_NAME=vX.Y.Z
./scripts/install-field.sh post-ports
./scripts/install-field.sh set-ntp
./scripts/install-field.sh status-ntp
```

- **install**: infra `docker load` (+ `--download-if-missing` 로 Release)
- **post-ports**: backend/frontend 만 빌드
- 피플카운터: [PEOPLE_COUNTER_FIELD_RUNBOOK.md](PEOPLE_COUNTER_FIELD_RUNBOOK.md)

## 4. GitHub Release (CI)

| 항목 | 내용 |
|------|------|
| 워크플로 | `.github/workflows/release-on-tag.yml` |
| 트리거 | `v*.*.*` 태그 push |
| 산출물 | Release 노트 + **`infra-docker-images.tar`** |
| 수동 빌드 | Actions → `Build infra docker images (manual)` |

롤백: 이전 태그 `git checkout` → `./scripts/install-field.sh post-ports`

## 5. 체크리스트 (현장)

- [ ] `git checkout` 릴리스 태그
- [ ] `install-field` / `post-ports` 성공 (Mongo/JWT 는 compose YAML — `.env.prod` 참고)
- [ ] `MODBUS_BAUD_RATE=9600` (usb485·integrated 공통)
- [ ] `MODBUS_MOCK_ENABLED=false` (실장비)
