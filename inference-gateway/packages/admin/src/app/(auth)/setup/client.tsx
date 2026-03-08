'use client'

import { useTransition, useState } from 'react'
import { setupAction } from '@/lib/actions/auth'

export function ClientSetupPage() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const handleSetup = () => {
    startTransition(async () => {
      const data = new FormData()
      data.set('email', email)
      data.set('password', password)
      data.set('confirm', confirm)
      const err = await setupAction(data)
      if (err) setError(err as string)
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Confirm Password</label>
        <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSetup()} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      {error && <p className="text-sm text-destructive font-medium">{error}</p>}
      <button disabled={isPending || !email || !password || !confirm} onClick={handleSetup} className="mt-2 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring bg-foreground text-background hover:bg-foreground/90 h-10 px-4 py-2">
        {isPending ? 'Creating Account...' : 'Complete Setup'}
      </button>
    </div>
  )
}
