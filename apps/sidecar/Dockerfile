FROM node:22-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/sidecar/package.json ./apps/sidecar/

RUN pnpm install --frozen-lockfile

COPY packages/eslint-config/ ./packages/eslint-config/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY apps/sidecar/ ./apps/sidecar/

WORKDIR /app/apps/sidecar
RUN pnpm run build


FROM node:22-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 hono

COPY --from=builder /app/apps/sidecar/dist/index.cjs ./
COPY --from=builder /app/apps/sidecar/package.json ./

USER hono
EXPOSE 3000

CMD ["node", "index.cjs"]