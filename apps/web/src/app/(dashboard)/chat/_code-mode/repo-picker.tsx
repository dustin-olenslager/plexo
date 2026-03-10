// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Joeybuilt LLC

'use client'

import { useState } from 'react'
import { GitBranch, Link2, Plus, Github, ArrowRight, FolderGit2 } from 'lucide-react'

export interface RepoSelection {
    repo: string       // owner/repo
    branch: string
    isNew: boolean     // true if creating new repo
}

interface RepoPickerProps {
    onSelect: (selection: RepoSelection) => void
    className?: string
}

export function RepoPicker({ onSelect, className = '' }: RepoPickerProps) {
    const [mode, setMode] = useState<'existing' | 'new'>('existing')
    const [repo, setRepo] = useState('')
    const [branch, setBranch] = useState('main')
    const [newRepo, setNewRepo] = useState('')
    const [newBranch, setNewBranch] = useState('main')

    function submit() {
        if (mode === 'existing') {
            if (!repo.trim()) return
            onSelect({ repo: repo.trim(), branch: branch.trim() || 'main', isNew: false })
        } else {
            if (!newRepo.trim()) return
            onSelect({ repo: newRepo.trim(), branch: newBranch.trim() || 'main', isNew: true })
        }
    }

    const isValid = mode === 'existing' ? !!repo.trim() : !!newRepo.trim()

    return (
        <div className={`flex items-center justify-center h-full w-full ${className}`}>
            <div className="max-w-md w-full mx-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-surface-2/60 backdrop-blur-xl border border-border/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
                    {/* Glowing effect top center */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 bg-indigo/20 blur-[50px] pointer-events-none rounded-full" />
                    
                    <div className="text-center mb-6 relative">
                        <div className="w-12 h-12 rounded-xl bg-surface-3 border border-border flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:border-indigo/30 group-hover:bg-indigo-dim transition-all duration-500">
                            <FolderGit2 className="w-6 h-6 text-indigo" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary tracking-tight font-display">Workspace Configuration</h3>
                        <p className="text-sm text-text-muted mt-1.5">
                            Connect your agent to a codebase.
                        </p>
                    </div>

                    {/* Segmented Control */}
                    <div className="flex p-1 bg-surface-1 rounded-xl mb-6 border border-border/50 relative">
                        <div 
                            className={`absolute inset-y-1 w-[calc(50%-4px)] bg-surface-3 border border-border rounded-lg shadow-sm transition-all duration-300 ease-out z-0`}
                            style={{ 
                                left: mode === 'existing' ? '4px' : 'calc(50%)' 
                            }}
                        />
                        <button
                            onClick={() => setMode('existing')}
                            className={`relative z-10 w-1/2 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${mode === 'existing' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            <Link2 className="w-4 h-4" />
                            Existing Repo
                        </button>
                        <button
                            onClick={() => setMode('new')}
                            className={`relative z-10 w-1/2 flex items-center justify-center gap-2 py-2 text-sm font-medium transition-colors ${mode === 'new' ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'}`}
                        >
                            <Plus className="w-4 h-4" />
                            Create New
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1.5 relative z-10">
                            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted ml-1">
                                {mode === 'existing' ? 'Repository Path' : 'Project Name'}
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                    <Github className="w-4.5 h-4.5" />
                                </span>
                                <input
                                    value={mode === 'existing' ? repo : newRepo}
                                    onChange={(e) => mode === 'existing' ? setRepo(e.target.value) : setNewRepo(e.target.value)}
                                    placeholder={mode === 'existing' ? "owner/repo (e.g. joeybuilt-official/plexo)" : "my-awesome-project"}
                                    className="w-full bg-surface-1 border border-border hover:border-border-subtle rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:border-indigo focus:ring-1 focus:ring-indigo/20 transition-all font-mono"
                                    onKeyDown={(e) => e.key === 'Enter' && isValid && submit()}
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5 relative z-10">
                            <label className="text-xs font-semibold uppercase tracking-wider text-text-muted ml-1">
                                Target Branch
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                                    <GitBranch className="w-4.5 h-4.5" />
                                </span>
                                <input
                                    value={mode === 'existing' ? branch : newBranch}
                                    onChange={(e) => mode === 'existing' ? setBranch(e.target.value) : setNewBranch(e.target.value)}
                                    placeholder="main"
                                    className="w-full bg-surface-1 border border-border hover:border-border-subtle rounded-xl pl-10 pr-4 py-3 text-sm text-text-primary placeholder:text-text-muted/50 outline-none focus:border-indigo focus:ring-1 focus:ring-indigo/20 transition-all font-mono shadow-sm"
                                    onKeyDown={(e) => e.key === 'Enter' && isValid && submit()}
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={submit}
                        disabled={!isValid}
                        className={`w-full mt-8 py-3 px-4 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 group relative z-10 overflow-hidden ${mode === 'existing' ? 'bg-indigo hover:bg-indigo-600 focus:ring-indigo/50' : 'bg-emerald hover:bg-emerald-600 focus:ring-emerald/50'} disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2`}
                    >
                        <span className="relative z-10 flex items-center gap-2">
                            {mode === 'existing' ? 'Connect Repository' : 'Create & Connect'}
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />
                    </button>
                    
                    {/* Inline shimmer animation for button */}
                    <style dangerouslySetInnerHTML={{__html: `
                        @keyframes shimmer {
                            100% {
                                transform: translateX(100%);
                            }
                        }
                    `}} />
                </div>
            </div>
        </div>
    )
}
