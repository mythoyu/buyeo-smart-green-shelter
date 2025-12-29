# Multi-stage Dockerfile for Backend
FROM node:18-alpine AS base

WORKDIR /app

# Ubuntu에서 NetworkManager와 systemd는 기본적으로 설치되어 있음
# 추가 패키지가 필요한 경우 여기에 설치
# Use corepack to enable pnpm, and pin workspace version to avoid lockfile mismatch
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Copy workspace configuration files
COPY pnpm-workspace.yaml ./
COPY package.json ./
COPY pnpm-lock.yaml ./

# Copy only backend package files
COPY packages/bushub-client/backend/package.json ./packages/bushub-client/backend/
COPY packages/bushub-client/backend/pnpm-lock.yaml ./packages/bushub-client/backend/

# Install only backend dependencies (workspace root에서 실행)
RUN pnpm install --frozen-lockfile --filter @bushub-client/backend

# Copy backend source code
COPY packages/bushub-client/backend ./packages/bushub-client/backend

# Development stage
FROM base AS development

# curl 설치 (헬스체크용) - Ubuntu 이미지에 이미 포함되어 있음
# RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# 🔄 개발환경 환경변수 설정
ENV NODE_ENV=development \
    APP_MODE=development \
    PORT=3000 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info \
    FORCE_DB_INIT=false \
    MODBUS_MOCK_ENABLED=false \
    MODBUS_BAUD_RATE=9600 \
    MODBUS_PORT=/dev/ttyS0 \
    MODBUS_TIMEOUT=1000 \
    MODBUS_RETRIES=1 \
    MODBUS_DATA_BITS=8 \
    MODBUS_STOP_BITS=1 \
    MODBUS_PARITY=none \
    HVAC_EXTERNAL_CONTROL_ENABLED=false \
    HVAC_MANUFACTURER= \
    HVAC_MODBUS_PORT=/dev/ttyS1 \
    HVAC_MODBUS_BAUD_RATE=9600 \
    HVAC_MODBUS_PARITY=even \
    IS_LOCAL=false \
    USERS_CONFIG_PATH=./src/config/users.json \
    CORS_ORIGIN=true \
    # 🔐 민감 정보 (최고 보안 등급)
    JWT_SECRET=youjobs-secret-key-2025 \
    MONGODB_URI=mongodb://localhost:27017 \
    DB_NAME=bushub_client \
    # MongoDB 연결 설정 (개발환경 - 빠른 실패)
    MONGODB_MAX_RETRIES=3 \
    MONGODB_BASE_DELAY_MS=1000 \
    MONGODB_MAX_DELAY_MS=10000 \
    MONGODB_MONITORING_INTERVAL_MS=5000 \
    MONGODB_MAX_RECONNECT_ATTEMPTS=5 \
    MONGODB_RECONNECT_DELAY_MS=3000 \
    MONGODB_SERVER_SELECTION_TIMEOUT_MS=3000 \
    MONGODB_SOCKET_TIMEOUT_MS=30000 \
    MONGODB_MAX_POOL_SIZE=20 \
    # 외부 서비스 설정
    SUPERIOR_SERVER_URL=http://10.20.60.145:9202/api/v1/ping

# Create log directory with correct permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Move to backend directory
WORKDIR /app/packages/bushub-client/backend

EXPOSE 3000

# 개발 모드 실행
CMD ["pnpm", "run", "dev"]

# Production stage
FROM base AS production

# 필요한 시스템 패키지 설치
RUN apk add --no-cache iproute2 dbus

# 🔄 프로덕션 환경변수 설정
ENV NODE_ENV=production \
    APP_MODE=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    LOG_LEVEL=info \
    FORCE_DB_INIT=false \
    MODBUS_MOCK_ENABLED=false \
    MODBUS_BAUD_RATE=9600 \
    MODBUS_PORT=/dev/ttyS0 \
    MODBUS_TIMEOUT=1000 \
    MODBUS_RETRIES=1 \
    MODBUS_DATA_BITS=8 \
    MODBUS_STOP_BITS=1 \
    MODBUS_PARITY=none \
    HVAC_EXTERNAL_CONTROL_ENABLED=false \
    HVAC_MANUFACTURER= \
    HVAC_MODBUS_PORT=/dev/ttyS1 \
    HVAC_MODBUS_BAUD_RATE=9600 \
    HVAC_MODBUS_PARITY=even \
    IS_LOCAL=false \
    USERS_CONFIG_PATH=./src/config/users.json \
    CORS_ORIGIN=true \
    # 🔐 민감 정보 (최고 보안 등급)
    JWT_SECRET=youjobs-secret-key-2025 \
    MONGODB_URI=mongodb://localhost:27017 \
    DB_NAME=bushub_client \
    # MongoDB 연결 설정 (운영환경 - 안정성 우선)
    MONGODB_MAX_RETRIES=5 \
    MONGODB_BASE_DELAY_MS=2000 \
    MONGODB_MAX_DELAY_MS=30000 \
    MONGODB_MONITORING_INTERVAL_MS=10000 \
    MONGODB_MAX_RECONNECT_ATTEMPTS=10 \
    MONGODB_RECONNECT_DELAY_MS=5000 \
    MONGODB_SERVER_SELECTION_TIMEOUT_MS=5000 \
    MONGODB_SOCKET_TIMEOUT_MS=45000 \
    MONGODB_MAX_POOL_SIZE=20 \
    # 외부 서비스 설정
    SUPERIOR_SERVER_URL=http://10.20.60.145:9202/api/v1/ping

# Create log directory with correct permissions
RUN mkdir -p /app/logs && chown -R node:node /app/logs

# Move to backend directory
WORKDIR /app/packages/bushub-client/backend

# Build the application for production
RUN pnpm run build:production

EXPOSE 3000

# 프로덕션 모드 실행
CMD ["pnpm", "run", "start:production"]