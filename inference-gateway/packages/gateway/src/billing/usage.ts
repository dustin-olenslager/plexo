import { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'
import { db } from '../db/client'
import { usageRecords, quotaWindows } from '../db/schema'
import { cache } from '../cache/client'
import { sql } from 'drizzle-orm'

export async function recordUsage(
  apiKeyId: string,
  instanceId: string,
  taskId: string | null | undefined,
  taskType: string | null | undefined,
  provider: string,
  model: string,
  tokensInput: number,
  tokensOutput: number,
  totalCostUsd: number,
  billedCostUsd: number,
  latencyMs: number,
  windowsContext: any[], // Array of window definitions from auth logic to deduct
  tokensThinking: number = 0,
  cacheWriteTokens: number = 0,
  cacheReadTokens: number = 0
) {
  try {
    const totalTokens = tokensInput + tokensOutput + tokensThinking
    
    // Write usage record
    await db.insert(usageRecords).values({
      apiKeyId,
      instanceId,
      taskId: taskId || null,
      taskType: taskType || null,
      provider,
      model,
      tokensInput,
      tokensOutput,
      tokensThinking,
      cacheWriteTokens,
      cacheReadTokens,
      latencyMs,
      totalCostUsd: totalCostUsd.toString(),
      billedCostUsd: billedCostUsd.toString(),
      createdAt: new Date(),
    })

    // Update quota windows
    for (const w of windowsContext) {
      if (!w) continue
      const { type, tokensKey, reqsKey, start, endStr } = w

      // Increment Valkey hot counter
      await cache.incrby(tokensKey, totalTokens)
      await cache.incr(reqsKey)

      // Sync Postgres 
      await db.insert(quotaWindows).values({
        apiKeyId,
        windowType: type,
        windowStart: start,
        windowEnd: endStr,
        tokensUsed: totalTokens,
        requestsUsed: 1,
      }).onConflictDoUpdate({
        target: [quotaWindows.apiKeyId, quotaWindows.windowType, quotaWindows.windowStart],
        set: {
          tokensUsed: sql`quota_windows.tokens_used + ${totalTokens}`,
          requestsUsed: sql`quota_windows.requests_used + 1`,
        }
      })
    }
  } catch (err) {
    logger.error({ err }, 'Failed to record usage and deduct quota')
  }
}
