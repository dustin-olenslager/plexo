import { Sidebar } from '@web/components/layout/sidebar'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden">
            <Sidebar />
            <main className="flex-1 overflow-auto bg-zinc-925 p-6">
                {children}
            </main>
        </div>
    )
}
