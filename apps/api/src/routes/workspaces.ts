import { Router, type Router as RouterType } from 'express'
import { db, eq, desc } from '@plexo/db'
import { workspaces } from '@plexo/db'

export const workspacesRouter: RouterType = Router()

// GET /api/workspaces — list workspaces
workspacesRouter.get('/', async (_req, res) => {
    try {
        const rows = await db
            .select({ id: workspaces.id, name: workspaces.name, createdAt: workspaces.createdAt })
            .from(workspaces)
            .orderBy(desc(workspaces.createdAt))
            .limit(50)

        res.json({ items: rows, total: rows.length })
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list workspaces' } })
    }
})

// GET /api/workspaces/:id
workspacesRouter.get('/:id', async (req, res) => {
    try {
        const [ws] = await db
            .select({ id: workspaces.id, name: workspaces.name, settings: workspaces.settings, createdAt: workspaces.createdAt })
            .from(workspaces)
            .where(eq(workspaces.id, req.params.id))
            .limit(1)

        if (!ws) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Workspace not found' } })
            return
        }
        res.json(ws)
    } catch (err) {
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get workspace' } })
    }
})
