import type { JSONSchema } from './types.js'

// ── SDK Types ────────────────────────────────────────────────

export interface PluginManifest {
    name: string
    version: string
    description: string
    author: string
    type: 'skill' | 'channel' | 'tool' | 'card' | 'mcp-server' | 'theme'
    permissions: PluginPermission[]
    settings: Record<string, SettingDefinition>
    entrypoint: string
    minPlexoVersion: string
}

export type PluginPermission =
    | 'agent.tools'
    | 'agent.context'
    | 'dashboard.cards'
    | 'cron.jobs'
    | 'channels.register'
    | 'events'
    | 'storage'

export interface SettingDefinition {
    type: 'string' | 'number' | 'boolean' | 'secret'
    label: string
    description: string
    required: boolean
    default?: string | number | boolean
}

export interface ToolCallContext {
    workspaceId: string
    taskId: string | null
    connectionId: string | null
}

export interface ToolResult {
    success: boolean
    output: unknown
    error?: string
    metadata?: {
        cost?: number
        latencyMs?: number
    }
}

export interface CronContext {
    workspaceId: string
    runId: string
    previousRunAt: Date | null
}

export interface EventMeta {
    sourcePlugin: string
    workspaceId: string
    emittedAt: Date
}

export interface ChannelAdapter {
    name: string
    connect(config: Record<string, unknown>): Promise<void>
    disconnect(): Promise<void>
    send(message: OutboundMessage): Promise<void>
    onMessage(handler: (msg: InboundMessage) => void): void
    onError(handler: (err: Error) => void): void
    healthCheck(): Promise<{ ok: boolean; detail?: string }>
}

export interface InboundMessage {
    id: string
    channelType: string
    senderId: string
    senderName: string
    text: string
    raw: unknown
    receivedAt: Date
}

export interface OutboundMessage {
    recipientId: string
    text: string
    actions?: Array<{ label: string; value: string }>
}

export interface CardConfig {
    title: string
    description: string
    defaultSize: { w: number; h: number }
    minSize?: { w: number; h: number }
    component: string
    dataEndpoint?: string
    refreshIntervalMs?: number
}

// ── SDK API ──────────────────────────────────────────────────

export interface AgentSDK {
    registerTool(
        name: string,
        description: string,
        inputSchema: JSONSchema,
        handler: (input: unknown, context: ToolCallContext) => Promise<ToolResult>,
    ): void

    injectContext(markdown: string): void
}

export interface DashboardSDK {
    registerCard(id: string, config: CardConfig): void
}

export interface CronSDK {
    register(
        name: string,
        schedule: string,
        handler: (context: CronContext) => Promise<void>,
        options?: {
            timezone?: string
            maxRetries?: number
            timeoutMs?: number
        },
    ): void
}

export interface ChannelsSDK {
    register(name: string, adapter: ChannelAdapter): void
}

export interface EventsSDK {
    on(event: string, handler: (data: unknown, meta: EventMeta) => void): void
    emit(event: string, data: unknown): void
}

export interface StorageSDK {
    get(key: string): Promise<string | null>
    set(key: string, value: string, options?: { ttlSeconds?: number }): Promise<void>
    delete(key: string): Promise<void>
    list(prefix?: string): Promise<string[]>
}

export interface SettingsSDK {
    get(key: string): string | undefined
    getAll(): Record<string, string>
}

export interface PlexoSDK {
    agent: AgentSDK
    dashboard: DashboardSDK
    cron: CronSDK
    channels: ChannelsSDK
    events: EventsSDK
    storage: StorageSDK
    settings: SettingsSDK
}
