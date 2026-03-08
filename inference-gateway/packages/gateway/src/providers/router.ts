import { PlexoInferenceRequest } from '../lib/envelope'

export interface ProviderAdapter {
  name: string
  call(request: PlexoInferenceRequest, model: string): Promise<any>
  stream(request: PlexoInferenceRequest, model: string): AsyncIterable<any>
  extractUsage(response: any): {
    tokens_input: number
    tokens_output: number
    tokens_thinking?: number
    cache_write_tokens?: number
    cache_read_tokens?: number
  }
  costPerToken(model: string): { input: number; output: number; cacheWrite?: number; cacheRead?: number }
}

const GATEWAY_DEFAULTS: Record<string, { provider: string; model: string }> = {
  planning:        { provider: 'anthropic', model: 'claude-3-7-sonnet-latest' },
  code_generation: { provider: 'anthropic', model: 'claude-3-7-sonnet-latest' },
  verification:    { provider: 'anthropic', model: 'claude-3-7-sonnet-latest' },
  classification:  { provider: 'anthropic', model: 'claude-3-5-haiku-latest' },
  summarization:   { provider: 'anthropic', model: 'claude-3-5-haiku-latest' },
  research:        { provider: 'openai',    model: 'gpt-4o-mini' },
  embedding:       { provider: 'openai',    model: 'text-embedding-3-small' },
  ops:             { provider: 'anthropic', model: 'claude-3-5-haiku-latest' },
}

import { AnthropicAdapter } from './anthropic'
import { OpenAIAdapter } from './openai'

export const adapters: Record<string, ProviderAdapter> = {
  anthropic: AnthropicAdapter,
  openai: OpenAIAdapter,
}

export function routeRequest(reqBody: PlexoInferenceRequest) {
  let providerToUse = reqBody.preferred_provider
  let modelToUse = reqBody.preferred_model

  if (!providerToUse || !modelToUse) {
    const defaultRoute = GATEWAY_DEFAULTS[reqBody.task_type] || GATEWAY_DEFAULTS['ops']
    providerToUse = providerToUse || defaultRoute.provider
    modelToUse = modelToUse || defaultRoute.model
  }

  const adapter = adapters[providerToUse]
  if (!adapter) {
    throw new Error(`provider_not_supported: ${providerToUse}`)
  }
  
  return { provider: providerToUse, model: modelToUse, adapter }
}
