FROM node:18

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# shared와 frontend를 명확히 복사
COPY shared ./shared
COPY bushub-client/frontend ./frontend

WORKDIR /app/frontend

# pnpm install (shared는 workspace로 자동 설치됨)
RUN pnpm install --frozen-lockfile
RUN pnpm build

CMD ["pnpm", "start"] 