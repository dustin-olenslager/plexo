/**
 * Plugin Tool Bridge
 *
 * Loads enabled plugins for a workspace from the DB, reads their manifest
 * tool definitions, and returns Vercel AI SDK tool objects that the executor
 * can merge into its static tool set.
 *
 * Tool naming: plugin__{pluginName}__{toolName}  e.g. plugin__jira__create_issue
 *
 * Phase 12: tools stub-execute in main process.
 * Phase 13: move to isolated worker_threads sandbox.
 */
import { tool } from 'ai'
import { z } from 'zod'
import { db, eq, and } from '@plexo/db'
import { plugins } from '@plexo/db'
import type { ToolSet } from '../connections/bridge.js'
import pino from 'pino'

const logger = pino({ name: 'plugin-bridge' })

interface PluginToolDef {
    name: string
    description: string
    parameters?: {
        type: 'object'
        properties?: Record<string, { type: string; description?: string }>
        required?: string[]
    }
}

interface PluginManifest {
    name: string
    version: string
    type: string
    tools?: PluginToolDef[]
}

/**
 * Load all enabled plugin tool definitions for a given workspace.
 * Returns an AI SDK ToolSet keyed by `plugin__{name}__{toolName}`.
 */
export async function loadPluginTools(workspaceId: string): Promise<ToolSet> {
    const toolSet: ToolSet = {}

    try {
        const enabledPlugins = await db
            .select()
            .from(plugins)
            .where(
                and(
                    eq(plugins.workspaceId, workspaceId),
                    eq(plugins.enabled, true),
                ),
            )

        for (const plugin of enabledPlugins) {
            const manifest = plugin.manifest as PluginManifest
            const rawTools = manifest.tools ?? []

            for (const toolDef of rawTools) {
                const toolKey = `plugin__${plugin.name}__${toolDef.name}`

                // Build a flat zod schema from the manifest parameters
                const props = toolDef.parameters?.properties ?? {}
                const required = new Set(toolDef.parameters?.required ?? [])
                const zodShape: Record<string, z.ZodTypeAny> = {}

                for (const [key, def] of Object.entries(props)) {
                    const base = (() => {
                        switch (def.type) {
                            case 'number': return z.number()
                            case 'boolean': return z.boolean()
                            case 'array': return z.array(z.unknown())
                            default: return z.string()
                        }
                    })()
                    zodShape[key] = required.has(key) ? base : base.optional()
                }

                // Use z.record as a catch-all when no typed params declared
                const inputSchema = Object.keys(zodShape).length > 0
                    ? z.object(zodShape)
                    : z.object({}).passthrough()

                const pluginName = plugin.name
                const pluginVersion = plugin.version
                const toolName = toolDef.name

                toolSet[toolKey] = tool({
                    description: `[Plugin: ${pluginName} v${pluginVersion}] ${toolDef.description}`,
                    inputSchema,
                    execute: async (args) => {
                        logger.warn({ plugin: pluginName, tool: toolName, args }, 'Plugin tool called (stub)')
                        return {
                            plugin: pluginName,
                            tool: toolName,
                            status: 'stub',
                            message: `Plugin tool ${toolName} called but no handler registered. Install the plugin handler package to enable execution.`,
                            args,
                        }
                    },
                })
            }
        }
    } catch (err) {
        // Non-fatal — agent continues with built-in tools if plugin load fails
        logger.error({ err, workspaceId }, 'loadPluginTools failed — continuing without plugin tools')
    }

    return toolSet
}
