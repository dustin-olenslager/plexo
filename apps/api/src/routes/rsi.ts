import { Router, type Router as RouterType } from 'express'
import { db, rsiProposals, eq, and, desc } from '@plexo/db'

export const rsiRouter: RouterType = Router({ mergeParams: true })

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

rsiRouter.get('/proposals', async (req, res, next) => {
    try {
        const { id: workspaceId } = req.params as Record<string, string>
        
        if (!workspaceId || !UUID_RE.test(workspaceId)) {
            return res.status(400).json({ error: 'Invalid workspace ID' })
        }

        const proposals = await db.select()
            .from(rsiProposals)
            .where(eq(rsiProposals.workspaceId, workspaceId))
            .orderBy(desc(rsiProposals.createdAt))
            .limit(50)

        res.json({ items: proposals })
    } catch (err) {
        next(err)
    }
})

rsiRouter.post('/proposals/:proposalId/approve', async (req, res, next) => {
    try {
        const { id: workspaceId, proposalId } = req.params as Record<string, string>

        if (!workspaceId || !UUID_RE.test(workspaceId) || !proposalId || !UUID_RE.test(proposalId)) {
            return res.status(400).json({ error: 'Invalid workspace or proposal ID' })
        }

        const [updated] = await db.update(rsiProposals)
            .set({ status: 'approved', approvedAt: new Date() })
            .where(and(eq(rsiProposals.id, proposalId), eq(rsiProposals.workspaceId, workspaceId)))
            .returning()

        if (!updated) {
            return res.status(404).json({ error: 'Proposal not found' })
        }

        res.json(updated)
    } catch (err) {
        next(err)
    }
})

rsiRouter.post('/proposals/:proposalId/reject', async (req, res, next) => {
    try {
        const { id: workspaceId, proposalId } = req.params as Record<string, string>

        if (!workspaceId || !UUID_RE.test(workspaceId) || !proposalId || !UUID_RE.test(proposalId)) {
            return res.status(400).json({ error: 'Invalid workspace or proposal ID' })
        }

        const [updated] = await db.update(rsiProposals)
            .set({ status: 'rejected', rejectedAt: new Date() })
            .where(and(eq(rsiProposals.id, proposalId), eq(rsiProposals.workspaceId, workspaceId)))
            .returning()

        if (!updated) {
            return res.status(404).json({ error: 'Proposal not found' })
        }

        res.json(updated)
    } catch (err) {
        next(err)
    }
})
