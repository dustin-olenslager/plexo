# Plexo

**Self-hosted AI agentic platform.** Plexo runs a persistent AI agent that handles routine work autonomously — managing infrastructure, executing coding tasks in parallel, scanning for opportunities, and learning from every outcome — and interrupts only when a real decision is needed.

The agent communicates through messaging channels you already use (Telegram, Slack, Discord) and through a web dashboard. A managed hosting tier is available at [getplexo.com](https://getplexo.com) for users who don't want to run their own server.

---

## What It Does

- **Autonomous task execution** — Send a message, get work done. The agent plans, executes, verifies, and reports back.
- **One-way-door protection** — Destructive actions (deletions, deploys, schema changes) require an explicit confirmation code before proceeding.
- **Sprint engine** — Decompose a software goal into parallel tasks running in isolated Docker workers, merged into a single branch.
- **Proactive scanning** — Monitors GitHub issues, failing builds, and message drops. Creates tasks automatically, gated by confidence.
- **Connections browser** — Connect GitHub, Linear, Vercel, Stripe, Hetzner, and more. Connected services automatically register tools the agent can call.
- **Plugin system** — Extend every part of the platform: new tools, dashboard cards, messaging channels, cron jobs, MCP servers.
- **Semantic memory** — Hybrid BM25 + vector search over past tasks, incidents, and learned patterns. Cross-project learning out of the box.
- **Recursive self-improvement** — Weekly analysis of execution metrics. Proposes targeted changes, shadow tests them, deploys with a regression guard.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| API | Express 5 |
| Database | PostgreSQL 16 + pgvector |
| ORM | Drizzle |
| Cache / Queue | Redis (Valkey) |
| Auth | Auth.js v5 |
| Reverse proxy | Caddy |
| Runtime | Docker / Docker Compose |
| Language | TypeScript (strict) |
| Package manager | pnpm workspaces |

---

## Self-Hosting

**Requirement:** A server with Docker and Docker Compose installed. No terminal commands required after initial setup.

### 1. Clone and configure

```bash
git clone https://github.com/dustin-olenslager/plexo
cd plexo
cp .env.example .env
```

Edit `.env`:

```bash
# Generate with: openssl rand -hex 32
POSTGRES_PASSWORD=

# Your public domain (with https://)
PUBLIC_URL=https://plexo.yourdomain.com
PUBLIC_DOMAIN=plexo.yourdomain.com

# Generate with: openssl rand -hex 64
SESSION_SECRET=

# Anthropic API key — console.anthropic.com
ANTHROPIC_API_KEY=

# Optional AI fallbacks
OPENAI_API_KEY=
GEMINI_API_KEY=

# GitHub OAuth — github.com/settings/applications/new
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Tune to your server resources
MAX_SPRINT_WORKERS=5

# Weekly AI spend cap — tasks pause at this limit
API_COST_CEILING_USD=10.00
```

### 2. Start

```bash
docker compose -f docker/compose.yml up -d
```

### 3. Finish setup in the browser

Navigate to `https://plexo.yourdomain.com`. The first-run wizard walks through:

1. Creating an admin account
2. Adding an AI provider key (tested inline)
3. Connecting a messaging channel (Telegram, Slack, or Discord)
4. Setting agent name and personality
5. Launch

**Target: under 20 minutes from clone to first agent response.** Every design decision is evaluated against this constraint.

---

## Monorepo Structure

```
plexo/
├── apps/
│   ├── web/                    # Next.js 15 dashboard
│   └── api/                    # Express API server
├── packages/
│   ├── agent/                  # Agent runtime — core execution logic
│   ├── sdk/                    # Plugin SDK — public API surface
│   ├── db/                     # Drizzle schema, migrations, client
│   ├── queue/                  # Task queue operations
│   └── ui/                     # Shared shadcn/ui components
├── plugins/
│   └── core/                   # First-party plugins
│       ├── github-ops/
│       ├── telegram-channel/
│       ├── slack-channel/
│       ├── devops-skill/
│       ├── cron-manager/
│       ├── product-skill/
│       └── research-skill/
├── docker/
│   ├── compose.yml
│   └── worker/                 # Sprint worker Docker image
├── docs/
│   ├── architecture.md
│   ├── plugin-sdk.md
│   ├── self-hosting.md
│   └── plugin-development.md
├── scripts/
│   ├── setup.ts
│   └── health-check.ts
├── AGENTS.md
├── CHANGELOG.md
└── .env.example
```

---

## Development

```bash
pnpm install
pnpm dev              # start all apps in dev mode

pnpm test             # unit tests (Vitest)
pnpm test:integration # integration tests (requires Docker)
pnpm test:e2e         # Playwright E2E (requires running stack)
pnpm typecheck        # tsc --noEmit across all packages
pnpm db:migrate       # run pending migrations
pnpm db:rollback      # roll back one migration
```

---

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full component diagram and data flow documentation. Read it before making architectural decisions.

```
Telegram / Slack / Discord / Webchat
              │
              ▼
         apps/api (Express)
         ├── HTTP routes, Auth, Rate limiting
         └── SSE event bus
              │
         packages/agent
         ├── Task queue + execution protocol
         ├── Sprint engine + worker pool
         ├── Scanners + confidence gating
         └── Memory (pgvector hybrid search)
              │
         ┌────┴────┐
         │         │
  packages/db   packages/sdk
  (Drizzle)     (Plugin API)
         │         │
    PostgreSQL  plugins/core/*
    + pgvector
```

---

## Plugin Development

Plugins extend every part of Plexo:

| Type | What it adds |
|------|-------------|
| `skill` | Context injected into agent system prompt + callable tools |
| `channel` | New messaging channel (Telegram, Slack, etc.) |
| `tool` | Individual callable tool |
| `card` | Dashboard card component |
| `mcp-server` | Model Context Protocol server integration |
| `theme` | Dashboard theme |

Plugins run in isolated Node.js worker threads. A plugin crash never affects the core process. See [`docs/plugin-sdk.md`](docs/plugin-sdk.md) for the full SDK reference.

Quick example — registering a tool:

```typescript
import { sdk } from '@plexo/sdk'

sdk.agent.registerTool(
  'github_create_pr',
  'Create a pull request on GitHub.',
  { /* JSON Schema */ },
  async (input, context) => {
    const token = sdk.settings.get('github_token')
    // ... call GitHub API
    return { success: true, output: { url: pr.html_url } }
  }
)
```

---

## Agent Execution Protocol

Every task follows this protocol without exception:

1. **PLAN** — Agent produces a structured execution plan with steps, one-way door identification, confidence score, and risks. Plan is sent to you before execution starts.
2. **CONFIRM** — Any step identified as a one-way door (deletion, deploy, schema migration, external publish) pauses and requests a 6-character confirmation code with a 10-minute expiry.
3. **EXECUTE** — Steps run in sequence. Max 4 consecutive tool calls before a mandatory verification pause. No `--force` on git. No deletion without a confirmed code.
4. **VERIFY** — After each step, the agent confirms the post-condition was actually met, not just that the tool returned success.
5. **COMPLETE** — Quality score calculated, work ledger written, memory entry created, notification sent.

Safety limits are constants in code — not configuration:

```typescript
export const SAFETY_LIMITS = {
  maxConsecutiveToolCalls: 4,
  maxWallClockMs: 2 * 60 * 60 * 1000,  // 2 hours
  maxRetries: 3,
  noForcePush: true,
  noDeletionWithoutConfirmation: true,
  noCredentialsInLogs: true,
} as const
```

---

## Sprint Engine

Sprints decompose a software goal into parallel tasks executed by isolated Docker workers:

```
You: /sprint "Add OAuth login to the dashboard"

Plexo:
  → Planner analyzes repo context
  → Emits first task batch (discovery phase)
  → Workers clone repo, execute tasks in parallel
  → Merge queue serializes completed branches
  → Reconciler sweeps for build errors every 5 min
  → Planner iterates until done
  → Post-sprint: FEATURES.json diff, DECISIONS.md draft sent for your review
```

Workers are fully isolated containers with a hard 40-tool-call limit and 30-minute timeout. They know nothing about the project except what the planner writes in the task description.

---

## Connections

Plexo ships with built-in support for:

| Service | Category |
|---------|----------|
| GitHub, Linear, Vercel, Netlify, Hetzner | Developer |
| Slack, Discord, Telegram | Communication |
| Notion, Google Drive | Productivity |
| Stripe | Finance |
| PostHog | Analytics |
| Mailchimp | Marketing |
| AWS S3 | Storage |

OAuth2 services connect with a single button click. API key services use auto-rendered forms from the service registry — no hardcoded forms. Connected services automatically register their tools with the agent for your workspace.

---

## Health Check

```bash
curl https://plexo.yourdomain.com/health
```

```json
{
  "status": "ok",
  "services": {
    "postgres": { "ok": true, "latencyMs": 2 },
    "redis": { "ok": true, "latencyMs": 1 },
    "anthropic": { "ok": true, "latencyMs": 312 }
  },
  "version": "0.1.0",
  "uptime": 3600
}
```

---

## Managed Hosting

Don't want to run your own server? [getplexo.com](https://getplexo.com) — fully isolated instance per account, managed AI credits available.

---

## License

MIT — see [LICENSE](LICENSE).

---

*Plexo · getplexo.com · [plexo.dev](https://plexo.dev)*
