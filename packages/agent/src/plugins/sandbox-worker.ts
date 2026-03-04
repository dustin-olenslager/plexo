/**
 * Kapsel Persistent Sandbox Worker (§5.4)
 *
 * Long-lived worker that stays alive and services multiple tool invocations
 * for a single extension. Replaces the ephemeral one-worker-per-call model.
 *
 * Protocol (message-based, host↔worker):
 *
 * Host → Worker { type: 'activate', input: SandboxInput }
 *   Worker responds: { type: 'activated', callId, tools, schedules, widgets }
 *                 or { type: 'error', callId, error }
 *
 * Host → Worker { type: 'invoke', callId: string, toolName: string, args, workspaceId }
 *   Worker responds: { type: 'result', callId, result }
 *                 or { type: 'error', callId, error }
 *
 * Host → Worker { type: 'terminate' }   (graceful shutdown)
 *
 * Security (§5.5): capabilities enforced in createActivationSDK, same as ephemeral mode.
 */
import { parentPort, workerData } from 'worker_threads'
import { createActivationSDK } from './activation-sdk.js'
import type { SandboxInput } from './pool.js'
import type { ToolRegistration } from '@plexo/sdk'

interface ActivateMsg { type: 'activate'; callId: string; input: SandboxInput }
interface InvokeMsg { type: 'invoke'; callId: string; toolName: string; args: Record<string, unknown>; workspaceId: string }
interface TerminateMsg { type: 'terminate' }
type HostMsg = ActivateMsg | InvokeMsg | TerminateMsg

// State for this worker — fixed to one extension
let _registeredTools: ToolRegistration[] = []
let _extModule: { activate?: (sdk: unknown) => Promise<void>;[key: string]: unknown } | null = null
let _input: SandboxInput | null = null

function reply(msg: Record<string, unknown>) {
    parentPort?.postMessage(msg)
}

async function handleActivate(msg: ActivateMsg): Promise<void> {
    _input = msg.input

    try {
        _extModule = await import(msg.input.entry) as typeof _extModule

        if (typeof _extModule?.activate !== 'function') {
            reply({ type: 'error', callId: msg.callId, error: `Extension "${msg.input.pluginName}" does not export activate()` })
            return
        }

        const { sdk, getResult } = createActivationSDK(
            msg.input.pluginName,
            msg.input.permissions,
            msg.input.settings,
            msg.input.workspaceId ?? 'sandbox',
        )

        await _extModule.activate(sdk)
        const { tools, schedules, widgets } = getResult()
        _registeredTools = tools

        reply({
            type: 'activated',
            callId: msg.callId,
            tools: tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters, hints: t.hints })),
            schedules: schedules.map((s) => ({ name: s.name, schedule: s.schedule })),
            widgets: widgets.map((w) => ({ name: w.name, displayName: w.displayName, displayType: w.displayType })),
        })
    } catch (err) {
        reply({ type: 'error', callId: msg.callId, error: err instanceof Error ? err.message : String(err) })
    }
}

async function handleInvoke(msg: InvokeMsg): Promise<void> {
    const toolDef = _registeredTools.find((t) => t.name === msg.toolName)
    if (!toolDef) {
        reply({ type: 'error', callId: msg.callId, error: `Tool "${msg.toolName}" not registered in "${_input?.pluginName}"` })
        return
    }

    try {
        const result = await toolDef.handler(msg.args, {
            workspaceId: msg.workspaceId,
            requestId: crypto.randomUUID(),
        })
        reply({ type: 'result', callId: msg.callId, result })
    } catch (err) {
        reply({ type: 'error', callId: msg.callId, error: err instanceof Error ? err.message : String(err) })
    }
}

if (parentPort) {
    parentPort.on('message', (msg: HostMsg) => {
        if (msg.type === 'activate') {
            void handleActivate(msg)
        } else if (msg.type === 'invoke') {
            void handleInvoke(msg)
        } else if (msg.type === 'terminate') {
            process.exit(0)
        }
    })
} else if (workerData) {
    // Fallback: ephemeral mode (backward compat with old pool.ts callers)
    // Re-import parentPort into a typed local var to avoid 'never' narrowing
    void (async () => {
        const { parentPort: port } = await import('worker_threads')
        const input = workerData as SandboxInput
        const { sdk, getResult } = createActivationSDK(input.pluginName, input.permissions, input.settings, 'sandbox')
        const extModule = await import(input.entry) as { activate?: (sdk: unknown) => Promise<void>;[key: string]: unknown }
        if (typeof extModule.activate === 'function') await extModule.activate(sdk)
        const { tools } = getResult()
        if (input.toolName === '__activate__') {
            port?.postMessage({ ok: true, result: { registeredTools: tools } })
        } else {
            const toolDef = tools.find((t) => t.name === input.toolName)
            if (toolDef) {
                const result = await toolDef.handler(input.args, { workspaceId: input.workspaceId ?? 'sandbox', requestId: crypto.randomUUID() })
                port?.postMessage({ ok: true, result })
            } else {
                port?.postMessage({ ok: false, error: `Tool "${input.toolName}" not found` })
            }
        }
    })()
}
