<div align="center">

# Plexo

**An AI agent that works for you, 24/7, on your own server.**

Plexo runs a persistent agent that handles real work autonomously — and interrupts only when a real decision is needed. It communicates through channels you already use: Telegram, Slack, Discord. It learns from every task it completes.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](https://nextjs.org)
[![Docker](https://img.shields.io/badge/self--hosted-Docker-2496ED?logo=docker&logoColor=white)](docker/compose.yml)

[**Managed hosting →**](https://getplexo.com) · [Docs](docs/) · [Plugin SDK](docs/plugin-sdk.md) · [Architecture](docs/architecture.md)

</div>

---

## Not just for developers

Most AI tools are chat interfaces. You ask. They answer. You still do the work.

Plexo inverts that. You describe what you want — in a Telegram message, a Slack thread, or the dashboard — and the agent handles it end to end. It plans the work, executes it step by step, verifies each step actually worked, and tells you when it's done.

**This is for anyone who wants AI doing real work for them.**

A founder monitoring Stripe and generating weekly reports, an operator managing deployments and alerts, a researcher tracking topics and synthesizing sources, a developer running parallel code sprints — these are equally first-class use cases. The UX, language, and defaults treat them all the same.

---

## What it handles

| | |
|---|---|
| **Development** | Write code, open PRs, run parallel code sprints, manage deployments, fix failing builds automatically |
| **Business ops** | Monitor Stripe, PostHog, Linear — generate reports, track KPIs, send scheduled updates |
| **Research** | Sourced answers, topic tracking, document synthesis, structured option comparisons |
| **Online tasks** | Web interaction, form automation, data collection, API-driven workflows |
| **Personal automation** | Recurring scheduled tasks, monitoring with notifications, custom workflows via plugins |

---

## Self-host in under 20 minutes

The hard constraint: a semi-technical user with no engineering background must be able to self-host Plexo in under 20 minutes. Every design decision is evaluated against this.

```bash
git clone https://github.com/dustin-olenslager/plexo
cd plexo
cp .env.example .env   # fill in 5 values
docker compose -f docker/compose.yml up -d
```

Open your domain. A browser wizard handles the rest — admin account, AI key, messaging channel, agent personality, launch. No terminal after that.

<details>
<summary><strong>The 5 values you need</strong></summary>

```bash
# openssl rand -hex 32
POSTGRES_PASSWORD=

PUBLIC_URL=https://plexo.yourdomain.com
PUBLIC_DOMAIN=plexo.yourdomain.com

# openssl rand -hex 64
SESSION_SECRET=

# console.anthropic.com
ANTHROPIC_API_KEY=
```

Everything else in `.env.example` is optional — OpenAI/Gemini fallbacks, GitHub OAuth, sprint worker count, weekly cost ceiling.

</details>

---

## Execution protocol

Every task follows five steps without exception.

```
PLAN     → structured plan written and sent to you before anything runs
CONFIRM  → destructive steps (deletions, deploys, schema changes) pause for a 6-char code
EXECUTE  → steps run in sequence, max 4 tool calls before a mandatory verification pause
VERIFY   → post-condition checked after each step — not just the exit code
COMPLETE → quality scored, work ledger written, memory entry created, you get notified
```

Safety limits are constants in source — not configuration, not overridable at runtime:

```ts
export const SAFETY_LIMITS = {
  maxConsecutiveToolCalls: 4,
  maxWallClockMs: 2 * 60 * 60 * 1000,  // 2 hours hard ceiling
  noForcePush: true,
  noDeletionWithoutConfirmation: true,
  noCredentialsInLogs: true,
} as const
```

The agent tells you what it's about to do. You can block anything with `/block {task_id}` in the two-minute window before execution begins. One-way doors — resource deletions, deploys, data writes — each require their own confirmation code.

---

## Sprint engine

One message. A full parallel software sprint.

```
/sprint "Add OAuth login to the dashboard"

→ Planner reads repo context (file tree, recent commits, SPEC.md, AGENTS.md)
→ Discovery phase — learns the codebase before specifying anything
→ Emits task batches; workers execute in parallel (up to 5 isolated containers)
→ Merge queue serializes branches; conflict-fix tasks injected automatically
→ Reconciler sweeps build health every 5 min, auto-injects targeted fix tasks
→ Planner iterates until the goal is verifiably met
→ Post-sprint: FEATURES.json diff + DECISIONS.md draft sent for your review
```

Workers are isolated containers with a hard 40-tool-call limit. Each one knows only what the planner writes in its task description — nothing else about the project.

---

## Connections

Connect a service and its tools are immediately available to the agent — no additional configuration.

| Service | Category |
|---------|----------|
| GitHub, Linear, Vercel, Netlify, Hetzner | Developer |
| Slack, Discord, Telegram | Communication |
| Notion, Google Drive | Productivity |
| Stripe | Finance |
| PostHog | Analytics |
| Mailchimp | Marketing |
| AWS S3 | Storage |

OAuth services connect with a single button click. API key services use forms auto-rendered from the service registry — no hardcoded forms. Credentials are encrypted at rest and fetched fresh at call time, never cached in memory.

Third-party services publish to the marketplace as connection plugins. They appear in the browser automatically after install.

---

## Plugin system

Plugins run in isolated Node.js worker threads. A plugin crash never reaches the core process.

```ts
import { sdk } from '@plexo/sdk'

// Register a tool the agent can call
sdk.agent.registerTool('stripe_list_customers', 'List Stripe customers', schema, async (input) => {
  const key = sdk.settings.get('secret_key')
  const res = await fetch('https://api.stripe.com/v1/customers', {
    headers: { Authorization: `Bearer ${key}` },
  })
  return { success: true, output: await res.json() }
})

// Inject context into every agent session
sdk.agent.injectContext(`## Stripe\nWhen billing questions arise, check Stripe first.`)

// Add a dashboard card
sdk.dashboard.registerCard('revenue', { title: 'MRR', defaultSize: { w: 4, h: 3 }, ... })
```

Plugin types: `skill` · `channel` · `tool` · `card` · `mcp-server` · `theme`

Crash policy: auto-restart with 5s backoff, max 3 restarts per hour, then disabled with notification. The core process is unaffected.

---

## Stack

```
Next.js 15 (App Router) · Express 5 · PostgreSQL 16 + pgvector
Drizzle ORM · Auth.js v5 · Redis (Valkey) · Caddy · Docker
TypeScript strict · pnpm workspaces
```

```
plexo/
├── apps/web            Next.js dashboard (App Router)
├── apps/api            Express API + SSE event bus
├── packages/agent      Core execution runtime
├── packages/sdk        Plugin API — stable, semver-versioned
├── packages/db         Drizzle schema + migrations
├── packages/queue      Task queue operations
├── packages/ui         Shared components (shadcn/ui)
├── plugins/core/
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

## Memory

The agent builds a semantic memory of everything it works on — tasks, incidents, patterns, sessions. Memory is searched using hybrid BM25 + vector retrieval with RRF fusion and recency weighting.

Patterns learned on one project are available to others. After each sprint, generalizable patterns (conflict hotspots, sizing calibration, recurring errors) are stored and injected as priors when starting a sprint on a project with a similar stack. The more you use it, the smarter the planner gets — across all your projects.

---

## Recursive self-improvement

The agent observes its own performance every week and proposes targeted changes.

```
Weekly cron → collect metrics → detect anomalies → generate proposals
Operator approves → 1-week shadow test on parallel task queue
Shadow metrics better than baseline → ready to deploy
/rsi_deploy {id} → applied to production with 14-day regression guard
Metric regresses during guard → auto-rollback
```

What it can improve: planning prompts, model routing thresholds, scanner scheduling, confidence calibration.

What it cannot touch, ever — enforced in code, not policy:

```ts
const PROTECTED_PATHS = [
  'packages/agent/constants.ts',  // SAFETY_LIMITS
  'packages/agent/rsi/**',        // RSI module itself
  'packages/db/schema/**',        // schema
  'apps/api/auth/**',             // auth
]
```

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

Read [`AGENTS.md`](AGENTS.md) before starting. Read [`docs/architecture.md`](docs/architecture.md) before touching package boundaries. The wall between `packages/sdk` and `packages/agent` is the plugin isolation boundary — plugins must never import from agent internals or the database directly.

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

Don't want to run your own server? [**getplexo.com**](https://getplexo.com) — no Docker required, fully isolated instance per account (separate Postgres, Redis, and containers — isolation is architectural, not policy), managed AI credits available.

---

## License

MIT — [LICENSE](LICENSE)
