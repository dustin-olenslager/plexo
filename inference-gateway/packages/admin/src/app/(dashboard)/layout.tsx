import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { Activity, Key, Server, Hash, TriangleAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const adminUsers = await db.query.adminUsers.findFirst()
  if (!adminUsers) redirect('/setup')

  const session = await auth()
  if (!session?.user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 border-r border-border bg-card flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight">Plexo Gateway</h1>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground font-medium transition-colors"><Activity className="w-[18px] h-[18px]" /> Overview</Link>
          <Link href="/keys" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground font-medium transition-colors"><Key className="w-[18px] h-[18px]" /> API Keys</Link>
          <Link href="/instances" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground font-medium transition-colors"><Server className="w-[18px] h-[18px]" /> Instances</Link>
          <Link href="/usage" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground font-medium transition-colors"><Hash className="w-[18px] h-[18px]" /> Usage</Link>
          <Link href="/anomalies" className="flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-foreground/80 hover:text-foreground font-medium transition-colors"><TriangleAlert className="w-[18px] h-[18px]" /> Anomalies</Link>
        </nav>
        <div className="p-4 border-t border-border mt-auto">
           <p className="text-sm font-medium truncate">{session.user.email}</p>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-background p-8">
        {children}
      </main>
    </div>
  )
}
