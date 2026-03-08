import { PostHog } from 'posthog-node'

const API_KEY = process.env.POSTHOG_API_KEY || 'phc_NNJrGRLnopoR73cofmbbHEG05S2kSfCz93nQVOJlxQH'
const HOST = process.env.POSTHOG_HOST || 'https://telemetry.getplexo.com'
const SERVICE = 'gateway-admin'

let _client: PostHog | null = null

function getClient(): PostHog | null {
  if (!API_KEY) return null
  if (!_client) {
    _client = new PostHog(API_KEY, { host: HOST, flushAt: 5, flushInterval: 3000 })
  }
  return _client
}

export function captureAdminEvent(
  event: string,
  properties: Record<string, unknown> = {},
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
    // analytics must never throw
  }
}
