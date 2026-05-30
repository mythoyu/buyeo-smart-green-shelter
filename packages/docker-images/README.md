# docker-images

현장 오프라인용 **infra** Docker 이미지 tar (mongo, nginx, node).

앱 이미지(`bushub-backend`, `bushub-frontend`)는 현장에서 소스로 빌드합니다 (`post-ports`).

## 파일

| 파일 | 내용 |
|------|------|
| `infra-docker-images.tar` | `mongo:6.0.15`, `nginx:1.28.0`, `node:20-alpine` |

GitHub Release 태그에 동일 이름으로 첨부됩니다 (`.github/workflows/release-on-tag.yml`).

## USB 배치 (소스와 분리)

```text
bushub-deploy/
├── buyeo-smart-green-shelter/   ← git checkout / zip
└── docker-images/
    └── infra-docker-images.tar
```

`install-field.sh install` 이 `../docker-images` → `packages/docker-images` 순으로 `docker load` 합니다.

## 수동 로드

```bash
docker load -i infra-docker-images.tar
# 또는
REPO_ROOT=/path/to/repo ./scripts/lib/load-docker-images.sh
```

## CI에서 로컬 생성 (수동)

```bash
docker pull mongo:6.0.15 nginx:1.28.0 node:20-alpine
docker save -o packages/docker-images/infra-docker-images.tar mongo:6.0.15 nginx:1.28.0 node:20-alpine
```
