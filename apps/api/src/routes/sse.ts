import { Router, type Router as RouterType } from 'express'

export const sseRouter: RouterType = Router()

sseRouter.get('/', (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no', // disable nginx buffering
    })

    // Heartbeat every 30s
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n')
    }, 30000)

    // Initial connection
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`)

    req.on('close', () => {
        clearInterval(heartbeat)
    })
})
