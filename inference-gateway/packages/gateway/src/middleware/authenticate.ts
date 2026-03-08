import { Request, Response, NextFunction } from 'express'
import { db } from '../db/client'
import { apiKeys, instances } from '../db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcrypt'
import { logger } from '../lib/logger'
import { verifySignature } from '../lib/signature'
import { PlexoInferenceRequest } from '../lib/envelope'
import { logAnomaly } from './anomaly'

// We inject rawBody via Express verify callback
export interface AuthRequest extends Request {
  rawBody?: Buffer
  body: PlexoInferenceRequest
}

export const authenticateRequest = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer plx_')) {
      res.status(401).json({ error: 'missing_or_invalid_auth_header' })
      return
    }

    const rawKey = authHeader.replace('Bearer ', '')
    const keyPrefix = rawKey.substring(0, 8)

    // Check 1: Extract and validate API key
    // Get all keys with this prefix to check hash (in reality you might want to identify keys better, 
    // but the prompt implies hashing. Usually keys have a prefix and an ID part, but we'll do prefix match and then bcrypt)
    // Wait, bcrypt compare is slow to do over many records. We should look up by some identifier.
    // We'll assume the prefix is unique enough, or we can look up by prefix and check hash.
    const potentialKeys = await db.query.apiKeys.findMany({
      where: eq(apiKeys.keyPrefix, keyPrefix),
      with: {
        instance: true,
      }
    })

    if (potentialKeys.length === 0) {
      res.status(401).json({ error: 'invalid_key' })
      return
    }

    // Find matching key
    let validKey = null
    for (const key of potentialKeys) {
      if (await bcrypt.compare(rawKey, key.keyHash)) {
        validKey = key
        break
      }
    }

    if (!validKey) {
      res.status(401).json({ error: 'invalid_key' })
      return
    }

    if (validKey.status !== 'active' || (validKey.expiresAt && validKey.expiresAt < new Date())) {
      res.status(401).json({ error: 'key_inactive_or_expired' })
      return
    }

    if (!validKey.instance) {
      res.status(401).json({ error: 'unbound_key' })
      return
    }

    // Check 2: Validate instance binding
    const payloadInstanceId = req.body.plexo_instance_id
    if (!payloadInstanceId || payloadInstanceId !== validKey.instance.instanceId) {
      await logAnomaly('signature_mismatch', validKey.id, validKey.instanceId, { expected: validKey.instance.instanceId, received: payloadInstanceId })
      // Suspension logic is handled in logAnomaly depending on config
      res.status(401).json({ error: 'instance_binding_mismatch' })
      return
    }

    if (validKey.instance.status !== 'active') {
      res.status(403).json({ error: 'instance_suspended' })
      return
    }

    // Check 3: Verify instance signature
    const signature = req.headers['x-plexo-signature'] as string
    const timestamp = req.headers['x-plexo-timestamp'] as string
    
    if (!signature || !timestamp || !req.rawBody) {
      res.status(401).json({ error: 'missing_signature_headers' })
      return
    }

    const isValidSignature = verifySignature(
      validKey.instance.signingSecret, 
      timestamp, 
      payloadInstanceId, 
      req.rawBody, 
      signature
    )

    if (!isValidSignature) {
      await logAnomaly('signature_mismatch', validKey.id, validKey.instanceId, { reason: 'invalid_hmac' })
      res.status(401).json({ error: 'invalid_signature' })
      return
    }

    // Attach to res.locals
    res.locals.apiKey = validKey
    res.locals.instance = validKey.instance
    res.locals.workspaceId = validKey.workspaceId

    next()
  } catch (error) {
    logger.error({ err: error }, 'Authentication middleware failed')
    res.status(500).json({ error: 'internal_server_error' })
  }
}
