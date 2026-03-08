import { db } from '../db/client'
import { anomalyEvents } from '../db/schema'
import { logger } from '../lib/logger'

export async function logAnomaly(
  type: string,
  apiKeyId: string | null = null,
  instanceId: string | null = null,
  details: Record<string, any> = {}
) {
  setImmediate(async () => {
    try {
      await db.insert(anomalyEvents).values({
        anomalyType: type,
        apiKeyId,
        instanceId,
        details,
        createdAt: new Date(),
      })
      logger.warn({ anomalyType: type, apiKeyId, instanceId, details }, 'Anomaly flagged')

      // Future: Trigger webhook here based on config.ANOMALY_WEBHOOK_URL
    } catch (err) {
      logger.error({ err }, 'Failed to write anomaly to DB')
    }
  })
}
