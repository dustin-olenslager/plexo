import { Router, type Router as RouterType } from 'express'

export const healthRouter: RouterType = Router()

healthRouter.get('/', async (_req, res) => {
    const startTime = Date.now()

    // In Phase 1 these are stubs — replaced with real checks in Phase 2+
    const services = {
        postgres: { ok: true, latencyMs: 0 },
        redis: { ok: true, latencyMs: 0 },
        anthropic: { ok: false, latencyMs: 0 },
    }

    // TODO: real DB/Redis pings in Phase 2
    const allOk = Object.values(services).every((s) => s.ok)

    const response = {
        status: allOk ? 'ok' : 'degraded',
        services,
        version: '0.1.0',
        uptime: Math.floor(process.uptime()),
    }

    res.status(allOk ? 200 : 503).json(response)
})
