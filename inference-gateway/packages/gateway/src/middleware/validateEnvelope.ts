import { Request, Response, NextFunction } from 'express'
import { PlexoInferenceRequestSchema } from '../lib/envelope'
import { logger } from '../lib/logger'

export const validateEnvelope = (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = PlexoInferenceRequestSchema.safeParse(req.body)
    if (!result.success) {
      // Return 400 for structural invalidity
      res.status(400).json({ 
        error: 'invalid_envelope',
        details: result.error.errors 
      })
      return
    }
    req.body = result.data
    next()
  } catch (err) {
    logger.error({ err }, 'Envelope validation failed with exception')
    res.status(500).json({ error: 'internal_server_error' })
  }
}
