import { CheckCircle, Clock, XCircle, Loader2, BarChart3, Zap, MessageSquare } from 'lucide-react'

interface ActivityItem {
    id: string
    type: string
    status: string
    outcomeSummary: string | null
    qualityScore: number | null
    completedAt: string | null
    createdAt: string
    source: string
}

async function fetchActivity(workspaceId: string) {
    const apiBase = process.env.INTERNAL_API_URL ?? 'http://localhost:3001'
    const res = await fetch(
        `${apiBase}/api/dashboard/activity?workspaceId=${encodeURIComponent(workspaceId)}&limit=20`,
        { cache: 'no-store' }
    )
    if (!res.ok) return []
    const data = await res.json() as { items: ActivityItem[] }
    return data.items ?? []
}

const STATUS_ICON: Record<string, React.ReactElement> = {
    pending: <Clock className="h-3.5 w-3.5 text-amber-400" />,
    running: <Loader2 className="h-3.5 w-3.5 text-indigo-400 animate-spin" />,
    complete: <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />,
    failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
    cancelled: <XCircle className="h-3.5 w-3.5 text-zinc-500" />,
}

function groupByDate(items: ActivityItem[]) {
    const groups: Record<string, ActivityItem[]> = {}
    for (const item of items) {
        const date = new Date(item.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
        if (!groups[date]) groups[date] = []
        groups[date]!.push(item)
    }
    return groups
}

export default async function ConversationsPage() {
    const workspaceId = process.env.DEV_WORKSPACE_ID ?? ''
    const items = await fetchActivity(workspaceId)
    const groups = groupByDate(items)

    return (
        <div className="flex flex-col gap-6 max-w-3xl">
            <div>
                <h1 className="text-xl font-bold text-zinc-50">Conversations</h1>
                <p className="mt-0.5 text-sm text-zinc-500">Agent task history from all channels</p>
            </div>

            {items.length === 0 ? (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 py-16 text-center">
                    <MessageSquare className="mx-auto h-8 w-8 text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-500">No conversations yet</p>
                    <p className="mt-1 text-xs text-zinc-600">Submit a task from the dashboard to start.</p>
                </div>
            ) : (
                Object.entries(groups).map(([date, groupItems]) => (
                    <div key={date}>
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{date}</p>
                        <div className="flex flex-col gap-2">
                            {groupItems.map((item) => (
                                <a
                                    key={item.id}
                                    href={`/tasks/${item.id}`}
                                    className="flex items-start gap-3 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition-colors"
                                >
                                    <span className="mt-0.5 shrink-0">{STATUS_ICON[item.status] ?? STATUS_ICON.pending}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-mono text-zinc-500">{item.id.slice(0, 8)}</span>
                                            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] capitalize text-zinc-500">{item.type}</span>
                                            <span className="rounded bg-zinc-800/60 px-1.5 py-0.5 text-[9px] text-zinc-600 flex items-center gap-1">
                                                {item.source === 'slack' ? '⚡' : item.source === 'telegram' ? '✈️' : item.source === 'discord' ? '💬' : '🖥'}
                                                {item.source}
                                            </span>
                                        </div>
                                        {item.outcomeSummary && (
                                            <p className="mt-1.5 text-sm text-zinc-300 leading-snug line-clamp-2">{item.outcomeSummary}</p>
                                        )}
                                        <div className="mt-2 flex items-center gap-3 text-[10px] text-zinc-600">
                                            <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            {item.qualityScore !== null && (
                                                <span className="flex items-center gap-1">
                                                    <BarChart3 className="h-2.5 w-2.5" />
                                                    {Math.round(item.qualityScore * 100)}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}
