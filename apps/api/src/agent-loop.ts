import { claimTask, completeTask, blockTask } from '@plexo/queue'
import { db, eq } from '@plexo/db'
import { tasks, workspaces } from '@plexo/db'
import { planTask } from '@plexo/agent/planner'
import { executeTask } from '@plexo/agent/executor'
import type { AnthropicCredential, ExecutionContext } from '@plexo/agent/types'
import { logger } from './logger.js'
import { emit } from './sse-emitter.js'

const POLL_INTERVAL_MS = 2_000
const API_COST_CEILING = parseFloat(process.env.API_COST_CEILING_USD ?? '10')

let running = true
let activeAbort: AbortController | null = null

/**
 * Resolve the Anthropic credential for a workspace.
 * Phase 2: reads from environment. Phase 3: fetches from installed_connections.
 */
async function resolveCredential(_workspaceId: string): Promise<AnthropicCredential | null> {
    const key = process.env.ANTHROPIC_API_KEY
    if (key && key !== 'placeholder') {
        return { type: 'api_key', apiKey: key }
    }
    // OAuth credentials — Phase 3 will load from installed_connections table
    return null
}

async function processOneTask(): Promise<boolean> {
    const task = await claimTask('agent-loop-1')
    if (!task) return false

    logger.info({ taskId: task.id, type: task.type }, 'Task claimed')
    emit({ type: 'task_started', taskId: task.id, taskType: task.type })

    const credential = await resolveCredential(task.workspaceId)
    if (!credential) {
        await blockTask(task.id, 'No AI credential configured for workspace')
        emit({ type: 'task_blocked', taskId: task.id, reason: 'No AI credential' })
        logger.warn({ taskId: task.id, workspaceId: task.workspaceId }, 'No credential — task blocked')
        return true
    }

    const abort = new AbortController()
    activeAbort = abort

    const ctx: ExecutionContext = {
        taskId: task.id,
        workspaceId: task.workspaceId,
        userId: 'system',
        credential,
        tokenBudget: Math.floor((API_COST_CEILING * 1_000_000) / 15), // rough token budget from cost ceiling
        signal: abort.signal,
    }

    try {
        // Update DB status to running
        await db.update(tasks)
            .set({ status: 'running', claimedAt: new Date() })
            .where(eq(tasks.id, task.id))

        const taskContext = task.context as Record<string, unknown>
        const description = (taskContext.description as string) ?? JSON.stringify(taskContext)

        // Plan
        emit({ type: 'task_planning', taskId: task.id })
        const plan = await planTask(ctx, description, taskContext)
        logger.info({ taskId: task.id, steps: plan.steps.length, confidence: plan.confidenceScore }, 'Plan ready')
        emit({ type: 'task_planned', taskId: task.id, steps: plan.steps.length, confidence: plan.confidenceScore })

        // Confirm one-way doors — Phase 2: auto-approve unless user set confirm threshold
        if (plan.oneWayDoors.length > 0) {
            logger.warn({ taskId: task.id, doors: plan.oneWayDoors.length }, 'One-way doors detected — auto-approving in Phase 2')
        }

        // Execute
        const result = await executeTask(ctx, plan)
        logger.info({ taskId: task.id, ok: result.ok, cost: result.totalCostUsd }, 'Task executed')

        await completeTask(task.id, {
            qualityScore: result.qualityScore,
            outcomeSummary: result.outcomeSummary,
            tokensIn: result.totalTokensIn,
            tokensOut: result.totalTokensOut,
            costUsd: result.totalCostUsd,
        })

        emit({
            type: 'task_complete',
            taskId: task.id,
            qualityScore: result.qualityScore,
            costUsd: result.totalCostUsd,
            summary: result.outcomeSummary,
        })
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        logger.error({ taskId: task.id, err }, 'Task failed')
        await blockTask(task.id, message)
        emit({ type: 'task_failed', taskId: task.id, error: message })
    } finally {
        activeAbort = null
    }

    return true
}

export function startAgentLoop(): void {
    logger.info('Agent queue loop started')

    async function poll(): Promise<void> {
        while (running) {
            try {
                await processOneTask()
            } catch (err) {
                logger.error({ err }, 'Queue loop error')
            }
            await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS))
        }
    }

    // Run without blocking the event loop
    poll().catch((err) => logger.fatal({ err }, 'Agent loop crashed'))
}

export function stopAgentLoop(): void {
    running = false
    activeAbort?.abort()
    logger.info('Agent queue loop stopped')
}
