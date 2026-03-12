// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Joeybuilt LLC

'use client'

import { ModeSwitcher } from './mode-switcher'
import { ThemeToggle } from '../theme-toggle'
import { PlexoLogo } from '../plexo-logo'
import { usePathname } from 'next/navigation'

export function Header() {
    const pathname = usePathname()
    
    // Some pages might want to hide the header or have a different one
    const isLanding = pathname === '/login' || pathname === '/register' || pathname === '/onboarding'
    if (isLanding) return null

    return (
        <header 
            className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 border-b border-border/40 bg-canvas/40 backdrop-blur-xl h-[56px] md:h-[64px]"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
            <div className="flex items-center gap-4">
                <PlexoLogo showWordmark={true} className="hidden md:flex" />
                <PlexoLogo showWordmark={false} className="md:hidden" />
            </div>

            <div className="absolute left-1/2 -translate-x-1/2">
                <ModeSwitcher />
            </div>

            <div className="flex items-center gap-2">
                <ThemeToggle className="hidden md:flex" />
                <div className="w-8 h-8 rounded-full bg-zinc-800 border border-border/40 md:hidden" />
            </div>
        </header>
    )
}
