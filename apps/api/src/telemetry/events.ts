// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Joeybuilt LLC

/**
 * telemetry/events.ts — Structured product events for opted-in instances.
 *
 * Emitted via the PostHog relay (telemetry.getplexo.com) — same path as crash reports.
 * Completely opt-in: all functions are no-ops when telemetry is disabled.
 *
 * Privacy guarantees (enforced here, auditable):
 *   - No task content, no user names, no workspace names, no email addresses
 *   - No IP addresses, no hostnames, no file paths containing user data
 *   - Counts are bucketed ("1-9", "10-49", etc.) — no exact numbers
 *   - Model family only (openai/anthropic/ollama/custom) — no model names or API keys
 *   - Sole identifier: a random anonymous instance UUID (set at install)
 *
 * What we DO collect (when opted in):
 *   - Task type (ops/coding/research/deployment/automation)
 *   - Task source (chat/dashboard/telegram/sentry/cron/etc.)
 *   - Task outcome (success/failure)
 *   - Cost bucket (not exact cost)
 *   - Model family (not provider name, not model ID)
 *   - Duration bucket
 *   - Sprint task count bucket, wave count bucket
 *   - Weekly heartbeat: active feature flags (booleans), version, task volume bucket
 */

import { getTelemetryConfig } from './posthog.js'
import pino from 'pino'

const logger = pino({ name: 'telemetry:events' })

// Points at the keyless relay — no API key in this codebase.
const TELEMETRY_INGEST = `${process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://telemetry.getplexo.com'}/ingest`

// ── Bucket helpers ─────────────────────────────────────────────────────────────

function bucketCount(n: number): string {
    if (n === 0) return '0'
    if (n < 10) return '1-9'
    if (n < 50) return '10-49'
    if (n < 200) return '50-199'
    if (n < 1000) return '200-999'
    return '1000+'
}

function bucketMs(ms: number): string {
    if (ms < 5_000) return '<5s'
    if (ms < 30_000) return '5-30s'
    if (ms < 120_000) return '30s-2m'
    if (ms < 600_000) return '2-10m'
    return '>10m'
}

function bucketCost(usd: number): string {
    if (usd === 0) return '$0'
    if (usd < 0.01) return '<$0.01'
    if (usd < 0.10) return '$0.01-$0.10'
    if (usd < 0.50) return '$0.10-$0.50'
    if (usd < 2.00) return '$0.50-$2.00'
    return '>$2.00'
}

/**
 * Classify a provider/model string to a generic family label.
 * Never exposes model IDs, API keys, or specific provider names.
 */
function modelFamily(provider: string | undefined): string {
    if (!provider) return 'unknown'
    const p = provider.toLowerCase()
    if (p.includes('anthropic') || p.includes('claude')) return 'anthropic'
    if (p.includes('openai') || p.includes('gpt') || p.includes('o1') || p.includes('o3')) return 'openai'
    if (p.includes('google') || p.includes('gemini')) return 'google'
    if (p.includes('ollama') || p.includes('llama') || p.includes('local')) return 'ollama'
    if (p.includes('mistral')) return 'mistral'
    if (p.includes('groq')) return 'groq'
    if (p.includes('deepseek')) return 'deepseek'
    if (p.includes('xai') || p.includes('grok')) return 'xai'
    if (p.includes('openrouter')) return 'openrouter'
    return 'custom'
}

// ── Core emit ──────────────────────────────────────────────────────────────────

async function emit(event: string, properties: Record<string, unknown>): Promise<void> {
    const { enabled, instanceId } = getTelemetryConfig()
    if (!enabled) return

    try {
        await fetch(TELEMETRY_INGEST, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                event,
                distinct_id: instanceId,
                properties: {
                    ...properties,
                    $lib: 'plexo-api',
                    plexo_version: process.env.npm_package_version ?? 'unknown',
                    node_version: process.version,
                },
                timestamp: new Date().toISOString(),
            }),
            signal: AbortSignal.timeout(5_000),
        })
    } catch (err) {
        logger.debug({ err, event }, 'Telemetry event POST failed — suppressed')
    }
}

// ── Public event functions ─────────────────────────────────────────────────────

/**
 * Emit a task_outcome event after a task completes or fails.
 *
 * Called from agent-loop.ts after completeTask().
 * All content is stripped — only metadata is sent.
 */
export function emitTaskOutcome(opts: {
    type: string          // ops, coding, research, deployment, automation
    source: string        // chat, dashboard, telegram, sentry, cron, etc.
    success: boolean
    durationMs: number
    costUsd: number
    provider: string | undefined  // will be bucketed to family
    stepCount: number
}): void {
    void emit('task_outcome', {
        task_type: opts.type,
        task_source: opts.source,
        success: opts.success,
        duration_bucket: bucketMs(opts.durationMs),
        cost_bucket: bucketCost(opts.costUsd),
        model_family: modelFamily(opts.provider),
        step_count_bucket: bucketCount(opts.stepCount),
    }).catch(() => { /* never throws */ })
}

/**
 * Emit a sprint_outcome event when a sprint finishes.
 *
 * Called from sprint-runner.ts after the final wave resolves.
 * No sprint name, no task content — count buckets only.
 */
export function emitSprintOutcome(opts: {
    taskCount: number
    waveCount: number
    success: boolean
    durationMs: number
    category: string      // general, code, etc.
}): void {
    void emit('sprint_outcome', {
        task_count_bucket: bucketCount(opts.taskCount),
        wave_count_bucket: bucketCount(opts.waveCount),
        category: opts.category,
        success: opts.success,
        duration_bucket: bucketMs(opts.durationMs),
    }).catch(() => { /* never throws */ })
}

/**
 * Daily heartbeat — feature inventory for an opted-in instance.
 *
 * Emits which features are active (booleans only, no names/values).
 * Scheduled once per 24h in index.ts.
 */
export async function emitHeartbeat(opts: {
    taskVolumeThisWeek: number
    memoryEntryCount: number
    activeIntegrations: {
        telegram: boolean
        slack: boolean
        discord: boolean
        github: boolean
        sentry: boolean
        memory: boolean
        sprints: boolean
        rsi: boolean
    }
}): Promise<void> {
    await emit('instance_heartbeat', {
        task_volume_bucket: bucketCount(opts.taskVolumeThisWeek),
        memory_entries_bucket: bucketCount(opts.memoryEntryCount),
        // Feature flags — booleans only, no config values
        has_telegram: opts.activeIntegrations.telegram,
        has_slack: opts.activeIntegrations.slack,
        has_discord: opts.activeIntegrations.discord,
        has_github: opts.activeIntegrations.github,
        has_sentry_webhook: opts.activeIntegrations.sentry,
        has_memory: opts.activeIntegrations.memory,
        has_sprints: opts.activeIntegrations.sprints,
        has_rsi: opts.activeIntegrations.rsi,
    })
}
/**
 * Emit when the RSI monitor generates a new proposal.
 * No hypothesis text — anomaly type only.
 */
export function emitRsiProposalCreated(anomalyType: string): void {
    void emit('rsi_proposal_created', {
        anomaly_type: anomalyType,
    }).catch(() => { /* never throws */ })
}

/**
 * Emit when an operator approves or rejects an RSI proposal.
 */
export function emitRsiProposalResolved(opts: {
    anomalyType: string
    action: 'approved' | 'rejected'
}): void {
    void emit('rsi_proposal_resolved', {
        anomaly_type: opts.anomalyType,
        action: opts.action,
    }).catch(() => { /* never throws */ })
}
