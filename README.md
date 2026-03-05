<div align="center">

<img src="images/overview.png" alt="Plexo Dashboard" width="100%" style="border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.2);" />

<br/>

# Plexo

**The Agentic Operating System. Built for Production.**

<p align="center">
  A persistent, self-hosted AI workforce that autonomously handles software engineering, business operations, and deep research. Engineered for trust, built for scale, and entirely extensible via the Kapsel standard.
</p>

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-orange.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Deploy-Docker-2496ED?logo=docker&logoColor=white)](docker/compose.yml)
[![Kapsel](https://img.shields.io/badge/Kapsel-Full%20compliant-6C47FF)](https://github.com/joeybuilt-official/kapsel)

[**Managed Cloud**](https://getplexo.com) · [**Documentation**](docs/) · [**Kapsel Protocol**](https://github.com/joeybuilt-official/kapsel)

</div>

---

## 1. The Paradigm Shift

Most AI tools are glorified chat interfaces. You ask. They answer. *You* still do the work. The ceiling of a chat UI is human bandwidth.

**Plexo is an inversion of that model.** You describe an objective—in Slack, Telegram, or the native Dashboard—and your Plexo instance takes over. It formulates a topological execution plan, works asynchronously, verifies its own output, and only interrupts you for critical decisions. 

It is not an assistant; it is a persistent, scalable workforce that you completely control.

*   **Software Engineering:** Run parallel code sprints, open PRs, auto-diagnose and fix failing CI builds.
*   **Business Operations:** Generate internal MRR reports, monitor PostHog/Stripe events, and sync issues across Linear.
*   **Deep Research:** Asynchronous topic tracking, document synthesis, and structured web data extraction.

---

## 2. Engineered For Trust

An autonomous agent with write-access to your codebase and production systems is a profound liability without an obsessive focus on architecture and safety. Plexo was engineered from first principles to mitigate risk.

#### The Stack
| Layer | Technology | Rationale |
|-------|-----------|-----|
| **Core Runtime** | Node.js ≥22, TypeScript (Strict) | Fully typed execution paths, isolated worker threads. |
| **Web & API** | Next.js 15, Express 5 | Server components, edge streaming, native async middleware. |
| **Data & State** | PostgreSQL 16 + pgvector, Valkey (Redis) | Native vector search parity, ultra-low latency task queues. |
| **Intelligence** | Vercel AI SDK | Provider-agnostic. Route to Anthropic, OpenAI, Groq, or local Ollama. |

#### Verifiable Safety Rails
*   **Capability-Gated Execution:** Plugins cannot arbitrarily access the host network. Permissions (`storage:write`, `connections:github`) must be explicitly granted.
*   **The One-Way Door (OWD) Protocol:** Any destructive operation (modifying schemas, pushing commits, spending >$X) triggers a hard execution pause. The system requests explicit authorization via a real-time SSE push to your dashboard or Slack thread.
*   **Hard Boundaries:** Hard-coded limits on consecutive tool calls, execution wall-clock time, and API token spend per task.

---

## 3. The Extensibility Moat

A platform's survival depends on its ecosystem. Plexo natively adheres to [**Kapsel**](https://github.com/joeybuilt-official/kapsel), the definitive open standard for AI agent extensions.

This is the App Store model for AI—decentralized, host-agnostic, and secure by default.

*   **Persistent Sandboxes:** Extensions run in their own persistent `worker_threads`. Zero cold-start overhead across tool invocations. Crashes are caught, isolated, and respawned without bringing down the host.
*   **Write Once, Run Anywhere:** A Kapsel plugin written for Plexo will run on any other Kapsel-compliant host. 
*   **Built-in Registry:** Publish, discover, and install extensions directly via the internal Plexo registry. Validate via SHA-256 checksums.
*   **Omni-Channel Native:** Native adapters for Slack, Discord, and Telegram. Agents live where the team communicates. Integrate IDEs (Cursor/Claude) via the built-in MCP server (`@plexo/mcp-server`).

---

## The Platform Interface

<div align="center">
  <em>The Plexo Dashboard is designed to rival top-tier SaaS applications—clinical, fast, and actionable.</em>
</div>

<br/>

<details>
<summary><strong>Expand to view platform screenshots</strong></summary>
<br/>

### Projects (Sprints) Orchestration
Manage large-scale autonomous initiatives and their topological sub-tasks.
<img src="images/projects.png" alt="Projects View" width="100%" />

### Task Introspection
Deep visibility into agent tool usage, execution logs, cost burn, and exact reasoning traces.
<img src="images/tasks.png" alt="Tasks View" width="100%" />

### Omni-Channel Conversations
Seamless handoffs between Slack/Telegram and the Web Dashboard.
<img src="images/conversations.png" alt="Conversations View" width="100%" />

### The One-Way Door (OWD) Approvals
The safety valve. Review and approve critical actions before they execute.
<img src="images/approvals.png" alt="Approvals View" width="100%" />

### Deep Agent Configuration
Total control over identity, behavior, limits, and multi-model fallback chains.
<img src="images/agent_settings.png" alt="Agent Settings View" width="100%" />

</details>

---

## Self-Host in < 3 Minutes

Plexo is built for trivial orchestration via Docker. 

```bash
git clone https://github.com/joeybuilt-official/plexo.git
cd plexo
cp .env.example .env.local
```

Fill in your `DATABASE_URL`, `REDIS_URL`, and a `SESSION_SECRET` (generate one with `openssl rand -hex 64`).

```bash
docker compose -f docker/compose.yml up -d
```

Navigate to your domain. A clean browser wizard handles the rest: account creation, provider keys, and Kapsel setup. No terminal needed after the containers start.

*(Note: Don't want to bring your own Anthropc API key? Link your Claude.ai Pro account via PKCE OAuth flow and use your existing allocation.)*

---

## License

Plexo is licensed under **BSL 1.1** (Converts to Apache 2.0 on 2030-03-03). See [LICENSE](LICENSE) for details.
