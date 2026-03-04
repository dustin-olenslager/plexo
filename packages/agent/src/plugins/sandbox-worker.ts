/**
 * Kapsel Sandbox Worker
 *
 * Runs in a worker_threads context. Receives SandboxInput as workerData.
 *
 * Two modes (§9.1 activation vs §7.1 tool invocation):
 *
 * Mode A — Activation (toolName === '__activate__'):
 *   1. Dynamically import the extension entry point
 *   2. Build a host KapselSDK instance (createActivationSDK)
 *   3. Call extension.activate(sdk)
 *   4. Collect registered tools/schedules/widgets
 *   5. Reply with { ok: true, result: { registeredTools, registeredSchedules, registeredWidgets } }
 *
 * Mode B — Tool invocation (toolName is a real tool name):
 *   1. Import the extension entry point
 *   2. Activate it (same as Mode A, needed to rebuild the registrations)
 *   3. Find the registered tool handler by name
 *   4. Call handler(args, context) and reply with { ok: true, result }
 *
 * Security (§5.5):
 * - Workers are terminated by pool.ts on timeout
 * - Capability checks are enforced inside createActivationSDK
 * - Events namespace enforcement prevents cross-extension poisoning
 */
import { workerData, parentPort } from 'worker_threads'
import { createActivationSDK } from './activation-sdk.js'
import type { SandboxInput } from './pool.js'

const input = workerData as SandboxInput

async function run() {
    if (!parentPort) return

    try {
        // Dynamically import the extension entry point
        // entry is a relative path from the extension package root, e.g. './dist/index.js'
        // In production, extensions are installed into a known path; this uses the entry directly.
        const extModule = await import(input.entry) as {
            activate?: (sdk: unknown) => Promise<void>
            [key: string]: unknown
        }

        if (typeof extModule.activate !== 'function') {
            parentPort.postMessage({
                ok: false,
                error: `Extension "${input.pluginName}" does not export an activate() function`,
            })
            return
        }

        // Build host SDK — captures registrations, enforces capabilities
        const { sdk, getResult } = createActivationSDK(
            input.pluginName,
            input.permissions,
            input.settings,
            'sandbox', // workspaceId resolved by host after activation
        )

        // Run activate() — extensions call sdk.registerTool() etc. here
        await extModule.activate(sdk)
        const { tools, schedules, widgets } = getResult()

        if (input.toolName === '__activate__') {
            // Mode A: return the registration manifest
            parentPort.postMessage({
                ok: true,
                result: {
                    registeredTools: tools.map((t) => ({
                        name: t.name,
                        description: t.description,
                        parameters: t.parameters,
                        hints: t.hints,
                    })),
                    registeredSchedules: schedules.map((s) => ({ name: s.name, schedule: s.schedule })),
                    registeredWidgets: widgets.map((w) => ({ name: w.name, displayName: w.displayName, displayType: w.displayType })),
                },
            })
            return
        }

        // Mode B: invoke a specific tool handler
        const toolDef = tools.find((t) => t.name === input.toolName)
        if (!toolDef) {
            parentPort.postMessage({
                ok: false,
                error: `Tool "${input.toolName}" not found in extension "${input.pluginName}"`,
            })
            return
        }

        const result = await toolDef.handler(input.args, {
            workspaceId: 'sandbox',
            requestId: crypto.randomUUID(),
        })

        parentPort.postMessage({ ok: true, result })
    } catch (err) {
        parentPort?.postMessage({
            ok: false,
            error: err instanceof Error ? err.message : String(err),
        })
    }
}

void run()
