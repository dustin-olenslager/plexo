import { Request, Response, NextFunction } from 'express'
import { cache } from '../cache/client'
import { GATEWAY_SAFETY_LIMITS } from '../config'

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = res.locals.apiKey
  if (!apiKey) return next()

  const key = `rl:${apiKey.id}`
  const count = await cache.incr(key)
  if (count === 1) {
    await cache.pexpire(key, GATEWAY_SAFETY_LIMITS.rateLimitWindowMs)
  }

  if (count > GATEWAY_SAFETY_LIMITS.rateLimitMaxRequests) {
    res.status(429).json({ error: 'rate_limited' })
    return
  }

  next()
}
