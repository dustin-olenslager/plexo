# Changelog

All notable changes to Plexo are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added
- Monorepo scaffold: pnpm workspaces, Turborepo, TypeScript strict
- Database schema: 21 tables via Drizzle ORM (packages/db)
- Auth.js v5: credentials + GitHub OAuth providers
- Agent runtime interfaces with stub implementations (packages/agent)
- Plugin SDK types with stub runtime (packages/sdk)
- Task queue operations (packages/queue)
- UI component foundation with shadcn/ui (packages/ui)
- Express 5 API server with health endpoint (apps/api)
- Next.js 15 dashboard with auth flow (apps/web)
- Docker Compose stack: Postgres 16 + pgvector, Valkey, Caddy
- AGENTS.md, .env.example, documentation stubs
