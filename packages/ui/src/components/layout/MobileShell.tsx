"use client"

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Activity, CheckSquare, MessageSquare, Plug, Settings } from 'lucide-react'

export function MobileShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    // Default view in Mobile is / recent activity, or notifications. 
    // Tasks: /tasks
    // Chat: /chat
    // Connections: /settings/connections
    // Settings: /settings
    
    const navItems = [
        { label: 'Activity', href: '/', icon: Activity },
        { label: 'Tasks', href: '/tasks', icon: CheckSquare },
        { label: 'Chat', href: '/chat', icon: MessageSquare },
        { label: 'Connections', href: '/settings/connections', icon: Plug },
        { label: 'Settings', href: '/settings', icon: Settings },
    ]

    return (
        <div className="flex flex-col h-[100dvh] overflow-hidden bg-zinc-950">
            {/* Main scrollable content area */}
            <main className="flex-1 overflow-auto pb-16 bg-zinc-950">
                {children}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-950 border-t border-zinc-800/80 flex items-center justify-around px-2 z-50">
                {navItems.map((item) => {
                    const active = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                                active ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
