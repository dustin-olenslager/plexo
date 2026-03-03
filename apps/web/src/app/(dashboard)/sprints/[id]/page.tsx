import { notFound } from 'next/navigation'

// Sprint detail types (mirrors API response)
interface SprintTaskItem {
    id: string
    description: string
    scope: string[]
    acceptance: string
    branch: string
    priority: number
    status: 'queued' | 'running' | 'complete' | 'blocked' | 'failed'
    handoff: { prNumber?: number; prUrl?: string; taskId?: string } | null
    createdAt: string
    completedAt: string | null
}

interface SprintDetail {
    sprint: {
        id: string
        repo: string
        request: string
        status: string
        totalTasks: number
        completedTasks: number
        failedTasks: number
        conflictCount: number
        qualityScore: number | null
        costUsd: number | null
        createdAt: string
        completedAt: string | null
    }
    tasks: SprintTaskItem[]
}

const STATUS_COLORS: Record<string, string> = {
    queued: 'bg-zinc-700 text-zinc-300',
    running: 'bg-blue-500/20 text-blue-400',
    complete: 'bg-emerald-500/20 text-emerald-400',
    blocked: 'bg-amber-500/20 text-amber-400',
    failed: 'bg-red-500/20 text-red-400',
    planning: 'bg-purple-500/20 text-purple-400',
    finalizing: 'bg-blue-500/20 text-blue-400',
    cancelled: 'bg-zinc-700 text-zinc-400',
}

function StatusBadge({ status }: { status: string }) {
    return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-zinc-700 text-zinc-300'}`}>
            {status}
        </span>
    )
}

async function fetchSprintDetail(sprintId: string): Promise<SprintDetail | null> {
    const apiBase = process.env.INTERNAL_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    try {
        const res = await fetch(`${apiBase}/api/sprints/${sprintId}/tasks`, {
            cache: 'no-store',
        })
        if (!res.ok) return null
        return res.json() as Promise<SprintDetail>
    } catch {
        return null
    }
}

export default async function SprintDetailPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: sprintId } = await params
    const data = await fetchSprintDetail(sprintId)

    if (!data) notFound()

    const { sprint, tasks } = data
    const progressPct = sprint.totalTasks > 0
        ? Math.round((sprint.completedTasks / sprint.totalTasks) * 100)
        : 0

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-zinc-50">Sprint</h1>
                        <StatusBadge status={sprint.status} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-400 font-mono">{sprint.repo}</p>
                </div>
                <div className="text-right text-sm text-zinc-500">
                    <div>{new Date(sprint.createdAt).toLocaleDateString()}</div>
                    {sprint.costUsd != null && (
                        <div className="text-xs text-zinc-600">${sprint.costUsd.toFixed(4)} spent</div>
                    )}
                </div>
            </div>

            {/* Request */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-sm text-zinc-300">{sprint.request}</p>
            </div>

            {/* Progress bar */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Progress</span>
                    <span className="text-xs text-zinc-500">
                        {sprint.completedTasks}/{sprint.totalTasks} tasks
                        {sprint.failedTasks > 0 && (
                            <span className="ml-2 text-red-400">{sprint.failedTasks} failed</span>
                        )}
                        {sprint.conflictCount > 0 && (
                            <span className="ml-2 text-amber-400">{sprint.conflictCount} conflicts</span>
                        )}
                    </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800">
                    <div
                        className="h-2 rounded-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
                <div className="mt-1 text-right text-xs text-zinc-600">{progressPct}%</div>
            </div>

            {/* Task tree */}
            <div className="flex flex-col gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Tasks</h2>

                {tasks.length === 0 ? (
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 text-center text-sm text-zinc-500">
                        No tasks yet. Start the sprint to generate the execution plan.
                    </div>
                ) : (
                    tasks.map((task) => (
                        <div
                            key={task.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 flex flex-col gap-2"
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2">
                                    <span className="mt-0.5 text-xs font-mono text-zinc-600 min-w-[1.5rem]">
                                        #{task.priority}
                                    </span>
                                    <p className="text-sm text-zinc-200">{task.description}</p>
                                </div>
                                <StatusBadge status={task.status} />
                            </div>

                            {/* Branch */}
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.486M7 17h.01" />
                                </svg>
                                <code className="font-mono">{task.branch}</code>
                            </div>

                            {/* Scope */}
                            <div className="flex flex-wrap gap-1">
                                {(task.scope as string[]).map((s) => (
                                    <span key={s} className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                                        {s}
                                    </span>
                                ))}
                            </div>

                            {/* Acceptance */}
                            <p className="text-xs text-zinc-500 leading-relaxed">{task.acceptance}</p>

                            {/* PR link */}
                            {task.handoff?.prUrl && (
                                <a
                                    href={task.handoff.prUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                    PR #{task.handoff.prNumber} ↗
                                </a>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
