# Changelog

All notable changes to Plexo are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)

## [Unreleased]

### Added
- **Workspace deletion** — users can now delete non-active workspaces from Settings → Workspace. Trash icon appears on each non-active workspace row; clicking it triggers an inline confirmation before deletion. The active workspace and the last remaining workspace are protected from deletion. `DELETE /api/workspaces/:id` added to the backend with a last-workspace guard; all child rows cascade-delete via existing FK constraints.
- BSL 1.1 license (converts to Apache 2.0 on 2030-03-03)
- Commercial context + ZeroClaw parity gate in AGENTS.md
- `.agents-local.md` gitignored for private operational notes
- **Multi-category projects** — new project creation supports Code, Research, Writing, Ops, Data, Marketing, and General project types with category-appropriate terminology, form fields, and planner prompts
  - `sprints` table: `repo` now nullable; `category` (text, default 'code') and `metadata` (jsonb, default '{}') columns added
  - New project page redesigned with visual category picker and progressive disclosure of category-specific fields
  - Sprint planner and runner are category-aware; non-code projects skip the GitHub branch/PR workflow
  - Project list and detail pages show category badges and use category-specific unit labels

### Fixed
- **ENCRYPTION_SECRET env var mismatch** — `apps/api/src/crypto.ts` and `packages/agent/src/connections/crypto-util.ts` were reading `PLEXO_ENCRYPTION_KEY` but `docker/compose.yml` and `.env.example` both declare `ENCRYPTION_SECRET`. Every `encrypt()` call threw at runtime, silently 500-ing all `PUT /api/workspaces/:id/ai-providers` requests. AI provider credentials were never written to the DB, causing the agent loop and health check to report `not_configured` even after a user saved a valid key in the UI. Fixed by renaming the env var read in both crypto files to `ENCRYPTION_SECRET`.
- **ENCRYPTION_SECRET not validated at startup** — `apps/api/src/env.ts` did not include `ENCRYPTION_SECRET` in `ENV_SPEC`, so a missing or empty value produced no error or warning at boot. Added as a required field with a 32-character minimum and a generation hint — process now exits on startup if unset.
- **Workspace Creation and Listing** — Fixed an issue where workspaces weren't showing up or couldn't be created on the frontend by updating API endpoints to the properly prefixed `/api/v1/workspaces` paths, and explicitly returning `ownerId` from the workspaces API to prevent foreign key errors on creation.

### Changed
- **Intent Classification** — `chat` and `telegram` router classifiers now distinguish `PROJECT` intents along with `TASK` and `CONVERSATION`.
- **Conversation Context in Routing** — Intent classifiers in webchat and Telegram now analyze full session history to properly route follow-up confirmations.
- **Consultative Agent Prompt** — The conversational system prompt now prevents aggressive task creation by explicitly probing vague requests (e.g., troubleshooting) for more details first.
- **README Redesign** — Rewrote the README.md to match the high-quality, polished style of top-tier open-source projects, improving visual hierarchy, copy crispness, and feature presentation while maintaining Plexo's unique value props.

---

## [1.5.0-dev] — 2026-03-05 (Phase 29 — Settings Consolidation & MCP Server)

### Added
- **MCP Server (`@plexo/mcp-server`)** — Exposes `plexo_health` and `plexo_workspace_info` tools to external MCP clients (Cursor, Claude Desktop) via HTTP (port 3002) and stdio transports.
- **Documentation Images** — Extracted and embedded automated screenshots of the main application views (Dashboard, Tasks, Projects, Conversations, Approvals, Agent Settings) into the README.

### Changed
- **Settings UI Consolidation** — Merged previously separate Agent and Behavior settings pages into a unified, tabbed interface at `/settings/agent` containing Identity, Behavior, Limits, and History.
- **Rule Engine UX** — Transformed the advanced behavior configuration into a collapsible rule engine UI with clear differentiation between platform, workspace, and project-level overrides.
- **Limit Configuration UX** — Replaced raw numeric input fields for API cost ceilings and auto-approval thresholds with user-friendly drop-down selectors and natural language descriptions.

---

## [1.4.0-dev] — 2026-03-04 (Phases 21-23 — Persistent Workers, Event Bus Fan-out, Registry)

### Added
- `plugins/persistent-pool.ts` — Persistent Worker Pool (§5.4): one long-lived Worker per extension, reused across invocations, crash recovery, per-call hard timeout terminates the worker
- `routes/registry.ts` — Kapsel Registry API (§12): search, detail, publish (with manifest validation), deprecate
- `drizzle/0010_kapsel_registry.sql` + `schema.ts` — `kapsel_registry` table

### Changed
- `plugins/bridge.ts` — uses persistent pool; no more ephemeral worker-per-call
- `plugins/event-bus.ts` — v2: Redis pub/sub fan-out for multi-container deployments, loop protection
- `plugins/sandbox-worker.ts` — persistent message protocol (`activate`/`invoke`/`terminate`) + ephemeral fallback
- `routes/plugins.ts` — `terminateWorker()` on disable/uninstall
- `apps/api/src/index.ts` — `terminateAll()` on SIGTERM; registry mounted at `/api/v1/registry`
- `packages/db/src/index.ts` — added `ne`, `ilike` exports
- `packages/agent/package.json` — added `./persistent-pool` export; `redis@^4`

## [1.3.0-dev] — 2026-03-04 (Phases 18-20 — Event Bus, OWD Gate, Deploy)

### Added
- `packages/agent/src/plugins/event-bus.ts` — Kapsel Event Bus (§7); singleton EventEmitter with wildcard topic matching, namespace enforcement for extension publishes (`ext.<scope>.*` only), lifecycle TOPICS constants
- `packages/agent/src/one-way-door.ts` — OWD service moved from api to agent package (canonical location); `requestApproval`, `waitForDecision`, `resolveDecision`, `listPending`
- `docs/deploy.md` — generic self-hosted deployment guide (any VPS, any cloud provider)

### Changed
- `executor/index.ts` — OWD approval gate (§8.4): checks `plan.oneWayDoors` before executing; pauses up to 30 min for operator decision; returns `OWD_REJECTED` / `OWD_TIMEOUT` errorCode on non-approval
- `plugins/bridge.ts` — emits `sys.extension.activated` and `sys.extension.crashed` via Event Bus on each activation attempt
- `apps/api/src/routes/approvals.ts` — now imports OWD functions from `@plexo/agent/one-way-door`
- `types.ts` `ExecutionResult` — added optional `error` and `errorCode` fields for gate short-circuit returns
- `apps/api/src/index.ts` — dotenv loads `.env` then `.env.local` relative to monorepo root (supports local dev)
- `packages/agent/package.json` — added `redis@^4` dep + `./one-way-door` subpath export

### Removed
- `apps/api/src/one-way-door.ts` — deleted; canonical version in `@plexo/agent`
- `docs/coolify-deploy.md` — replaced with platform-agnostic `docs/deploy.md`

## [1.2.0-dev] — 2026-03-04 (Phase 17 — Production deployment hardening)

### Added
- `apps/api/src/env.ts` — fail-fast env validator; exits process on missing required vars, warns on optional gaps, requires at least one AI provider key
- `docs/coolify-deploy.md` — Coolify setup guide: resource requirements, volumes, rollback, post-deploy smoke test

### Changed
- `docker/Dockerfile.api` — fixed build: per-package node_modules in builder, packages built in dependency order (`db → queue → sdk → agent → api`), migrations dir included in runner
- `docker/compose.yml` — added `migrate` service (runs once before api), healthchecks on api and web, healthcheck-gated deps, all channel + AI provider env vars forwarded
- `.env.example` — added Telegram, Discord, Groq, Mistral; improved generation command hints

---

## [1.1.0-dev] — 2026-03-04 (Phase 14 — Kapsel Standard adoption)

### Changed
- **`@plexo/sdk` is now Kapsel-compatible** — rewrote from Plexo-proprietary types to full Kapsel Protocol Specification v0.2.0 compliance; exports `KapselManifest`, `KapselSDK`, `validateManifest`, all capability tokens, agent/channel/event types
- **`plugin_type` enum** — migrated from `skill|channel|tool|card|mcp-server|theme` → `agent|skill|channel|tool|mcp-server` (matches Kapsel §2); `card` functionality maps to `ui:register-widget` capability
- **`plugins.manifest` → `plugins.kapsel_manifest`** — column renamed; stores full `kapsel.json` contents
- **Added `plugins.entry` column** (§3.1 required field — relative path to extension entry point)
- **Added `plugins.kapsel_version` column** (tracks which spec version the manifest targets)
- **`POST /api/plugins` now validates full kapsel.json** via `validateManifest()` (§3.3); returns structured `errors[]` on failure; also enforces `minHostLevel` (§11.4)
- **Activation model** — plugin bridge now activates extensions via `activate(sdk)` in a sandboxed worker; `sdk.registerTool()` registrations collected at activation time rather than reading a `tools[]` array from the manifest (Kapsel §9.1)
- **Host-side `KapselSDK`** (`activation-sdk.ts`) — capability enforcement at every SDK call (§4); `events.publish` enforces `ext.<scope>.*` namespace (§7.4)
- **Sandbox worker updated** — two modes: `__activate__` returns registrations, named tool runs the handler (§5)
- **`/health` declares Kapsel compliance** — `{ kapsel: { complianceLevel: 'full', specVersion: '0.2.0', host: 'plexo' } }` (§14.4)

### Added
- `packages/sdk/src/types/manifest.ts` — `KapselManifest`, `CapabilityToken`, `ExtensionType` (§3)
- `packages/sdk/src/types/sdk.ts` — `KapselSDK` interface with all 18 capability surfaces (Appendix A)
- `packages/sdk/src/types/messages.ts` — message protocol types + all error codes (§6)
- `packages/sdk/src/types/agent.ts` — `AgentExtension`, `Plan`, `PlanStep`, one-way door types (§8)
- `packages/sdk/src/types/channel.ts` — `ChannelExtension` contract (§2.3, §9.2)
- `packages/sdk/src/types/events.ts` — `TOPICS` constants, `customTopic()`, all standard payloads (§7.4)
- `packages/sdk/src/validation/manifest.ts` — `validateManifest()` with all §3.3 checks
- `packages/agent/src/plugins/activation-sdk.ts` — host KapselSDK implementation

### Infrastructure
- Migration 0009: `plugin_type` enum swap, `manifest`→`kapsel_manifest` rename, `entry`+`kapsel_version` columns

---

## [1.0.0-dev] — 2026-03-04 (Phase 13 — Sandbox, Audit, Workspace Rate Limit)

### Added
- **Plugin sandbox** (`packages/agent/src/plugins/sandbox-worker.ts` + `pool.ts`) — plugin tools now execute in `worker_threads`; 10s timeout per call; auto-terminate on timeout or error; permission set forwarded from manifest; non-fatal fallback if worker spawn fails
- **Plugin bridge upgraded** — `loadPluginTools()` now delegates execution to `runInSandbox()` instead of inline stub; returns structured `{ status: 'timeout' | 'error' | 'ok' }` result
- **`audit_log` table** — migration 0008; workspaceId + userId (nullable) + action + resource + resourceId + metadata JSONB + IP; 3 indexes (workspace, action, created_at DESC)
- **Audit helper** (`apps/api/src/audit.ts`) — fire-and-forget `audit(req, entry)` — extracts X-Forwarded-For IP, writes to `audit_log`, swallows errors so audit failure never breaks callers
- **`GET /api/audit?workspaceId=&action=&before=&limit=`** — paginated workspace-scoped audit log; action prefix filter; cursor pagination via `before=` ISO timestamp; joined with user name/email
- **Audit events wired** — member.add / member.role_change / member.remove / invite.create / invite.accept / plugin.install / plugin.enable / plugin.disable / plugin.uninstall
- **Per-workspace Redis rate limiting** (`apps/api/src/middleware/workspace-rate-limit.ts`) — INCR+EXPIRE sliding window; limit from `workspace.settings.rateLimit.requestsPerHour` (default 1000); limit cached 60s in Redis; degrades gracefully if Redis unavailable; `X-Workspace-RateLimit-Limit` + `X-Workspace-RateLimit-Remaining` response headers
- **Rate limit applied** to `/api/tasks` (alongside IP limiter) and `/api/plugins`
- **Shared Redis client** (`apps/api/src/redis-client.ts`) — singleton matching pkce-store pattern; handles concurrent connect race
- **E2E tests (+5)** — plugins MISSING_WORKSPACE, INVALID_MANIFEST, 404; audit MISSING_WORKSPACE, items array (42/42 passing)

---

## [0.9.0-dev] — 2026-03-04 (Phase 12 — Plugin runtime)

### Added
- **Plugins CRUD API** (`GET/POST/PATCH/DELETE /api/plugins`) — install from manifest JSON, toggle enabled, patch settings, uninstall; validates workspace exists before insert
- **Plugin tool bridge** (`packages/agent/src/plugins/bridge.ts`) — loads enabled plugins for a workspace at task start, converts `manifest.tools[]` declarations to Vercel AI SDK tool objects; runs as stubs until handler packages are installed; non-fatal on load failure
- **Executor integration** — `loadPluginTools(workspaceId)` merged into `allTools` alongside built-in and connection tools; plugins fire at agent execution time

### Architecture notes
- Plugin tool naming: `plugin__{pluginName}__{toolName}` — namespaced to avoid collisions with built-in tools
- Plugin tools use `inputSchema` (Vercel AI v4 convention) with zod shape derived from manifest parameter declarations
- Phase 13 target: move plugin tool execution to isolated `worker_threads` with permission enforcement

---

## [0.8.0-dev] — 2026-03-04 (Phase 11 — Workspace membership + invites)

### Added
- **`workspace_members` table** — join table with `(workspace_id, user_id)` unique composite; roles: owner / admin / member / viewer; migration 0007 DDL + backfill (existing workspace owners inserted as `owner` role)
- **`workspace_invites` table** — stores invite tokens (48-char hex), optional target email, role, 7-day expiry; tracks `used_at` / `used_by_user_id`
- **`GET /api/workspaces/:id/members`** — lists members with user name + email joined from `users`
- **`POST /api/workspaces/:id/members`** — adds existing user by email (upserts role on conflict)
- **`PATCH /api/workspaces/:id/members/:userId`** — updates role (owner not assignable via API)
- **`DELETE /api/workspaces/:id/members/:userId`** — removes member; prevents removing workspace owner
- **`POST /api/workspaces/:id/members/invite`** — generates a 7-day invite link; returns `{ token, inviteUrl, expiresAt }`
- **`GET /api/invites/:token`** — returns invite metadata (workspace name, role, expiry); 404/410 on invalid/used/expired
- **`POST /api/invites/:token/accept`** — marks invite used and upserts member; requires `userId`
- **`/invite/[token]` page** — self-contained accept flow: shows workspace name + role, one-click join, redirects to dashboard on success
- **Settings → Members page** — replaced global user list with workspace-scoped member list; per-member role selector (viewer/member/admin), remove button, inline invite panel with link copy
- **E2E tests (+4)** — members list returns items, POST requires email, GET invite 404 on unknown token, POST accept requires userId (37/37 passing)

### Changed
- Settings → Users renamed to **Members** (workspace-scoped view)
- All dashboard pages now read workspace from `WorkspaceContext` instead of build-time `NEXT_PUBLIC_DEFAULT_WORKSPACE` constant (11 files refactored)

---

## [0.7.0-dev] — 2026-03-04 (Phase 7C — Workspace management)

### Added
- **Workspace switcher** — replaces static logo in sidebar with a click-to-open popover listing all workspaces; active workspace has a ✓ checkmark; switch persists to `localStorage` and reloads the app
- **Multi-workspace create** — inline "New workspace" form in both the sidebar switcher and Settings > Workspace; calls `POST /api/workspaces` and auto-switches on success
- **Settings > Workspace management panel** — full workspace list with avatar initials, truncated ID, active indicator, and Switch button for all other workspaces
- **`POST /api/workspaces`** — creates a new workspace with `name` + `ownerId`; returns `{ id, name }`

### Fixed
- **Sidebar multi-select bug** — `isActive` rewritten with segment-boundary match (`href + '/'`) and `exact?: boolean` flag; `/settings` (Workspace) no longer activates alongside `/settings/agent`, `/settings/ai-providers`, etc.
- **Workspace section dedup** — removed the redundant Workspace section from Settings > Agent; Settings > Workspace is the single authoritative location for workspace name, ID (read-only), and cost ceiling
- **Discord logo broken** — connection registry logo URL updated to `cdn.simpleicons.org/discord/5865F2` (stable CDN); seed SQL updated; `onError` fallback on all connection `<img>` tags degrades to initials

### Added
- **Task → project relationship** — `tasks.project_id` nullable FK → `sprints.id` (`ON DELETE SET NULL`); index `tasks_project_id_idx`; backfill via `sprint_tasks` join (migration 0006)
- **`projectId` filtering** — `GET /api/tasks?projectId=` and `POST /api/tasks` body; queue `push()`/`list()` updated
- **Sprint runner** — passes `sprintId` as `projectId` when pushing tasks so sprint-generated tasks carry the FK
- **Task detail breadcrumb** — shows project link in header when `task.projectId` is set
- **Tasks page project filter** — project badge on each row; filter bar for project/standalone tasks

---

## [0.7.0-dev] — 2026-03-04 (Phase 7A continued + UX polish)

### Added
- **Approvals page** (`/approvals`) — review queue for one-way-door operations: approve/reject with risk level banners, task link, 5s polling auto-refresh
- **Sidebar approval badge** — red count badge on Approvals nav item, polls every 10s; visibility cue when agent is waiting for a decision
- **Task cancel button** — `DELETE /api/tasks/:id` wired to task detail page; visible for `pending` and `running` tasks only; triggers `router.refresh()` post-cancel
- **First-run redirect** — dashboard home checks `GET /api/workspaces`; if no workspaces exist, redirects to `/setup`. Timeout-safe (2s abort) — API unreachable yields graceful fallback

### Changed
- **Marketplace install errors** — API errors now surfaced as red inline text on the card instead of silently failing

---

## [0.7.0-dev] — 2026-03-04 (Phase 7A — Parity & Stability)

### Added
- **Telegram setup wizard** — 3-step guided onboarding in `/settings/channels`: BotFather instructions → live token verify via Telegram API → webhook secret. Auto-advances on successful token verify
- **Memory/Insights browser** — converted to interactive client component: semantic search (`GET /api/memory/search`), run improvement cycle button, per-entry Apply buttons
- **AI Providers fallback chain reordering** — ▲▼ buttons reorder configured providers; fallback order persisted to `workspace.settings.aiProviders.fallbackOrder`

### Changed
- **Settings page** — now a client component; loads real workspace data on mount; saves to `PATCH /api/workspaces/:id`; API Keys section replaced with info panel + env var reference pointing to AI Providers
- **`PATCH /api/workspaces/:id`** — deep-merges settings object (read-modify-write) to prevent cross-section overwrites
- **Settings > Agent** — `handleSave` wired to real API; loads persisted `defaultModel`, `tokenBudgetPerTask`, `maxRetries` from workspace settings on mount

---

## [0.7.0-dev] — 2026-03-04 (Phase 7B/C/D — Personality, Control Room, Webchat, NLP Cron)

### Added
- **Agent personality system prompt** — executor fetches workspace `agentName` and `agentPersona` from DB; injects them into the system prompt dynamically
- **Sprint control room** (`/sprints/[id]`) — live client page with SSE, worker grid, per-tab views (workers/tasks/features delivered), velocity metric cards (elapsed, cost, throughput), wall-clock timer, live active-worker banner
- **Sprint velocity metrics** on `/sprints` list — total projects, completed count, success rate, avg tasks/sprint, total spend
- **Webchat widget** — `POST /api/chat/message` queues a task, `GET /api/chat/reply/:taskId` long-polls for agent reply, `GET /api/chat/widget.js` serves embeddable vanilla JS bubble widget
- **Webchat embed snippet** on `/settings/channels` page — shows copyable `<script>` tag with workspace ID
- **NLP-to-cron parser** — `POST /api/cron/parse-nl` converts plain English schedules to cron expressions (deterministic, no AI call). UI in `/cron` add form fills schedule field from natural language input with Enter-to-parse and green confirmation

### Changed
- Sprint card shows wall clock time alongside cost
- Sprint list page is now a clean server component rewrite (removed duplicate declarations from earlier partial edit)

---

## [0.7.0-dev] — 2026-03-04 (Phase 10 — Live Dashboard + Debug + Connections Tools)

### Added
- **LiveDashboard** client component — SSE + polling (15s summary, 10s activity), manual refresh, last-updated timestamp. Dashboard page now uses `LiveDashboard` instead of static server components
- **Runtime Snapshot** panel in debug page — `GET /api/debug/snapshot` returns queue depth, sprint task counts, work ledger 7d stats, SSE client count, process info
- **RPC Console** in debug page — `POST /api/debug/rpc` with allowlisted methods: `ping`, `queue.stats`, `memory.list`, `memory.run_improvement`, `agent.status`
- **Connections Tools tab** — per-tool enable/disable toggles backed by `enabled_tools jsonb` column in `installed_connections` (migration 0004)
- `PUT /api/connections/installed/:id/tools` — save enabled tools list per connection

### Changed
- Dashboard page converted from server component to `LiveDashboard` client component
- Debug page adds Runtime Snapshot + RPC Console panels
- Connections page: Overview/Tools/Config tabbed detail panel

---

## [0.6.0] — 2026-03-03 (Phase 6 — Memory + Self-Improvement)

### Added
- **Semantic memory store** (`packages/agent/src/memory/store.ts`)
  - `storeMemory` / `searchMemory` / `recordTaskMemory`
  - pgvector HNSW cosine similarity search (text-embedding-3-small via OpenAI when key present)
  - ILIKE text fallback when no embedding API key configured
- **Workspace preference learning** (`packages/agent/src/memory/preferences.ts`)
  - `learnPreference` — confidence-accumulating upsert (capped at 0.95)
  - `inferFromTaskOutcome` — infers language, test framework, tool success rates from file/tool trace
- **Self-improvement loop** (`packages/agent/src/memory/self-improvement.ts`)
  - Claude Haiku scans `work_ledger`, proposes up to 5 patterns per cycle
  - Stores proposals in `agent_improvement_log`; auto-applies `tool_preference` type
- **Recursive prompt improvement** (`packages/agent/src/memory/prompt-improvement.ts`)
  - `proposePromptImprovements` — LLM proposes targeted system prompt patches
  - `applyPromptPatch` — operator applies approved patches to `workspace_preferences['prompt_overrides']`
  - No code deploy required; executor reads overrides at task start
- **Executor hook** — records every task outcome + preference inference post-completion (non-blocking)
- **Memory API** (`apps/api/src/routes/memory.ts`)
  - `GET /api/memory/search` — semantic + text fallback search
  - `GET /api/memory/preferences` — workspace preference map
  - `GET /api/memory/improvements` — improvement log
  - `POST /api/memory/improvements/run` — trigger self-improvement cycle (202 async)
  - `POST /api/memory/improvements/prompt` — trigger prompt improvement analysis (202 async)
  - `POST /api/memory/improvements/:id/apply` — operator applies a specific prompt patch
- **Insights page** (`apps/web/src/app/(dashboard)/insights/page.tsx`)
  - Preferences grid + improvement log with pattern type badges
  - Brain icon in sidebar nav
- **Marketplace** (`apps/web/src/app/(dashboard)/marketplace/`)
  - Server page + interactive `MarketplaceClient`
  - Searchable, category-filterable integration grid
  - Inline credential setup fields; optimistic install/remove state
  - 10 integrations seeded: GitHub, Slack, Discord, Telegram, OpenAI, Linear, Jira, Notion, PagerDuty, Datadog
- **Connections API** (`apps/api/src/routes/connections.ts`)
  - `GET /api/connections/registry` + `GET /api/connections/registry/:id`
  - `GET /api/connections/installed`, `POST /api/connections/install`
  - `PATCH /api/connections/installed/:id`, `DELETE /api/connections/installed/:id`
- **DB migrations**
  - `0002_memory_preferences.sql` — `workspace_preferences` + `agent_improvement_log` tables
  - `0003_connections_seed.sql` — 10 registry integrations
- **Drizzle schema** — `workspacePreferences` + `agentImprovementLog` table definitions
- 5 new Memory API E2E tests (24/24 total passing)

### Security
- `AGENTS.md` scrubbed of credentials and internal VPS migration details
- `.agents-local.md` added to `.gitignore` for private operational notes

---

## [0.5.0] — 2026-03-03 (Phase 5 — Sprint Engine)

### Added
- **GitHub client** (`packages/agent/src/github/client.ts`) — fetch-based, no external deps
  - Branch CRUD, PR create/merge/update, CI status polling, file comparison
- **Sprint planner** (`packages/agent/src/sprint/planner.ts`)
  - Claude decomposes repo + request into ≤8 parallelizable tasks
  - Topological sort into execution waves, branch naming, persists to `sprint_tasks`
- **Conflict detection** (`packages/agent/src/sprint/conflicts.ts`)
  - Static (scope overlap pre-execution) + dynamic (GitHub compare post-execution)
- **Sprint runner** (`packages/agent/src/sprint/runner.ts`)
  - End-to-end: plan → branch → enqueue → poll → draft PR → conflict detect → status
- **Sprint API** (`apps/api/src/routes/sprint-runner.ts`)
  - `POST /api/sprints/:id/run` (202 async), `GET /api/sprints/:id/tasks`, `GET /api/sprints/:id/conflicts`
- **Discord adapter** (`apps/api/src/routes/discord.ts`)
  - Ed25519 signature verification, `/task` slash command with deferred response
  - Guild→workspace mapping, follow-up via webhook, `GET /api/channels/discord/info`
- **Discord command registration** script (`scripts/discord-register-commands.mjs`)
- **Sprint list page** (`apps/web/src/app/(dashboard)/sprints/page.tsx`)
- **Sprint creation form** (`apps/web/src/app/(dashboard)/sprints/new/page.tsx`)
- **Sprint detail page** (`apps/web/src/app/(dashboard)/sprints/[id]/page.tsx`)
- Sprints + Insights sidebar nav items
- 10 new E2E tests (24 total)

---

## [0.4.0] — 2026-03-02 (Phase 4 — Channel Adapters + OAuth)

### Added
- Telegram adapter (webhook ingestion, message routing)
- Slack adapter (slash commands, event subscriptions)
- Anthropic OAuth PKCE flow (token exchange, auto-refresh)
- One-way door approval flow (confirm before destructive ops)
- Live dashboard components (task list, cost summary, agent status)
- `POST /api/memory/improvements/run` placeholder

---

## [0.3.0] — 2026-03-01 (Phase 3 — Task Execution Engine)

### Added
- Agent executor with full Claude tool loop
- Tool implementations: shell, file ops, web fetch, code search
- Work ledger (token tracking, cost, quality score, calibration)
- Vitest unit test suite (24 tests)
- Playwright E2E suite (critical paths)

---

## [0.2.0] — 2026-02-28 (Phase 2 — Core Infrastructure)

### Added
- Task queue (packages/queue) with Redis-backed BullMQ
- Worker process consuming queue
- RLS-style workspace scoping on all queries
- API cost ceiling + weekly accumulation + 80% alert
- DB migrations via Drizzle

---

## [0.1.0] — 2026-02-27 (Phase 1 — Scaffold)

### Added
- Monorepo scaffold: pnpm workspaces, Turborepo, TypeScript strict
- Database schema: 21+ tables via Drizzle ORM
- Auth.js v5: credentials + GitHub OAuth
- Express 5 API server, Next.js 15 dashboard
- Docker Compose: Postgres 16 + pgvector, Valkey, Caddy
- AGENTS.md, .env.example, docs stubs
