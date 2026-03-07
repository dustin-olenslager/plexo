import { Router, type Router as RouterType } from 'express'
import { db, desc, sql } from '@plexo/db'
import { conversations } from '@plexo/db'
import { logger } from '../logger.js'

export const conversationsRouter: RouterType = Router()

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// ── GET /api/v1/conversations?workspaceId=&limit=&cursor= ─────────────────────
// Returns all conversation records for a workspace, newest first.
// These are pure interaction logs — not tasks.

conversationsRouter.get('/', async (req, res) => {
    const { workspaceId, limit = '50', cursor } = req.query as Record<string, string>

    if (!workspaceId) {
        res.status(400).json({ error: { code: 'MISSING_WORKSPACE', message: 'workspaceId required' } })
        return
    }
    if (!UUID_RE.test(workspaceId)) {
        res.json({ items: [], nextCursor: null })
        return
    }

    try {
        const lim = Math.min(parseInt(limit, 10) || 50, 200)

        const items = cursor
            ? await db.select().from(conversations)
                .where(sql`workspace_id = ${workspaceId} AND id < ${cursor}`)
                .orderBy(desc(conversations.createdAt))
                .limit(lim)
            : await db.select().from(conversations)
                .where(sql`workspace_id = ${workspaceId}`)
                .orderBy(desc(conversations.createdAt))
                .limit(lim)

        const nextCursor = items.length === lim ? (items[items.length - 1]?.id ?? null) : null

        res.json({ items, nextCursor })
    } catch (err) {
        logger.error({ err }, 'GET /api/v1/conversations failed')
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch conversations' } })
    }
})
