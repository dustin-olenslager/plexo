import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ClientSetupPage } from './client'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const users = await db.query.adminUsers.findFirst()
  if (users) redirect('/login')

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 h-screen">
      <div className="w-full max-w-sm border border-border bg-card p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-2">Welcome to Plexo Gateway</h2>
        <p className="text-muted-foreground text-sm mb-6">Create the initial admin account.</p>
        <ClientSetupPage />
      </div>
    </div>
  )
}
