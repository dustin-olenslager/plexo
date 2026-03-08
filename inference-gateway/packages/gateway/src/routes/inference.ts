import { Router, Request, Response, NextFunction } from 'express'
import { authenticateRequest, AuthRequest } from '../middleware/authenticate'
import { validateEnvelope } from '../middleware/validateEnvelope'
import { checkQuota } from '../middleware/quota'
import { rateLimiter } from '../middleware/rateLimiter'
import { routeRequest } from '../providers/router'
import { recordUsage } from '../billing/usage'

export const inferenceRouter = Router()

// We need an express.json() with rawBody verify inside the router or globally
// Global index.ts handles standard express.json(). We'll override specifically for inference later if needed.
// Actually globally it was set to limit 1mb but no buffer. I will change index.ts to export the app but 
// handle verify hook globally so rawBody is bound to AuthRequest.

inferenceRouter.post('/v1/infer', 
  validateEnvelope as any, 
  authenticateRequest as any, 
  rateLimiter, 
  checkQuota, 
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { provider, model, adapter } = routeRequest(req.body)

      const startMs = Date.now()
      
      if (req.body.stream) {
        // Implementation of stream
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        
        // This is a simplified demo for the planner
        // In real execution, we iterate adapter.stream()
        res.write(`data: ${JSON.stringify({ error: 'streaming_not_implemented_yet' })}\n\n`)
        res.end()
        return
      }
      
      // non-streaming
      const upstreamRes = await adapter.call(req.body, model)
      const latencyMs = Date.now() - startMs
      const usage = adapter.extractUsage(upstreamRes)
      
      const rates = adapter.costPerToken(model)
      
      const totalCostUsd = (usage.tokens_input * rates.input + usage.tokens_output * rates.output) / 1000000
      const billedCostUsd = totalCostUsd * 1.5 // 50% Plexo margin

      // write usage async
      recordUsage(
        res.locals.apiKey.id,
        res.locals.instance.id,
        req.body.plexo_task_id,
        req.body.task_type,
        provider,
        model,
        usage.tokens_input,
        usage.tokens_output,
        totalCostUsd,
        billedCostUsd,
        latencyMs,
        res.locals.windows || [],
        usage.tokens_thinking || 0,
        usage.cache_write_tokens || 0,
        usage.cache_read_tokens || 0
      )

      res.status(200).json({
        gateway_request_id: (req as any).id,
        provider_used: provider,
        model_used: model,
        routing_reason: `task_type=${req.body.task_type}, preferred_provider=${req.body.preferred_provider || 'default'}`,
        usage: {
          ...usage,
          quota_remaining_daily: null, // calculate this later if needed
          quota_remaining_monthly: null,
        },
        content: upstreamRes.content || [],
        stop_reason: upstreamRes.stop_reason || 'stop',
      })
      
    } catch (err: any) {
      if (err.message && err.message.startsWith('provider_not_supported')) {
        res.status(400).json({ error: err.message })
        return
      }
      next(err)
    }
})
