# syntax=docker/dockerfile:1.7

############################################
# 1. deps: 依存関係インストール用
############################################
FROM oven/bun:1.1-alpine AS deps
WORKDIR /app

# bun.lock があるならそれを使い、ロック準拠でインストール
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile


############################################
# 2. builder: Next.js を standalone でビルド
############################################
FROM oven/bun:1.1-alpine AS builder
WORKDIR /app

# node_modules を再利用
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN bun run build


############################################
# 3. runner: 軽量な実行イメージ
############################################
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# 非 root ユーザーで実行
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

# standalone 出力一式と静的アセットだけをコピー
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static    ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public          ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
