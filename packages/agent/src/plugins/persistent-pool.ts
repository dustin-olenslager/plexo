/**
 * Kapsel Persistent Worker Pool (§5.4)
 *
 * Maintains ONE persistent Worker per enabled extension, reused across all
 * tool invocations. Replaces the ephemeral one-Worker-per-call model.
 *
 * Lifecycle:
 *   getWorker(ext)  → spawn + activate if not exists; return handle
 *   invokeTool(...)  → send 'invoke' msg, await response (with per-call timeout)
 *   terminateWorker(ext) → send 'terminate', remove from map
 *   terminateAll()   → called on process shutdown
 *
 * Crash recovery (§5.4):
 *   If a worker crashes mid-invocation, its Promise rejects and the worker
 *   is removed from the map. Next call re-spawns and re-activates.
 *   The extension's sys.extension.crashed event is emitted via Event Bus.
 *
 * Timeout (§5.3):
 *   Each invocation has a hard deadline. The call Promise races against a
 *   timer; on timeout the worker is terminated (not just abandoned).
 */
import { Worker } from 'worker_threads'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { randomUUID } from 'node:crypto'
import pino from 'pino'

const logger = pino({ name: 'kapsel-persistent-pool' })

const __filename = fileURLToPath(import.meta.url)
const __dir = dirname(__filename)

const DEFAULT_INVOKE_TIMEOUT_MS = 10_000
const DEFAULT_ACTIVATE_TIMEOUT_MS = 30_000

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActivationInput {
    pluginName: string
    entry: string
    permissions: string[]
    settings: Record<string, unknown>
    workspaceId: string
    activateTimeoutMs?: number
}

export interface WorkerHandle {
    worker: Worker
    pluginName: string
    activatedAt: number
    /** Tools registered by the extension during activation */
    registeredTools: RegisteredTool[]
}

export interface RegisteredTool {
    name: string
    description: string
    parameters?: unknown
    hints?: { timeoutMs?: number }
}

export interface InvokeResult {
    ok: boolean
    result?: unknown
    error?: string
    timedOut?: boolean
    durationMs: number
}

// ── Worker map — keyed by pluginName ─────────────────────────────────────────

const _workers = new Map<string, WorkerHandle>()

// Pending call resolvers — keyed by callId
type PendingCall = { resolve: (r: InvokeResult) => void; timer: ReturnType<typeof setTimeout>; start: number }
const _pending = new Map<string, PendingCall>()

// ── Spawn + activate ─────────────────────────────────────────────────────────

export async function getWorker(input: ActivationInput): Promise<WorkerHandle> {
    const existing = _workers.get(input.pluginName)
    if (existing) return existing

    const workerPath = join(__dir, 'sandbox-worker.js')
    const worker = new Worker(workerPath) // no workerData — persistent mode

    // Wire up the message handler before sending activate
    worker.on('message', handleWorkerMessage)
    worker.on('error', (err) => {
        logger.error({ ext: input.pluginName, err }, 'Persistent worker crashed')
        cleanupWorker(input.pluginName)
        // Reject any pending calls for this worker
        for (const [callId, pending] of _pending) {
            if (callId.startsWith(input.pluginName + ':')) {
                clearTimeout(pending.timer)
                pending.resolve({ ok: false, error: `Worker crashed: ${err.message}`, durationMs: Date.now() - pending.start })
                _pending.delete(callId)
            }
        }
    })
    worker.on('exit', (code) => {
        if (code !== 0) logger.warn({ ext: input.pluginName, code }, 'Worker exited unexpectedly')
        cleanupWorker(input.pluginName)
    })

    // Activate: send the input, wait for 'activated' response
    const callId = `${input.pluginName}:__activate__`
    const activateTimeout = input.activateTimeoutMs ?? DEFAULT_ACTIVATE_TIMEOUT_MS

    const activationResult = await new Promise<{ ok: boolean; tools: RegisteredTool[]; error?: string }>((resolve) => {
        const timer = setTimeout(() => {
            void worker.terminate()
            resolve({ ok: false, tools: [], error: `Activation timed out after ${activateTimeout}ms` })
        }, activateTimeout)

        const onMsg = (msg: Record<string, unknown>) => {
            if (msg.callId !== callId) return
            clearTimeout(timer)
            worker.off('message', onMsg)
            if (msg.type === 'activated') {
                resolve({ ok: true, tools: (msg.tools as RegisteredTool[]) ?? [] })
            } else {
                resolve({ ok: false, tools: [], error: String(msg.error ?? 'Activation failed') })
            }
        }
        worker.on('message', onMsg)

        worker.postMessage({
            type: 'activate',
            callId,
            input: {
                pluginName: input.pluginName,
                entry: input.entry,
                permissions: input.permissions,
                settings: input.settings,
                workspaceId: input.workspaceId,
                toolName: '__activate__',
                args: {},
            },
        })
    })

    if (!activationResult.ok) {
        void worker.terminate()
        throw new Error(activationResult.error ?? 'Activation failed')
    }

    const handle: WorkerHandle = {
        worker,
        pluginName: input.pluginName,
        activatedAt: Date.now(),
        registeredTools: activationResult.tools,
    }
    _workers.set(input.pluginName, handle)

    logger.info({ ext: input.pluginName, toolCount: activationResult.tools.length }, 'Persistent worker activated')
    return handle
}

// ── Invoke a tool on a persistent worker ─────────────────────────────────────

export async function invokeTool(
    handle: WorkerHandle,
    toolName: string,
    args: Record<string, unknown>,
    workspaceId: string,
    timeoutMs: number = DEFAULT_INVOKE_TIMEOUT_MS,
): Promise<InvokeResult> {
    const callId = `${handle.pluginName}:${randomUUID()}`
    const start = Date.now()

    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            _pending.delete(callId)
            logger.warn({ ext: handle.pluginName, tool: toolName, timeoutMs }, 'Tool invocation timed out — terminating worker')
            void handle.worker.terminate()
            cleanupWorker(handle.pluginName)
            resolve({ ok: false, error: `Tool timed out after ${timeoutMs}ms`, timedOut: true, durationMs: Date.now() - start })
        }, timeoutMs)

        _pending.set(callId, { resolve, timer, start })

        handle.worker.postMessage({ type: 'invoke', callId, toolName, args, workspaceId })
    })
}

// ── Message router ────────────────────────────────────────────────────────────

function handleWorkerMessage(msg: Record<string, unknown>) {
    if (!msg.callId) return
    const pending = _pending.get(msg.callId as string)
    if (!pending) return

    clearTimeout(pending.timer)
    _pending.delete(msg.callId as string)

    if (msg.type === 'result') {
        pending.resolve({ ok: true, result: msg.result, durationMs: Date.now() - pending.start })
    } else {
        pending.resolve({ ok: false, error: String(msg.error ?? 'Unknown worker error'), durationMs: Date.now() - pending.start })
    }
}

// ── Cleanup ───────────────────────────────────────────────────────────────────

function cleanupWorker(pluginName: string) {
    _workers.delete(pluginName)
}

export function terminateWorker(pluginName: string): void {
    const handle = _workers.get(pluginName)
    if (handle) {
        handle.worker.postMessage({ type: 'terminate' })
        _workers.delete(pluginName)
        logger.info({ ext: pluginName }, 'Persistent worker terminated')
    }
}

export function terminateAll(): void {
    for (const [name, handle] of _workers) {
        handle.worker.postMessage({ type: 'terminate' })
        logger.info({ ext: name }, 'Persistent worker terminated (shutdown)')
    }
    _workers.clear()
}

/** Stats for observability — e.g. /health or admin endpoints */
export function workerStats(): Array<{ pluginName: string; activatedAt: number; toolCount: number }> {
    return Array.from(_workers.values()).map((h) => ({
        pluginName: h.pluginName,
        activatedAt: h.activatedAt,
        toolCount: h.registeredTools.length,
    }))
}
