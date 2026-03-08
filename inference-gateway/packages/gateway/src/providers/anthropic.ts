import { ProviderAdapter } from './router'
import { PlexoInferenceRequest } from '../lib/envelope'
import { config } from '../config'

export const AnthropicAdapter: ProviderAdapter = {
  name: 'anthropic',
  async call(request: PlexoInferenceRequest, model: string) {
    const url = 'https://api.anthropic.com/v1/messages'
    
    const messages = request.messages.map(m => {
      // Basic support for our envelope to Anthropic format
      if (typeof m.content === 'string') {
        return { role: m.role, content: m.content }
      }
      return m
    })
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': config.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.max_tokens || 8192,
        messages,
        system: request.system,
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Upstream Error: ${res.status} ${errorText}`)
    }

    const data = await res.json()
    return {
      content: data.content,
      stop_reason: data.stop_reason,
      usage: data.usage
    }
  },

  async *stream(request: PlexoInferenceRequest, model: string) {
    throw new Error('Streaming not implemented')
  },

  extractUsage(response: any) {
    if (!response || !response.usage) {
      return { tokens_input: 0, tokens_output: 0 }
    }
    return {
      tokens_input: response.usage.input_tokens || 0,
      tokens_output: response.usage.output_tokens || 0,
      cache_read_tokens: response.usage.cache_read_input_tokens || 0,
      cache_write_tokens: response.usage.cache_creation_input_tokens || 0,
    }
  },

  costPerToken(model: string) {
    if (model.includes('sonnet')) return { input: 3.0, output: 15.0 }
    if (model.includes('haiku')) return { input: 0.25, output: 1.25 }
    if (model.includes('opus')) return { input: 15.0, output: 75.0 }
    return { input: 3.0, output: 15.0 }
  }
}
