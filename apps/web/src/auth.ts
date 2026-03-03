import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import GitHub from 'next-auth/providers/github'

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Credentials({
            name: 'Email',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                // Phase 1 stub — real validation against DB + bcrypt in Phase 2
                // This allows local development login
                if (
                    credentials?.email === 'admin@plexo.dev' &&
                    credentials?.password === 'plexo-dev-only'
                ) {
                    return {
                        id: '00000000-0000-0000-0000-000000000001',
                        email: 'admin@plexo.dev',
                        name: 'Admin',
                    }
                }
                return null
            },
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
        }),
    ],
    session: { strategy: 'jwt' },
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id
            }
            return token
        },
        async session({ session, token }) {
            if (session.user && token.id) {
                session.user.id = token.id as string
            }
            return session
        },
    },
})
