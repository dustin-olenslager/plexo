<div align="center">

# Plexo

**Your AI agent, running 24/7, on your own server.**

Plexo handles routine work autonomously — infrastructure, code, research, ops — and interrupts only when a real decision is needed. It communicates through channels you already use: Telegram, Slack, Discord. It learns from every task it completes.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/self--hosted-Docker-2496ED?logo=docker&logoColor=white)](docker/compose.yml)

[**Managed hosting →**](https://getplexo.com) · [Docs](docs/) · [Plugin SDK](docs/plugin-sdk.md) · [Architecture](docs/architecture.md)

</div>

---

## The idea

Most AI tools are chat interfaces. You ask, they answer, you do the work.

Plexo inverts that. You describe what you want. The agent plans it, executes it step by step, verifies each step actually worked, and tells you when it's done. Destructive actions — deletions, deployments, schema migrations — pause for an explicit confirmation code before proceeding. Everything that runs is logged, costed, and scored.

The agent doesn't just respond to you. It watches your GitHub repos for failing builds and open issues, picks up tasks you drop in a message, and proposes what to work on next. Every week it analyzes its own performance and proposes targeted improvements — shadow tested before they ever touch production.

You stay in control. The agent does the work.

---

## What it runs

| | |
|---|---|
| **Tasks** | Coding, deployment, research, ops — planned, executed, and verified end to end |
| **Sprints** | Decompose a goal into parallel tasks across isolated Docker workers, merged automatically |
| **Scanners** | GitHub issues, failing builds, message drops — turned into tasks with confidence gating |
| **Memory** | Hybrid vector + BM25 search over every past task. Cross-project pattern learning. |
| **Connections** | GitHub, Linear, Vercel, Stripe, Hetzner, Notion, PostHog, and more — each unlocks tools the agent can call |
| **Plugins** | New tools, dashboard cards, channels, crons, MCP servers — all isolated, all hot-swappable |
| **RSI** | Weekly anomaly detection → proposals → shadow testing → regression-guarded deploy |

---

## Self-host in under 20 minutes

```bash
git clone https://github.com/dustin-olenslager/plexo
cd plexo
cp .env.example .env   # fill in 5 values (see below)
docker compose -f docker/compose.yml up -d
```

Then open your domain. A browser wizard handles the rest: admin account, API key, first channel, agent personality. No terminal after that.

<details>
<summary><strong>The 5 values you need</strong></summary>

```bash
# openssl rand -hex 32
POSTGRES_PASSWORD=

# Your domain, with https://
PUBLIC_URL=https://plexo.yourdomain.com
PUBLIC_DOMAIN=plexo.yourdomain.com

# openssl rand -hex 64
SESSION_SECRET=

# console.anthropic.com
ANTHROPIC_API_KEY=
```

Everything else in `.env.example` is optional (OpenAI/Gemini fallbacks, GitHub OAuth, sprint worker count, cost ceiling).

</details>

---

## Execution protocol

Every task follows five steps. No shortcuts.

```
PLAN → the agent writes a structured plan and sends it to you before touching anything
CONFIRM → any destructive step (deletion, deploy, schema change) pauses for a 6-char code
EXECUTE → steps run in sequence, max 4 tool calls before a mandatory verification pause
VERIFY → post-condition checked after each step, not just the exit code
COMPLETE → quality scored, work ledger written, memory entry created, you get notified
```

Safety limits are constants in source — not configuration, not overridable:

```ts
export const SAFETY_LIMITS = {
  maxConsecutiveToolCalls: 4,
  maxWallClockMs: 2 * 60 * 60 * 1000,
  noForcePush: true,
  noDeletionWithoutConfirmation: true,
  noCredentialsInLogs: true,
} as const
```

---

## Sprint engine

Send one message. Get a full software sprint.

```
/sprint "Add OAuth login to the dashboard"

→ Planner reads repo context (file tree, recent commits, SPEC.md, AGENTS.md)
→ Emits discovery tasks — learning the codebase before speculating
→ Workers clone repo, execute tasks in parallel (up to 5 concurrent containers)
→ Merge queue serializes completed branches with conflict-fix injection
→ Reconciler sweeps build health every 5 minutes, auto-injecting fix tasks
→ Planner iterates until the goal is met
→ Post-sprint: FEATURES.json diff + DECISIONS.md draft sent for your review
```

Workers are fully isolated containers with a hard 40-tool-call limit. They know nothing about the project except what the planner writes in their task description.

---

## Stack

```
Next.js 15 (App Router) · Express 5 · PostgreSQL 16 + pgvector
Drizzle ORM · Auth.js v5 · Redis (Valkey) · Caddy · Docker
TypeScript strict · pnpm workspaces
```

```
plexo/
├── apps/web            Next.js dashboard
├── apps/api            Express API + SSE event bus
├── packages/agent      Core execution runtime
├── packages/sdk        Plugin API (stable, semver-versioned)
├── packages/db         Drizzle schema + migrations
├── packages/queue      Task queue operations
├── packages/ui         Shared components (shadcn/ui)
├── plugins/core/       First-party plugins
│   ├── github-ops      GitHub tools + Pending PRs card
│   ├── telegram-channel
│   ├── slack-channel
│   ├── devops-skill    Docker + Hetzner tools
│   ├── cron-manager    Visual cron + CRUD tools
│   ├── product-skill   PM-mode context
│   └── research-skill  Evidence-based research mode
└── docker/
    ├── compose.yml
    └── worker/         Sprint worker image + harness
```

---

## Plugin system

Plugins run in isolated Node.js worker threads. A plugin crash never reaches the core process.

```ts
import { sdk } from '@plexo/sdk'

// Add a tool the agent can call
sdk.agent.registerTool('stripe_list_customers', 'List Stripe customers', schema, async (input) => {
  const key = sdk.settings.get('secret_key')
  const res = await fetch('https://api.stripe.com/v1/customers', {
    headers: { Authorization: `Bearer ${key}` },
  })
  return { success: true, output: await res.json() }
})

// Inject context into every agent session
sdk.agent.injectContext(`## Stripe\nWhen billing questions arise, check Stripe first.`)

// Register a dashboard card
sdk.dashboard.registerCard('revenue', { title: 'Revenue', defaultSize: { w: 4, h: 3 }, ... })
```

Plugin types: `skill` · `channel` · `tool` · `card` · `mcp-server` · `theme`

Third-party plugins publish to `registry.plexo.dev`. Marketplace connections appear in the connections browser automatically after install.

---

## Development

```bash
pnpm dev               # all apps, watch mode
pnpm test              # unit tests (Vitest, TDD)
pnpm test:integration  # DB + queue tests (requires Docker)
pnpm test:e2e          # Playwright (requires running stack)
pnpm typecheck         # tsc --noEmit across all packages
pnpm db:migrate        # run pending migrations
pnpm db:rollback       # back one migration
```

Read [`AGENTS.md`](AGENTS.md) before starting. Read [`docs/architecture.md`](docs/architecture.md) before touching package boundaries.

---

## Health

```
GET /health  →  200 ok  |  503 degraded
```

```json
{
  "status": "ok",
  "services": {
    "postgres": { "ok": true, "latencyMs": 2 },
    "redis":    { "ok": true, "latencyMs": 1 },
    "anthropic": { "ok": true, "latencyMs": 289 }
  },
  "version": "0.1.0",
  "uptime": 86400
}
```

---

## Managed hosting

Don't want to run your own server? [**getplexo.com**](https://getplexo.com) — fully isolated instance per account, no Docker required, managed AI credits available. Each tenant gets a separate Postgres, separate Redis, separate containers. Isolation is architectural, not policy.

---

## License

MIT — [LICENSE](LICENSE)
