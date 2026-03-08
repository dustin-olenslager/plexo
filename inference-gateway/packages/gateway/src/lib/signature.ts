import crypto from 'crypto'
import { config, GATEWAY_SAFETY_LIMITS } from '../config'

export function generateSigningSecret() {
  return crypto.randomBytes(32).toString('hex')
}

export function verifySignature(
  secret: string,
  timestampStr: string,
  instanceId: string,
  rawBody: Buffer,
  signature: string
): boolean {
  try {
    const timestamp = parseInt(timestampStr, 10)
    if (isNaN(timestamp)) return false
    
    const now = Date.now() / 1000
    if (Math.abs(now - timestamp) > GATEWAY_SAFETY_LIMITS.signatureMaxAgeSeconds) {
      return false
    }

    const bodyHash = crypto.createHash('sha256').update(rawBody).digest('hex')
    const payload = `${timestamp}${instanceId}${bodyHash}`
    
    const hmac = crypto.createHmac('sha256', secret + config.SIGNING_PEPPER)
    hmac.update(payload)
    const expected = hmac.digest('hex')
    
    if (expected.length !== signature.length) return false
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))
  } catch {
    return false
  }
}
