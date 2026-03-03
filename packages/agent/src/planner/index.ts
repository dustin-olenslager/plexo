import type { ExecutionPlan, ExecutionContext, PlanStep, OneWayDoor } from '../types.js'
import { buildAnthropicClient } from '../ai/client.js'
import { SAFETY_LIMITS, MODEL_ROUTING } from '../constants.js'
import { PlexoError } from '../errors.js'

const PLANNER_SYSTEM = `You are Plexo's execution planner. Your job is to analyze a task and produce a detailed, safe, reversible execution plan.

Rules:
- Prefer reversible actions. Flag irreversible ones as one-way doors requiring approval.
- Break work into atomic steps that can be verified independently.
- Be conservative with confidence scores — only give 0.9+ if the path is fully clear.
- Identify all external dependencies, file changes, and potential side effects.
- Steps should be independently verifiable.

Respond with a JSON object matching this exact schema:
{
  "goal": "one sentence goal",
  "steps": [
    {
      "stepNumber": 1,
      "description": "What this step does",
      "toolsRequired": ["shell", "read_file"],
      "verificationMethod": "How to verify this step succeeded",
      "isOneWayDoor": false
    }
  ],
  "oneWayDoors": [
    {
      "description": "What makes this irreversible",
      "type": "data_write",
      "reversibility": "How to reverse if needed",
      "requiresApproval": true
    }
  ],
  "estimatedDurationMs": 30000,
  "confidenceScore": 0.8,
  "risks": ["List of risks"]
}

Only respond with valid JSON. No markdown, no explanation.`

export async function planTask(
    ctx: ExecutionContext,
    taskDescription: string,
    taskContext: Record<string, unknown>,
): Promise<ExecutionPlan> {
    const client = await buildAnthropicClient(ctx.credential)

    const userPrompt = JSON.stringify({
        task: taskDescription,
        context: taskContext,
        constraints: {
            maxSteps: SAFETY_LIMITS.MAX_PLAN_STEPS,
            tokenBudget: ctx.tokenBudget,
        },
    })

    const msg = await client.messages.create({
        model: MODEL_ROUTING.default,
        max_tokens: 2048,
        system: PLANNER_SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = msg.content[0]
    if (!raw || raw.type !== 'text') {
        throw new PlexoError('Planner returned no text content', 'PLANNER_EMPTY_RESPONSE', 'system', 500)
    }

    let parsed: unknown
    try {
        parsed = JSON.parse(raw.text)
    } catch {
        throw new PlexoError(
            `Planner returned invalid JSON: ${raw.text.slice(0, 200)}`,
            'PLANNER_INVALID_JSON',
            'system',
            500,
        )
    }

    const plan = parsed as {
        goal: string
        steps: PlanStep[]
        oneWayDoors: OneWayDoor[]
        estimatedDurationMs: number
        confidenceScore: number
        risks: string[]
    }

    if (!plan.goal || !Array.isArray(plan.steps) || plan.steps.length === 0) {
        throw new PlexoError('Planner returned malformed plan', 'PLANNER_MALFORMED', 'system', 500)
    }

    if (plan.steps.length > SAFETY_LIMITS.MAX_PLAN_STEPS) {
        throw new PlexoError(
            `Plan has ${plan.steps.length} steps — exceeds safety limit of ${SAFETY_LIMITS.MAX_PLAN_STEPS}`,
            'PLAN_TOO_LARGE',
            'user',
            400,
        )
    }

    return {
        taskId: ctx.taskId,
        goal: plan.goal,
        steps: plan.steps,
        oneWayDoors: plan.oneWayDoors ?? [],
        estimatedDurationMs: plan.estimatedDurationMs ?? 0,
        confidenceScore: Math.min(1, Math.max(0, plan.confidenceScore ?? 0.5)),
        risks: plan.risks ?? [],
    }
}
