import { Request, Response, NextFunction } from 'express'
import { db } from '../db/client'
import { quotaWindows } from '../db/schema'
import { and, eq } from 'drizzle-orm'
import { startOfDay, startOfWeek, startOfMonth, endOfDay, endOfWeek, endOfMonth } from 'date-fns'
import { cache } from '../cache/client'

export const checkQuota = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const apiKey = res.locals.apiKey
    if (!apiKey) return res.status(500).json({ error: 'unauthenticated' })

    const now = new Date()
    const dailyStart = startOfDay(now)
    const weeklyStart = startOfWeek(now, { weekStartsOn: 1 })
    const monthlyStart = startOfMonth(now)

    if (!apiKey.quotaTokensDaily && !apiKey.quotaTokensWeekly && !apiKey.quotaTokensMonthly && !apiKey.quotaRequestsDaily) {
      next()
      return
    }

    const checkWindow = async (type: 'daily' | 'weekly' | 'monthly', limit: number | null, limitRequests: number | null, start: Date, endStr: Date) => {
      if (limit === null && limitRequests === null) return { allowed: true, endStr }
      
      const ts = start.getTime()
      const tokensKey = `qa:${apiKey.id}:${type}:${ts}:t`
      const reqsKey = `qa:${apiKey.id}:${type}:${ts}:r`
      
      let tokensUsedStr = await cache.get(tokensKey)
      let reqsUsedStr = await cache.get(reqsKey)
      
      if (tokensUsedStr === null || reqsUsedStr === null) {
        const windowDoc = await db.query.quotaWindows.findFirst({
          where: and(
            eq(quotaWindows.apiKeyId, apiKey.id),
            eq(quotaWindows.windowType, type),
            eq(quotaWindows.windowStart, start)
          )
        })
        tokensUsedStr = windowDoc ? windowDoc.tokensUsed.toString() : '0'
        reqsUsedStr = windowDoc ? windowDoc.requestsUsed.toString() : '0'
        
        await cache.set(tokensKey, tokensUsedStr, 'EX', 32 * 24 * 60 * 60)
        await cache.set(reqsKey, reqsUsedStr, 'EX', 32 * 24 * 60 * 60)
      }

      const tokensUsed = parseInt(tokensUsedStr, 10)
      const reqsUsed = parseInt(reqsUsedStr, 10)

      if (limit !== null && tokensUsed >= limit) {
        return { allowed: false, error: 'quota_exceeded', window: type, limitType: 'tokens', endStr }
      }
      if (limitRequests !== null && reqsUsed >= limitRequests) {
        return { allowed: false, error: 'quota_exceeded', window: type, limitType: 'requests', endStr }
      }
      
      return { allowed: true, tokensUsed, reqsUsed, limit, limitRequests, tokensKey, reqsKey, start, endStr }
    }

    const checks = [
      { type: 'daily' as const, ts: dailyStart, end: endOfDay(now), tokens: apiKey.quotaTokensDaily, requests: apiKey.quotaRequestsDaily },
      { type: 'weekly' as const, ts: weeklyStart, end: endOfWeek(now, { weekStartsOn: 1 }), tokens: apiKey.quotaTokensWeekly, requests: null },
      { type: 'monthly' as const, ts: monthlyStart, end: endOfMonth(now), tokens: apiKey.quotaTokensMonthly, requests: null }
    ]

    res.locals.windows = []

    for (const c of checks) {
      const result = await checkWindow(c.type, c.tokens, c.requests, c.ts, c.end)
      if (!result.allowed) {
        res.status(429).json({ 
          error: 'quota_exceeded', 
          window: c.type, 
          resets_at: result.endStr.toISOString(),
          quota_remaining: 0
        })
        return
      }
      if (result.limit !== null || result.limitRequests !== null) {
        res.locals.windows.push({ type: c.type, ...result })
      }
    }

    next()
  } catch (err) {
    next(err)
  }
}
