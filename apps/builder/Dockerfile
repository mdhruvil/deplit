FROM node:22-alpine AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
COPY packages/eslint-config/package.json ./packages/eslint-config/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY apps/builder/package.json ./apps/builder/

RUN pnpm install --frozen-lockfile

COPY packages/eslint-config/ ./packages/eslint-config/
COPY packages/typescript-config/ ./packages/typescript-config/
COPY apps/builder/ ./apps/builder/

WORKDIR /app/apps/builder
RUN pnpm run build


FROM node:22-alpine
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

RUN pnpm install -g vercel@41.4.1

WORKDIR /app
ENV REPO_URL=""
ENV BRANCH="main"
ENV OUTPUT_DIR="/deplit/out"
ENV WORK_DIR="/deplit/workspace"
ENV LOG_FILE_DEST="/deplit/logs/build.log"
ENV NODE_ENV="production"
ENV PROJECT_ID="default-project"

RUN mkdir -p ${OUTPUT_DIR} ${WORK_DIR} /deplit/logs && \
    chmod -R 777 ${OUTPUT_DIR} ${WORK_DIR} /deplit/logs

COPY --from=builder /app/apps/builder/dist/index.cjs ./
COPY --from=builder /app/apps/builder/package.json ./

CMD ["node", "index.cjs"]