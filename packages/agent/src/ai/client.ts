import Anthropic from '@anthropic-ai/sdk'
import { resolveAnthropicHeaders } from '../ai/anthropic-oauth.js'
import type { AnthropicCredential } from '../types.js'

/**
 * Thin factory that returns an Anthropic client using whatever credential
 * type is stored for the workspace — API key or OAuth subscription token.
 * Credentials are fetched fresh at call time via the provided getter; the
 * client is never cached across requests.
 */
export async function buildAnthropicClient(
    credential: AnthropicCredential,
    onCredentialRefresh?: (updated: AnthropicCredential) => Promise<void>,
): Promise<Anthropic> {
    const headers = await resolveAnthropicHeaders(credential, onCredentialRefresh)

    // Anthropic SDK accepts a defaultHeaders override — this transparently
    // switches between x-api-key (API key) and Authorization: Bearer (OAuth).
    if (credential.type === 'api_key') {
        return new Anthropic({ apiKey: credential.apiKey })
    }

    // OAuth path — use Bearer token via defaultHeaders, blank apiKey
    return new Anthropic({
        apiKey: 'oauth', // SDK requires a non-empty string; it's overridden by headers
        defaultHeaders: headers,
    })
}
