import { LiveDashboard } from './_components/live-dashboard'
import { QuickSend } from './_components/quick-send'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
                <p className="mt-1 text-sm text-zinc-500">Your AI agent — live</p>
            </div>

            {/* Live dashboard: cards + task feed, SSE-connected */}
            <LiveDashboard />

            {/* Quick Send */}
            <div className="mt-6">
                <QuickSend />
            </div>

            {/* Version */}
            <p className="mt-6 text-center text-[10px] text-zinc-700">
                {process.env.NEXT_PUBLIC_APP_VERSION ?? 'v0.7.0'} · dev
            </p>
        </div>
    )
}
