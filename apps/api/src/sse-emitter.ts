import type { Response } from 'express'

/** Connected SSE clients — keyed by workspace ID, then a unique connection ID */
const clients = new Map<string, Map<string, Response>>()
let connId = 0

export function registerClient(workspaceId: string, res: Response): string {
    const id = String(++connId)
    if (!clients.has(workspaceId)) {
        clients.set(workspaceId, new Map())
    }
    clients.get(workspaceId)!.set(id, res)
    return id
}

export function unregisterClient(workspaceId: string, id: string): void {
    clients.get(workspaceId)?.delete(id)
}

export interface AgentEvent {
    type: string
    [key: string]: unknown
}

/** Emit an event to all connected clients for a workspace */
export function emitToWorkspace(workspaceId: string, event: AgentEvent): void {
    const workspace = clients.get(workspaceId)
    if (!workspace) return

    const data = `data: ${JSON.stringify(event)}\n\n`
    for (const [id, res] of workspace) {
        try {
            res.write(data)
        } catch {
            workspace.delete(id)
        }
    }
}

/** Emit an event to all connected clients across all workspaces */
export function emit(event: AgentEvent): void {
    const data = `data: ${JSON.stringify(event)}\n\n`
    for (const workspace of clients.values()) {
        for (const [id, res] of workspace) {
            try {
                res.write(data)
            } catch {
                workspace.delete(id)
            }
        }
    }
}

export function connectedCount(): number {
    let total = 0
    for (const workspace of clients.values()) total += workspace.size
    return total
}
