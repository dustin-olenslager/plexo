'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Link2,
    Link2Off,
    ExternalLink,
    Key,
    Webhook,
    Globe2,
    CheckCircle2,
    Circle,
    AlertCircle,
    RefreshCw,
    Trash2,
    ChevronRight,
    Search,
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

type AuthType = 'oauth2' | 'api_key' | 'webhook' | 'none'
type ConnectionStatus = 'active' | 'disconnected' | 'error'

interface SetupField {
    key: string
    label: string
    type: 'text' | 'password' | 'url'
    required?: boolean
    placeholder?: string
}

interface RegistryItem {
    id: string
    name: string
    description: string
    category: string
    logoUrl: string | null
    authType: AuthType
    setupFields: SetupField[]
}

interface InstalledItem {
    id: string
    registryId: string
    name: string
    status: ConnectionStatus
    scopesGranted: string[]
    lastVerifiedAt: string | null
    createdAt: string
}

const AUTH_ICON: Record<AuthType, React.ElementType> = {
    oauth2: Globe2,
    api_key: Key,
    webhook: Webhook,
    none: Circle,
}

const AUTH_LABEL: Record<AuthType, string> = {
    oauth2: 'OAuth 2.0',
    api_key: 'API key',
    webhook: 'Webhook',
    none: 'No auth',
}

const CATEGORY_COLORS: Record<string, string> = {
    'version-control': 'bg-violet-500/15 text-violet-400',
    'communication': 'bg-sky-500/15 text-sky-400',
    'project-management': 'bg-amber-500/15 text-amber-400',
    'ai': 'bg-indigo-500/15 text-indigo-400',
    'monitoring': 'bg-red-500/15 text-red-400',
    'database': 'bg-emerald-500/15 text-emerald-400',
}

function categoryColor(cat: string): string {
    return CATEGORY_COLORS[cat] ?? 'bg-zinc-500/15 text-zinc-400'
}

function StatusDot({ status }: { status: ConnectionStatus | null }) {
    if (status === 'active') return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
    if (status === 'error') return <AlertCircle className="h-3.5 w-3.5 text-red-400" />
    if (status === 'disconnected') return <Link2Off className="h-3.5 w-3.5 text-zinc-500" />
    return <Circle className="h-3.5 w-3.5 text-zinc-700" />
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ConnectionsPage() {
    const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
    const workspaceId = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE ?? ''

    const [registry, setRegistry] = useState<RegistryItem[]>([])
    const [installed, setInstalled] = useState<InstalledItem[]>([])
    const [selected, setSelected] = useState<RegistryItem | null>(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [installing, setInstalling] = useState(false)
    const [uninstalling, setUninstalling] = useState<string | null>(null)
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
    const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const [regRes, instRes] = await Promise.all([
                fetch(`${apiBase}/api/connections/registry`),
                workspaceId
                    ? fetch(`${apiBase}/api/connections/installed?workspaceId=${workspaceId}`)
                    : Promise.resolve(null),
            ])
            const regData = await regRes.json() as { items: RegistryItem[] }
            setRegistry(regData.items ?? [])
            if (instRes) {
                const instData = await instRes.json() as { items: InstalledItem[] }
                setInstalled(instData.items ?? [])
            }
        } catch {
            // silently fail — show empty state
        } finally {
            setLoading(false)
        }
    }, [apiBase, workspaceId])

    useEffect(() => { void fetchData() }, [fetchData])

    // When selected service changes, reset field values
    useEffect(() => {
        if (!selected) return
        const defaults: Record<string, string> = {}
        for (const f of selected.setupFields ?? []) defaults[f.key] = ''
        setFieldValues(defaults)
        setMessage(null)
    }, [selected?.id])

    const installedFor = (id: string) =>
        installed.find((i) => i.registryId === id) ?? null

    const filtered = registry.filter((r) =>
        search.trim() === '' ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.category.toLowerCase().includes(search.toLowerCase())
    )

    async function handleInstall() {
        if (!selected || !workspaceId) return
        setInstalling(true)
        setMessage(null)
        try {
            const res = await fetch(`${apiBase}/api/connections/install`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    registryId: selected.id,
                    credentials: fieldValues,
                    name: selected.name,
                }),
            })
            if (res.ok) {
                setMessage({ ok: true, text: `${selected.name} connected successfully` })
                void fetchData()
            } else {
                const err = await res.json() as { error?: { message?: string } }
                setMessage({ ok: false, text: err?.error?.message ?? 'Install failed' })
            }
        } catch {
            setMessage({ ok: false, text: 'Network error' })
        } finally {
            setInstalling(false)
        }
    }

    async function handleUninstall(installId: string) {
        if (!workspaceId) return
        setUninstalling(installId)
        try {
            await fetch(`${apiBase}/api/connections/installed/${installId}?workspaceId=${workspaceId}`, {
                method: 'DELETE',
            })
            setMessage({ ok: true, text: 'Connection removed' })
            void fetchData()
        } catch {
            setMessage({ ok: false, text: 'Delete failed' })
        } finally {
            setUninstalling(null)
        }
    }

    const inst = selected ? installedFor(selected.id) : null
    const AuthIcon = selected ? AUTH_ICON[selected.authType] : Key

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-50">Connections</h1>
                    <p className="mt-0.5 text-sm text-zinc-500">
                        Connect Plexo to external services. The agent uses these connections to take action.
                    </p>
                </div>
                <button
                    onClick={() => void fetchData()}
                    disabled={loading}
                    className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Two-panel layout */}
            <div className="flex gap-4 flex-1 min-h-0">
                {/* Left — service list */}
                <div className="w-[260px] shrink-0 flex flex-col gap-2">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-600" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search services…"
                            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/60 pl-8 pr-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                        />
                    </div>

                    {/* Service cards */}
                    <div className="flex flex-col gap-1 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-12 text-sm text-zinc-600">
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Loading…
                            </div>
                        ) : filtered.length === 0 ? (
                            <p className="py-8 text-center text-sm text-zinc-600">No services found</p>
                        ) : filtered.map((item) => {
                            const itemInst = installedFor(item.id)
                            const active = selected?.id === item.id
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setSelected(item)}
                                    className={`text-left rounded-xl border p-3 transition-all ${active
                                            ? 'border-indigo-500/50 bg-zinc-900 shadow-sm shadow-indigo-500/10'
                                            : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700 hover:bg-zinc-900/70'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            {item.logoUrl ? (
                                                <img src={item.logoUrl} alt="" className="h-6 w-6 rounded" />
                                            ) : (
                                                <div className="flex h-6 w-6 items-center justify-center rounded bg-zinc-800 text-[10px] font-bold text-zinc-400">
                                                    {item.name.slice(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-sm font-medium text-zinc-200">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <StatusDot status={itemInst?.status ?? null} />
                                            {active && <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />}
                                        </div>
                                    </div>
                                    <p className="mt-1 text-xs text-zinc-600 pl-8 truncate">{item.description}</p>
                                </button>
                            )
                        })}
                    </div>

                    {/* Summary */}
                    <div className="mt-auto pt-2 text-xs text-zinc-700">
                        {installed.filter((i) => i.status === 'active').length} connected · {registry.length} available
                    </div>
                </div>

                {/* Right — detail panel */}
                <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-y-auto">
                    {!selected ? (
                        <div className="flex h-full items-center justify-center">
                            <div className="text-center">
                                <Link2 className="mx-auto mb-3 h-8 w-8 text-zinc-700" />
                                <p className="text-sm text-zinc-500">Select a service to configure</p>
                            </div>
                        </div>
                    ) : (
                        <div className="p-5">
                            {/* Service header */}
                            <div className="flex items-start gap-4 pb-5 border-b border-zinc-800">
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-800">
                                    {selected.logoUrl ? (
                                        <img src={selected.logoUrl} alt="" className="h-8 w-8 rounded" />
                                    ) : (
                                        <span className="text-lg font-bold text-zinc-400">
                                            {selected.name.slice(0, 2).toUpperCase()}
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-base font-semibold text-zinc-100">{selected.name}</h2>
                                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${categoryColor(selected.category)}`}>
                                            {selected.category.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 text-sm text-zinc-500">{selected.description}</p>
                                    <div className="mt-1.5 flex items-center gap-3 text-xs text-zinc-600">
                                        <span className="flex items-center gap-1">
                                            <AuthIcon className="h-3.5 w-3.5" />
                                            {AUTH_LABEL[selected.authType]}
                                        </span>
                                        {inst && (
                                            <span className="flex items-center gap-1">
                                                <StatusDot status={inst.status} />
                                                <span className="capitalize">{inst.status}</span>
                                                {inst.lastVerifiedAt && (
                                                    <span className="text-zinc-700 ml-1">
                                                        · verified {new Date(inst.lastVerifiedAt).toLocaleDateString()}
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Connection config */}
                            <div className="pt-5 flex flex-col gap-5">
                                {inst ? (
                                    /* Already installed */
                                    <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                                <span className="text-sm font-medium text-emerald-300">
                                                    Connected since {new Date(inst.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => void handleUninstall(inst.id)}
                                                disabled={uninstalling === inst.id}
                                                className="flex items-center gap-1.5 rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-700 hover:text-red-300 transition-colors disabled:opacity-50"
                                            >
                                                {uninstalling === inst.id
                                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                    : <Trash2 className="h-3.5 w-3.5" />
                                                }
                                                Disconnect
                                            </button>
                                        </div>
                                        {inst.scopesGranted.length > 0 && (
                                            <div className="mt-3 flex flex-wrap gap-1.5">
                                                {inst.scopesGranted.map((s) => (
                                                    <span key={s} className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                                                        {s}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Install form */
                                    <div className="flex flex-col gap-4">
                                        {selected.authType === 'oauth2' && (
                                            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Globe2 className="h-4 w-4 text-indigo-400" />
                                                    <span className="font-medium text-zinc-200">OAuth 2.0 flow</span>
                                                </div>
                                                <p className="text-xs leading-relaxed">
                                                    Click below to start the OAuth flow. You&apos;ll be redirected to {selected.name} to grant access, then redirected back.
                                                </p>
                                                <button
                                                    onClick={() => window.open(
                                                        `${apiBase}/api/oauth/${selected.id}/start?workspaceId=${workspaceId}`,
                                                        '_blank',
                                                        'width=600,height=700'
                                                    )}
                                                    className="mt-3 flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Connect {selected.name}
                                                </button>
                                            </div>
                                        )}

                                        {(selected.setupFields ?? []).length > 0 && (
                                            <div className="flex flex-col gap-3">
                                                {selected.setupFields.map((field) => (
                                                    <div key={field.key} className="flex flex-col gap-1.5">
                                                        <label className="text-sm font-medium text-zinc-300">
                                                            {field.label}
                                                            {field.required && <span className="ml-1 text-red-400">*</span>}
                                                        </label>
                                                        <input
                                                            type={field.type === 'password' ? 'password' : 'text'}
                                                            value={fieldValues[field.key] ?? ''}
                                                            onChange={(e) => setFieldValues((v) => ({ ...v, [field.key]: e.target.value }))}
                                                            placeholder={field.placeholder ?? ''}
                                                            autoComplete="new-password"
                                                            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/30"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {(selected.authType === 'api_key' || selected.authType === 'webhook' || selected.authType === 'none') && (
                                            <button
                                                onClick={() => void handleInstall()}
                                                disabled={installing || !workspaceId}
                                                className="flex w-fit items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                            >
                                                {installing
                                                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                                    : <Link2 className="h-3.5 w-3.5" />
                                                }
                                                {installing ? 'Connecting…' : `Connect ${selected.name}`}
                                            </button>
                                        )}
                                    </div>
                                )}

                                {message && (
                                    <div className={`rounded-lg border px-3 py-2.5 text-sm ${message.ok
                                            ? 'border-emerald-800/50 bg-emerald-950/30 text-emerald-400'
                                            : 'border-red-800/50 bg-red-950/30 text-red-400'
                                        }`}>
                                        {message.text}
                                    </div>
                                )}

                                {/* What the agent can do with this connection */}
                                {inst?.status === 'active' && (
                                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                            What Plexo can do
                                        </h3>
                                        <p className="text-sm text-zinc-500">
                                            With {selected.name} connected, the agent can read and write on your behalf
                                            — creating tasks, opening PRs, sending messages, and more, depending on the scopes granted.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
