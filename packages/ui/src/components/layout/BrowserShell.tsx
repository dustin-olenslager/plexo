import React from 'react'

export function BrowserShell({ children, sidebar }: { children: React.ReactNode; sidebar: React.ReactNode }) {
    return (
        <div className="flex h-screen overflow-hidden">
            {sidebar}
            <main className="flex-1 overflow-auto bg-zinc-925 p-6">
                {children}
            </main>
        </div>
    )
}
