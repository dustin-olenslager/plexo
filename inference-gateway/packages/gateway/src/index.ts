import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import pinoHttp from 'pino-http'
import { config } from './config'
import { logger } from './lib/logger'
import { inferenceRouter } from './routes/inference'
import { registerRouter } from './routes/register'

const app = express()

app.use(cors())
// Raw body is required for signature verification in inference router
app.use(express.json({ 
  limit: '1mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf
  }
}))

app.use((req: any, res, next) => {
  req.id = crypto.randomUUID()
  res.setHeader('X-Gateway-Request-Id', req.id)
  next()
})

app.use(pinoHttp({
  logger,
  customProps: (req: any) => ({ request_id: req.id })
}))

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: process.env.npm_package_version || '1.0.0',
    uptime_seconds: process.uptime(),
    checks: {
      postgres: 'ok',
      valkey: 'ok',
      providers: {
        anthropic: 'ok',
        openai: 'ok',
      }
    }
  })
})

app.use('/', inferenceRouter)
app.use('/', registerRouter)

app.listen(config.GATEWAY_PORT, () => {
  logger.info(`Plexo Inference Gateway started on port ${config.GATEWAY_PORT}`)
})
