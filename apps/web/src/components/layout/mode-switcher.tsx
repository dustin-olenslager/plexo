// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Joeybuilt LLC

'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, Code2, Sparkles, LayoutPanelLeft } from 'lucide-react'
import { useCallback } from 'react'

export type AppMode = 'chat' | 'code' | 'insights'

export function ModeSwitcher({ className = '' }: { className?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // Determine active mode from path or params
    const isChatPath = pathname.startsWith('/chat') || pathname === '/'
    const isCodeMode = searchParams.get('mode') === 'code' || (isChatPath && searchParams.get('codeMode') === '1')
    const isInsightsPath = pathname.startsWith('/insights') || pathname.startsWith('/settings/intelligence')
    
    let activeMode: AppMode = 'chat'
    if (isCodeMode) activeMode = 'code'
    else if (isInsightsPath) activeMode = 'insights'

    const setMode = useCallback((mode: AppMode) => {
        const params = new URLSearchParams(searchParams)
        if (mode === 'chat') {
            params.delete('mode')
            params.delete('codeMode')
            router.push(`/chat?${params.toString()}`)
        } else if (mode === 'code') {
            params.set('mode', 'code')
            params.set('codeMode', '1')
            router.push(`/chat?${params.toString()}`)
        } else if (mode === 'insights') {
            router.push('/insights')
        }
    }, [router, searchParams])

    const modes = [
        { id: 'chat', label: 'Chat', icon: MessageSquare },
        { id: 'code', label: 'Code', icon: Code2 },
        { id: 'insights', label: 'Insights', icon: Sparkles },
    ] as const

    return (
        <div className={`flex items-center bg-zinc-900/40 p-1 rounded-xl border border-border/40 backdrop-blur-md ${className}`}>
            {modes.map(({ id, label, icon: Icon }) => {
                const active = activeMode === id
                return (
                    <button
                        key={id}
                        onClick={() => setMode(id)}
                        className={`relative flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                            active 
                                ? 'text-text-primary bg-zinc-800 shadow-sm' 
                                : 'text-text-muted hover:text-text-secondary hover:bg-zinc-800/40'
                        }`}
                    >
                        <Icon className={`w-4 h-4 ${active ? 'text-azure' : 'text-text-muted'}`} />
                        <span className="hidden md:inline">{label}</span>
                        {active && (
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-azure rounded-full md:hidden" />
                        )}
                    </button>
                )
            })}
        </div>
    )
}
