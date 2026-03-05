import NextAuth from 'next-auth'
import { authConfig } from './auth'

// Use NextAuth with the config directly in middleware so the authorized
// callback is evaluated in the Edge runtime on every matched request.
export const { auth: middleware } = NextAuth(authConfig)

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login|register|setup).*)'],
}
