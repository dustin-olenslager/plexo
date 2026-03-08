import Redis from 'ioredis'
import { config } from '../config'
import { logger } from '../lib/logger'

export const cache = new Redis(config.VALKEY_URL, {
  maxRetriesPerRequest: 3,
})

cache.on('error', (err) => {
  logger.error({ err }, 'Valkey connection error')
})
