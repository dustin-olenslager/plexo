import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { ClientLoginPage } from './client'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  const users = await db.query.adminUsers.findFirst()
  if (!users) redirect('/setup')

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 h-screen">
      <div className="w-full max-w-sm border border-border bg-card p-6 rounded-lg shadow-sm">
        <h2 className="text-2xl font-bold mb-6">Plexo Gateway Admin</h2>
        <ClientLoginPage />
      </div>
    </div>
  )
}
