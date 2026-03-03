import {
    Activity,
    Zap,
    MessageSquare,
    DollarSign,
    Clock,
    GitBranch,
} from 'lucide-react'

const PLACEHOLDER_CARDS = [
    {
        title: 'Agent Status',
        subtitle: 'Online',
        icon: Activity,
        accent: 'from-emerald-500 to-emerald-600',
        dotColor: 'bg-emerald-400',
        content: 'Idle — waiting for tasks',
    },
    {
        title: 'Active Tasks',
        subtitle: '0 tasks',
        icon: Zap,
        accent: 'from-amber-500 to-orange-600',
        dotColor: 'bg-zinc-600',
        content: 'No active tasks. Send a message to get started.',
    },
    {
        title: 'Channels',
        subtitle: 'Not configured',
        icon: MessageSquare,
        accent: 'from-blue-500 to-indigo-600',
        dotColor: 'bg-zinc-600',
        content: 'Connect a channel in Settings to start talking.',
    },
    {
        title: 'API Cost',
        subtitle: 'This week',
        icon: DollarSign,
        accent: 'from-violet-500 to-purple-600',
        dotColor: 'bg-zinc-600',
        content: '$0.00 / $10.00',
    },
    {
        title: 'Recent Activity',
        subtitle: 'Last 7 days',
        icon: Clock,
        accent: 'from-cyan-500 to-teal-600',
        dotColor: 'bg-zinc-600',
        content: 'No activity yet.',
    },
    {
        title: 'Sprints',
        subtitle: 'None active',
        icon: GitBranch,
        accent: 'from-pink-500 to-rose-600',
        dotColor: 'bg-zinc-600',
        content: 'Start a sprint to see progress here.',
    },
]

export default function HomePage() {
    return (
        <div>
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
                <p className="mt-1 text-sm text-zinc-500">
                    Your AI agent overview
                </p>
            </div>

            {/* Card Grid */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {PLACEHOLDER_CARDS.map((card) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={card.title}
                            className="card-glow group rounded-xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:border-zinc-700"
                        >
                            {/* Card Header */}
                            <div className="flex items-center gap-3 border-b border-zinc-800/50 p-4">
                                <div
                                    className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${card.accent} text-white shadow-lg`}
                                >
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-[13px] font-semibold">{card.title}</h3>
                                    <div className="flex items-center gap-1.5">
                                        <span
                                            className={`inline-block h-1.5 w-1.5 rounded-full ${card.dotColor}`}
                                        />
                                        <p className="text-[11px] text-zinc-500">{card.subtitle}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="px-4 py-5">
                                <p className="text-sm text-zinc-400">{card.content}</p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Quick Send */}
            <div className="mt-8">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm">
                    <label
                        htmlFor="quick-send-input"
                        className="mb-2 block text-xs font-medium text-zinc-500"
                    >
                        Quick message to agent
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="quick-send-input"
                            data-testid="quick-send-input"
                            type="text"
                            placeholder="Ask something or describe a task..."
                            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                            disabled
                        />
                        <button
                            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white opacity-50"
                            disabled
                        >
                            Send
                        </button>
                    </div>
                    <p className="mt-2 text-[11px] text-zinc-600">
                        Connect a channel in Settings to enable messaging.
                    </p>
                </div>
            </div>

            {/* Version */}
            <p className="mt-6 text-center text-[10px] text-zinc-700">
                v0.1.0 (dev:local)
            </p>
        </div>
    )
}
