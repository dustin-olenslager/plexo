import { ProviderAdapter } from './router'
import { PlexoInferenceRequest } from '../lib/envelope'
import { config } from '../config'

export const OpenAIAdapter: ProviderAdapter = {
  name: 'openai',
  async call(request: PlexoInferenceRequest, model: string) {
    const url = 'https://api.openai.com/v1/chat/completions'
    
    const messages = []
    if (request.system) {
      messages.push({ role: 'system', content: request.system })
    }
    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content })
    }
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.OPENAI_API_KEY || ''}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: request.max_tokens || 4096,
        messages,
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Upstream Error: ${res.status} ${errorText}`)
    }

    const data = await res.json()
    const message = data.choices && data.choices[0] && data.choices[0].message
    const content = message ? [{ type: 'text', text: message.content }] : []
    
    return {
      content,
      stop_reason: data.choices && data.choices[0] ? data.choices[0].finish_reason : 'stop',
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
      tokens_input: response.usage.prompt_tokens || 0,
      tokens_output: response.usage.completion_tokens || 0,
      tokens_thinking: response.usage.completion_tokens_details?.reasoning_tokens || 0,
      cache_read_tokens: response.usage.prompt_tokens_details?.cached_tokens || 0,
    }
  },

  costPerToken(model: string) {
    if (model.includes('o1')) return { input: 15.0, output: 60.0 }
    if (model.includes('o3-mini')) return { input: 1.1, output: 4.4 }
    if (model.includes('gpt-4o-mini')) return { input: 0.15, output: 0.6 }
    if (model.includes('gpt-4o')) return { input: 2.5, output: 10.0 }
    return { input: 2.5, output: 10.0 }
  }
}
