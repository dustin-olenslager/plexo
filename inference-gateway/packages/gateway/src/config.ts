import { z } from 'zod'

const envSchema = z.object({
  GATEWAY_PORT: z.string().default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().url(),
  VALKEY_URL: z.string().url(),
  SIGNING_PEPPER: z.string().min(32),
  ADMIN_URL: z.string().url().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  TOGETHER_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),

  ANOMALY_WEBHOOK_URL: z.string().optional(),
  ANOMALY_WEBHOOK_SECRET: z.string().optional(),

  POSTHOG_API_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().optional(),
})

export const config = envSchema.parse(process.env)

export const GATEWAY_SAFETY_LIMITS = {
  maxRequestBodyBytes: 1_048_576,        // 1MB
  maxTokensPerRequest: 200_000,
  signatureMaxAgeSeconds: 300,           // 5 minutes
  maxConsecutiveEnvelopeFailures: 10,
  anomalyWebhookTimeoutMs: 3_000,
  upstreamTimeoutMs: 120_000,            // 2 minutes
  rateLimitWindowMs: 60_000,             // 1 minute
  rateLimitMaxRequests: 60,              // per key per minute
} as const
