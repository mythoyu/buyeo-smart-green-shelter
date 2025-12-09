# Multi-stage Dockerfile for Network Control API
FROM node:18 AS base

WORKDIR /app

# Use corepack to enable pnpm and pin version to lockfile's expectation
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Copy workspace configuration files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy only network-control-api package files
COPY packages/bushub-client/network-control-api/package.json ./packages/bushub-client/network-control-api/

# Install only network-control-api dependencies
RUN pnpm install --frozen-lockfile --filter @bushub-client/network-control-api

# Copy network-control-api source code
COPY packages/bushub-client/network-control-api ./packages/bushub-client/network-control-api

# Move to network-control-api directory
WORKDIR /app/packages/bushub-client/network-control-api

# Development stage
FROM base AS development

# curl 설치 (헬스체크용)
RUN apk add --no-cache curl

# 🔄 개발환경 환경변수 설정
ENV NODE_ENV=development \
    PORT=3001 \
    HOST=0.0.0.0 \
    LOG_LEVEL=debug

EXPOSE 3001

# 개발 모드 실행
CMD ["pnpm", "run", "dev"]

# Production stage
FROM base AS production

# 🔄 프로덕션 환경변수 설정
ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info

# Build the application for production
RUN pnpm run build:production

EXPOSE 3001

# 프로덕션 모드 실행
CMD ["pnpm", "run", "start:production"]
