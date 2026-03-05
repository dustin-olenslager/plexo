import { auth } from '@web/auth'
import { Sidebar } from '@web/components/layout/sidebar'
import { DashboardRefresher } from './_components/dashboard-refresher'
import { WorkspaceProvider } from '@web/context/workspace'
import { UpdateModal } from '@web/components/update-modal'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    return (
        <WorkspaceProvider>
            <div className="flex h-screen overflow-hidden">
                <Sidebar user={session?.user} />
                <main className="flex-1 overflow-auto bg-zinc-925 p-6">
                    {/* SSE listener — refreshes server components on task events */}
                    <DashboardRefresher />
                    {/* Version check — opens modal automatically when behind */}
                    <UpdateModal />
                    {children}
                </main>
            </div>
        </WorkspaceProvider>
    )
}
