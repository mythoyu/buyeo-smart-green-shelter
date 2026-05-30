# Multi-stage Dockerfile for Frontend
FROM node:20-alpine AS base

WORKDIR /app

# Use corepack to enable pnpm and pin version to lockfile's expectation
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Copy workspace configuration files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy only frontend package files
COPY packages/frontend/package.json ./packages/frontend/
COPY packages/frontend/pnpm-lock.yaml ./packages/frontend/

# Install only frontend dependencies (workspace root에서 실행)
RUN pnpm install --frozen-lockfile --filter @bushub-client/frontend

# Copy frontend source code
COPY packages/frontend ./packages/frontend

# Move to frontend directory
WORKDIR /app/packages/frontend

# Development stage
FROM base AS development

# curl 설치 (헬스체크용)
RUN apk add --no-cache curl

# 🔄 개발환경 환경변수 설정
ENV NODE_ENV=development \
    VITE_IS_LOCAL=false

EXPOSE 4173

# 개발 모드 실행
CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]

# Production stage
FROM base AS production

# 현장 Docker: nginx :80 /api·/ws 프록시 (same-origin, Vite build 시 번들에 포함)
ENV NODE_ENV=production \
    VITE_IS_LOCAL=false \
    VITE_API_BASE_URL=/api/v1 \
    VITE_WS_URL=/ws

# Build the application for production
RUN pnpm run build:production

# Install nginx for production
RUN apk add --no-cache nginx && \
    mkdir -p /var/log/nginx && \
    mkdir -p /var/lib/nginx/tmp && \
    mkdir -p /usr/share/nginx/html && \
    chown -R nginx:nginx /var/log/nginx /var/lib/nginx /usr/share/nginx/html

EXPOSE 8080

# 프로덕션 모드 실행 (nginx로 정적 파일 서빙)
CMD ["sh", "-c", "cp -r dist/* /usr/share/nginx/html/ && nginx -c /app/packages/frontend/nginx.conf -g 'daemon off;'"]