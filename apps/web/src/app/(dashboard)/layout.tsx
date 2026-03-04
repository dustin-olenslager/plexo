import { Sidebar } from '@web/components/layout/sidebar'
import { DashboardRefresher } from './_components/dashboard-refresher'
import { WorkspaceProvider } from '@web/context/workspace'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <WorkspaceProvider>
            <div className="flex h-screen overflow-hidden">
                <Sidebar />
                <main className="flex-1 overflow-auto bg-zinc-925 p-6">
                    {/* SSE listener — refreshes server components on task events */}
                    <DashboardRefresher />
                    {children}
                </main>
            </div>
        </WorkspaceProvider>
    )
}
