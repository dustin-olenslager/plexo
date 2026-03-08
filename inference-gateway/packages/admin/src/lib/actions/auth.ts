'use server'

import { signIn } from '@/lib/auth'
import { db } from '@/lib/db'
import { adminUsers } from '@/lib/schema'
import bcrypt from 'bcrypt'
import { redirect } from 'next/navigation'
import { captureAdminEvent } from '@/lib/analytics'

export async function loginAction(formData: FormData) {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: `${process.env.AUTH_URL}/`
    })
  } catch (error: any) {
    if (error.message && error.message.includes('NEXT_REDIRECT')) {
      captureAdminEvent('admin.login_success')
      throw error
    }
    captureAdminEvent('admin.login_failed')
    return 'Invalid credentials'
  }
}

export async function setupAction(formData: FormData) {
  const email = formData.get('email') as string
  const pass = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (!email || !pass || pass !== confirm) return 'Invalid inputs'
  if (pass.length < 12) return 'Password must be at least 12 characters'

  const check = await db.query.adminUsers.findFirst()
  if (check) return 'Setup already complete'

  const hash = await bcrypt.hash(pass, 12)
  await db.insert(adminUsers).values({
    email,
    passwordHash: hash,
    createdAt: new Date(),
  })

  captureAdminEvent('admin.setup_completed')
  redirect('/login')
}
