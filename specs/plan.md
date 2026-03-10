# Spec: Real-Time Self-Inspection (RSI) Engine (Phase 13)

## Why
Plexo requires an autonomous, self-correcting feedback loop that can identify execution anomalies in the agent and automatically propose and test systemic protocol adjustments. Currently, the Work Ledger (Phase 12) captures execution cost, behavior, and quality scores, but humans must manually audit that data. Building the RSI Engine (Phase 13) allows the system to analyze `work_ledger` trends, hypothesize root causes (e.g., quality degradation, confidence skews, cost spikes), and generate actionable protocol improvements into Shadow Mode.

## How

### Phase 1: RSI Schema Definition
- Add `rsi_proposals` table to `packages/db/src/schema.ts`: Track `anomaly_type`, `hypothesis`, `proposed_change` (JSONB), `risk` level, and `status` (`pending`, `approved`, `rejected`).
- Add `rsi_test_results` table to `packages/db/src/schema.ts`: Track the comparison between baseline vs. shadow performance following an approved test plan (`task_id`, `is_shadow`, `baseline_quality`, `shadow_quality`, `token_delta`).

### Phase 2: The RSI Monitor Service
- Create `packages/agent/src/introspection/rsi-monitor.ts`: A chronologically triggered service that queries `work_ledger` for tasks completed in the last 14 days and evaluates statistical thresholds against minimum sample sizes (e.g., >5 tasks per category).
- Implemented anomaly classes:
  - `quality_degradation` (avg quality < 6.0/10)
  - `confidence_skew` (>40% tasks over-confident)
  - `cost_spikes` (cost > 2x historical average)

### Phase 3: API & Event Routing
- Build a new `apps/api/src/routes/rsi.ts` router containing:
  - `GET /api/v1/workspaces/:id/rsi/proposals` (Fetch latest proposals)
  - `POST /api/v1/workspaces/:id/rsi/proposals/:proposalId/approve`
  - `POST /api/v1/workspaces/:id/rsi/proposals/:proposalId/reject`
- Emit `rsi.proposal.created` to the internal event bus to allow operator notification (e.g. Telegram / System Logs).

### Phase 4: UI Accountability Tab Integration
- Extend the `Accountability` tab inside `apps/web/src/app/(dashboard)/settings` with a new `RSIProposalsPanel` component.
- The panel will list unresolved proposals showing the anomaly context alongside the specific hypothesis, allowing one-click `Approve` or `Reject` actions directly from the dashboard.

## Risks
- **Statistic Noise**: Generating RSI proposals too aggressively under small statistical sample sizes could degrade UX by creating alert fatigue. We will mitigate this with rigorous minimum counts (N=5 per type).
- **Infinite Shadow Loops**: If a test result yields exactly equivalent results to the baseline, the test suite could stall. We will define strict shadow expiration constraints.

## Verification
- **Unit (Detector Check)**: Write Vitest assertions for `rsi-monitor.ts` that synthesize mock `work_ledger` arrays displaying synthetic skew scenarios and guarantee proper `rsi_proposals` structures are emitted.
- **Integration (API)**: Ensure the RSI router safely queries scoped proposals through the workspace identifier to properly secure multi-tenant data fetching.
- **End-to-End**: A quick E2E verification using Playwright simulating an admin approving a pending `cost_spike` RSI proposal inside the dashboard.
