import { auth } from '@web/auth'

export default async function SetupLayout({ children }: { children: React.ReactNode }) {
    // Calling auth() on the server forces NextAuth to decode the token 
    // and execute the jwt callback, which synchronously processes our 
    // sync-oauth logic and inserts the GitHub user into the database 
    // BEFORE the setup wizard mounts or any API calls are made.
    await auth()
    return children
}
