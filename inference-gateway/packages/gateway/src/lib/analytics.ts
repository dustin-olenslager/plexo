import { PostHog } from 'posthog-node'

const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY || 'phc_NNJrGRLnopoR73cofmbbHEG05S2kSfCz93nQVOJlxQH'
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://telemetry.getplexo.com'

let _client: PostHog | null = null

function getClient(): PostHog | null {
  if (!POSTHOG_API_KEY) return null
  if (!_client) {
    _client = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
      flushAt: 10,
      flushInterval: 5000,
    })
  }
  return _client
}

const SERVICE = 'inference-gateway'

/** Fire-and-forget event capture. Never throws. */
export function captureEvent(
  event: string,
  properties: Record<string, unknown> = {},
  // Use a stable anonymous distinct_id for server-side service events
  distinctId = `service:${SERVICE}`,
) {
  const client = getClient()
  if (!client) return
  try {
    client.capture({
      distinctId,
      event,
      properties: {
        service: SERVICE,
        environment: process.env.NODE_ENV || 'production',
        ...properties,
      },
    })
  } catch {
    // analytics must never affect the request path
  }
}

/** Track a completed inference request. */
export function captureInference(opts: {
  instanceId: string
  workspaceId: string
  provider: string
  model: string
  taskType?: string
  tokensInput: number
  tokensOutput: number
  tokensThinking?: number
  latencyMs: number
  totalCostUsd: number
  billedCostUsd: number
  error?: string
}) {
  captureEvent(
    opts.error ? 'inference.error' : 'inference.completed',
    {
      instance_id: opts.instanceId,
      workspace_id: opts.workspaceId,
      provider: opts.provider,
      model: opts.model,
      task_type: opts.taskType,
      tokens_input: opts.tokensInput,
      tokens_output: opts.tokensOutput,
      tokens_thinking: opts.tokensThinking ?? 0,
      latency_ms: opts.latencyMs,
      total_cost_usd: Number(opts.totalCostUsd.toFixed(8)),
      billed_cost_usd: Number(opts.billedCostUsd.toFixed(8)),
      error: opts.error,
    },
    `instance:${opts.instanceId}`,
  )
}

/** Track quota violations / auth failures. */
export function captureAuthEvent(event: 'auth.failed' | 'auth.quota_exceeded' | 'auth.rate_limited', props: Record<string, unknown> = {}) {
  captureEvent(event, props)
}

/** Track instance registration. */
export function captureRegistration(instanceId: string, plexoVersion?: string) {
  captureEvent('instance.registered', { instance_id: instanceId, plexo_version: plexoVersion }, `instance:${instanceId}`)
}

export async function shutdownAnalytics() {
  if (_client) {
    await _client.shutdown()
  }
}
