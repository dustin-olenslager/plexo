import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from '@/lib/posthog-provider'

export const metadata: Metadata = {
  title: 'Plexo Gateway Admin',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-zinc-50 min-h-screen flex flex-col">
        <PostHogProvider>
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
