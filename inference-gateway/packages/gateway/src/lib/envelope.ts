import { z } from 'zod'

export const PlexoInferenceRequestSchema = z.object({
  plexo_instance_id: z.string().uuid(),
  plexo_task_id: z.string(),
  plexo_workspace_id: z.string(),
  task_type: z.enum([
    'planning', 'code_generation', 'verification',
    'classification', 'summarization', 'research',
    'embedding', 'ops'
  ]),
  preferred_provider: z.string().optional(),
  preferred_model: z.string().optional(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.union([z.string(), z.array(z.any())]),
  })),
  system: z.string().optional(),
  max_tokens: z.number().int().positive().max(200000),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().default(false),
  cache_system: z.boolean().default(false),
  cache_messages: z.array(z.number()).optional(),
  tools: z.array(z.any()).optional(),
  tool_choice: z.any().optional(),
})

export type PlexoInferenceRequest = z.infer<typeof PlexoInferenceRequestSchema>

export const PlexoInferenceResponseSchema = z.object({
  gateway_request_id: z.string().uuid(),
  provider_used: z.string(),
  model_used: z.string(),
  routing_reason: z.string(),
  usage: z.object({
    tokens_input: z.number(),
    tokens_output: z.number(),
    tokens_thinking: z.number().default(0),
    cache_write_tokens: z.number().default(0),
    cache_read_tokens: z.number().default(0),
    quota_remaining_daily: z.number().nullable(),
    quota_remaining_monthly: z.number().nullable(),
  }),
  content: z.array(z.object({
    type: z.enum(['text', 'tool_use', 'tool_result']),
    text: z.string().optional(),
    tool_use: z.any().optional(),
  })),
  stop_reason: z.string(),
})
