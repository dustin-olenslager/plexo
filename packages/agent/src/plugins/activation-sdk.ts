/**
 * Kapsel Activation SDK
 *
 * A host-side implementation of KapselSDK passed to extension activate() calls.
 * Captures registerTool() registrations during activation, then the bridge
 * converts them into Vercel AI SDK tools.
 *
 * This runs INSIDE the sandbox worker — the extension's activate() is called
 * with this SDK instance. The sdk.host info identifies Plexo as the host.
 *
 * Capability enforcement: every sdk.* call checks the declared capabilities[]
 * from the manifest before proceeding (§4).
 */
import type { KapselSDK, ToolRegistration, ScheduleRegistration, WidgetRegistration } from '@plexo/sdk'

export interface ActivationResult {
    tools: ToolRegistration[]
    schedules: ScheduleRegistration[]
    widgets: WidgetRegistration[]
}

/**
 * Create a host-side SDK instance for use during extension activation.
 * workspaceId and requestId are required for InvokeContext.
 */
export function createActivationSDK(
    extensionName: string,
    capabilities: string[],
    settings: Record<string, unknown>,
    workspaceId: string,
): { sdk: KapselSDK; getResult: () => ActivationResult } {
    const capSet = new Set(capabilities)
    const registered: ActivationResult = { tools: [], schedules: [], widgets: [] }

    function requireCap(token: string): void {
        if (!capSet.has(token)) {
            throw new Error(`CAPABILITY_DENIED: extension "${extensionName}" requires "${token}" capability`)
        }
    }

    const sdk: KapselSDK = {
        host: {
            kapselVersion: '0.2.0',
            complianceLevel: 'full',
            name: 'plexo',
            version: process.env.npm_package_version ?? '0.0.0',
        },

        registerTool(tool: ToolRegistration): void {
            registered.tools.push(tool)
        },

        registerSchedule(job: ScheduleRegistration): void {
            requireCap('schedule:register')
            registered.schedules.push(job)
        },

        registerWidget(widget: WidgetRegistration): void {
            requireCap('ui:register-widget')
            registered.widgets.push(widget)
        },

        memory: {
            async read(_query, _opts) {
                requireCap('memory:read')
                // TODO Phase 14: delegate to memory API
                return []
            },
            async write(entry) {
                requireCap('memory:write')
                // TODO Phase 14: delegate to memory API
                return {
                    id: crypto.randomUUID(),
                    content: entry.content,
                    tags: entry.tags,
                    authorExtension: extensionName as `@${string}/${string}`,
                    metadata: entry.metadata,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    ttl: entry.ttl,
                }
            },
            async delete(_id) {
                requireCap('memory:delete')
            },
        },

        connections: {
            async getCredentials(service: string) {
                requireCap(`connections:${service}`)
                // TODO Phase 14: resolve from installedConnections table
                throw new Error(`Connection "${service}" not yet resolved in this sandbox context`)
            },
            async isConnected(service: string) {
                requireCap(`connections:${service}`)
                return false
            },
        },

        channel: {
            async send(_msg) {
                requireCap('channel:send')
            },
            async sendDirect(_channelId, _msg) {
                requireCap('channel:send-direct')
            },
        },

        tasks: {
            async create(_opts) {
                requireCap('tasks:create')
                return { taskId: '' }
            },
            async get(_id) {
                requireCap('tasks:read')
                return null
            },
            async list(_filter) {
                requireCap('tasks:read')
                return []
            },
        },

        events: {
            subscribe(_topic, _handler) {
                requireCap('events:subscribe')
            },
            async publish(topic, _payload) {
                requireCap('events:publish')
                // Enforce namespace — extensions can only publish to ext.<scope>.*
                const extensionScope = extensionName.replace(/^@/, '').split('/')[0] ?? 'ext'
                if (!topic.startsWith(`ext.${extensionScope}.`)) {
                    throw new Error(`CAPABILITY_DENIED: extension may only publish to ext.${extensionScope}.* namespace`)
                }
            },
        },

        storage: {
            async get(key) {
                requireCap('storage:read')
                return (settings[key] as string | undefined) ?? null
            },
            async set(_key, _value, _opts) {
                requireCap('storage:write')
                // TODO Phase 14: persist to Redis with extension-scoped key
            },
            async delete(_key) {
                requireCap('storage:write')
            },
        },

        ui: {
            async notify(_msg, _level) {
                requireCap('ui:notify')
            },
        },
    }

    return { sdk, getResult: () => ({ ...registered }) }
}
