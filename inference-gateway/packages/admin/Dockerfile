FROM node:22-alpine AS base
WORKDIR /app
RUN npm i -g pnpm

# Install dependencies (workaround for pnpm workspaces caching)
FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
# Admin package.json might not exist in root yet, but we have it mapped in the project.
COPY packages/gateway/package.json ./packages/gateway/
COPY packages/admin/package.json ./packages/admin/
RUN pnpm install

# Build
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/admin/node_modules ./packages/admin/node_modules
COPY . .
WORKDIR /app/packages/admin
RUN pnpm build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3002
ENV HOSTNAME 0.0.0.0

COPY --from=builder /app/packages/admin/public ./packages/admin/public
COPY --from=builder /app/packages/admin/.next/standalone ./
COPY --from=builder /app/packages/admin/.next/static ./packages/admin/.next/static

EXPOSE 3002

CMD ["node", "packages/admin/server.js"]
