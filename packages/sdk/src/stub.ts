import type { PlexoSDK } from './sdk.js'

/**
 * Stub SDK runtime — every method logs a warning and returns a no-op result.
 * Real implementation is injected by the plugin loader in Phase 5.
 */
function stubWarn(method: string): void {
    console.warn(`[@plexo/sdk] ${method} called on stub runtime. Plugin loader not initialized.`)
}

export function createStubSDK(): PlexoSDK {
    return {
        agent: {
            registerTool(name) {
                stubWarn(`agent.registerTool('${name}')`)
            },
            injectContext() {
                stubWarn('agent.injectContext()')
            },
        },
        dashboard: {
            registerCard(id) {
                stubWarn(`dashboard.registerCard('${id}')`)
            },
        },
        cron: {
            register(name) {
                stubWarn(`cron.register('${name}')`)
            },
        },
        channels: {
            register(name) {
                stubWarn(`channels.register('${name}')`)
            },
        },
        events: {
            on(event) {
                stubWarn(`events.on('${event}')`)
            },
            emit(event) {
                stubWarn(`events.emit('${event}')`)
            },
        },
        storage: {
            async get() {
                stubWarn('storage.get()')
                return null
            },
            async set() {
                stubWarn('storage.set()')
            },
            async delete() {
                stubWarn('storage.delete()')
            },
            async list() {
                stubWarn('storage.list()')
                return []
            },
        },
        settings: {
            get() {
                stubWarn('settings.get()')
                return undefined
            },
            getAll() {
                stubWarn('settings.getAll()')
                return {}
            },
        },
    }
}
