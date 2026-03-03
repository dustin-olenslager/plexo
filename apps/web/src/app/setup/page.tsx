'use client'

import { useState } from 'react'
import { Check, ChevronRight, Loader2, ExternalLink, AlertCircle } from 'lucide-react'

type Step = 'welcome' | 'workspace' | 'anthropic' | 'test' | 'done'

const STEPS: Step[] = ['welcome', 'workspace', 'anthropic', 'test', 'done']

function StepIndicator({ current }: { current: Step }) {
    const labels = ['Welcome', 'Workspace', 'Anthropic', 'Test', 'Done']
    const idx = STEPS.indexOf(current)
    return (
        <div className="flex items-center gap-2 mb-8">
            {STEPS.slice(0, -1).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${i < idx ? 'bg-indigo-600 text-white' :
                            i === idx ? 'border-2 border-indigo-500 text-indigo-400' :
                                'border border-zinc-700 text-zinc-600'
                        }`}>
                        {i < idx ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs ${i === idx ? 'text-zinc-200 font-medium' : 'text-zinc-600'}`}>{labels[i]}</span>
                    {i < STEPS.length - 2 && <ChevronRight className="h-3 w-3 text-zinc-700" />}
                </div>
            ))}
        </div>
    )
}

export default function SetupPage() {
    const [step, setStep] = useState<Step>('welcome')
    const [workspaceName, setWorkspaceName] = useState('')
    const [anthropicKey, setAnthropicKey] = useState('')
    const [workspaceId, setWorkspaceId] = useState<string | null>(null)
    const [testing, setTesting] = useState(false)
    const [testResult, setTestResult] = useState<'ok' | 'fail' | null>(null)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const apiBase = '/api' // goes through Next.js rewrite → Express

    async function createWorkspace() {
        setSaving(true)
        setError(null)
        try {
            const res = await fetch(`${apiBase}/auth/workspace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: workspaceName.trim() }),
            })
            if (!res.ok) {
                const err = await res.json() as { error?: { message?: string } }
                throw new Error(err.error?.message ?? 'Failed to create workspace')
            }
            const data = await res.json() as { workspaceId: string }
            setWorkspaceId(data.workspaceId)
            setStep('anthropic')
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setSaving(false)
        }
    }

    async function saveAnthropicKey() {
        if (!workspaceId) return
        setSaving(true)
        setError(null)
        try {
            const res = await fetch(`${apiBase}/connections/install`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    registryId: 'anthropic',
                    credentials: { api_key: anthropicKey.trim() },
                }),
            })
            // Anthropic may not be in registry — that's OK, proceed anyway
            if (!res.ok && res.status !== 404) {
                // Non-fatal: we can still set env-level key
            }
            setStep('test')
        } catch {
            // Non-fatal
            setStep('test')
        } finally {
            setSaving(false)
        }
    }

    async function runTest() {
        if (!workspaceId) return
        setTesting(true)
        setTestResult(null)
        try {
            // Submit a simple ping task
            const res = await fetch(`${apiBase}/tasks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workspaceId,
                    type: 'automation',
                    source: 'setup-wizard',
                    context: { description: 'Say "Plexo is ready!" and nothing else.' },
                    priority: 10,
                }),
            })
            setTestResult(res.ok ? 'ok' : 'fail')
        } catch {
            setTestResult('fail')
        } finally {
            setTesting(false)
        }
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
            <div className="w-full max-w-lg">
                {/* Logo */}
                <div className="mb-8 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-lg shadow-indigo-500/20">
                        P
                    </div>
                    <span className="text-lg font-bold text-zinc-100">Plexo Setup</span>
                </div>

                <StepIndicator current={step} />

                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-7 backdrop-blur-sm">
                    {/* ── Welcome ── */}
                    {step === 'welcome' && (
                        <div className="flex flex-col gap-5">
                            <div>
                                <h1 className="text-xl font-bold text-zinc-50">Welcome to Plexo</h1>
                                <p className="mt-1.5 text-sm text-zinc-500 leading-relaxed">
                                    This wizard will get your AI agent workspace running in under 2 minutes.
                                    No terminal required after this point.
                                </p>
                            </div>
                            <ul className="flex flex-col gap-2">
                                {['Create your workspace', 'Connect Anthropic API key', 'Run a test task'].map((item, i) => (
                                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-400">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-500">{i + 1}</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => setStep('workspace')}
                                className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                            >
                                Get started
                            </button>
                        </div>
                    )}

                    {/* ── Workspace ── */}
                    {step === 'workspace' && (
                        <div className="flex flex-col gap-5">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-50">Name your workspace</h2>
                                <p className="mt-1 text-sm text-zinc-500">This is typically your team or project name.</p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="workspace-name" className="text-sm font-medium text-zinc-300">Workspace name</label>
                                <input
                                    id="workspace-name"
                                    type="text"
                                    value={workspaceName}
                                    onChange={(e) => setWorkspaceName(e.target.value)}
                                    placeholder="My Team"
                                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && workspaceName.trim() && void createWorkspace()}
                                />
                            </div>
                            {error && (
                                <div className="flex items-center gap-2 text-xs text-red-400">
                                    <AlertCircle className="h-3.5 w-3.5" /> {error}
                                </div>
                            )}
                            <button
                                onClick={() => void createWorkspace()}
                                disabled={!workspaceName.trim() || saving}
                                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                {saving ? 'Creating…' : 'Continue'}
                            </button>
                        </div>
                    )}

                    {/* ── Anthropic ── */}
                    {step === 'anthropic' && (
                        <div className="flex flex-col gap-5">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-50">Connect Anthropic</h2>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Plexo uses Claude for task execution. You need an API key or can use OAuth.
                                </p>
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor="anthropic-key" className="text-sm font-medium text-zinc-300">API Key</label>
                                <input
                                    id="anthropic-key"
                                    type="password"
                                    value={anthropicKey}
                                    onChange={(e) => setAnthropicKey(e.target.value)}
                                    placeholder="sk-ant-api03-…"
                                    className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none font-mono"
                                    autoComplete="new-password"
                                    autoFocus
                                />
                                <a
                                    href="https://console.anthropic.com/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300"
                                >
                                    Get a key from console.anthropic.com <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setStep('test')}
                                    className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors"
                                >
                                    Skip for now
                                </button>
                                <button
                                    onClick={() => void saveAnthropicKey()}
                                    disabled={!anthropicKey.trim() || saving}
                                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {saving ? 'Saving…' : 'Save & continue'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Test ── */}
                    {step === 'test' && (
                        <div className="flex flex-col gap-5">
                            <div>
                                <h2 className="text-lg font-bold text-zinc-50">Test your agent</h2>
                                <p className="mt-1 text-sm text-zinc-500">Submit a simple task to verify everything is connected.</p>
                            </div>
                            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-zinc-500">
                                Say &quot;Plexo is ready!&quot; and nothing else.
                            </div>
                            {testResult === 'ok' && (
                                <div className="flex items-center gap-2 rounded-lg bg-emerald-950/40 border border-emerald-900/50 px-4 py-3 text-sm text-emerald-400">
                                    <Check className="h-4 w-4 shrink-0" />
                                    Task queued successfully — your agent will pick it up shortly.
                                </div>
                            )}
                            {testResult === 'fail' && (
                                <div className="flex items-center gap-2 rounded-lg bg-red-950/40 border border-red-900/50 px-4 py-3 text-sm text-red-400">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    Task failed to queue. Make sure the API server is running.
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => void runTest()}
                                    disabled={testing}
                                    className="flex-1 rounded-xl border border-zinc-700 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 hover:text-zinc-200 transition-colors flex items-center justify-center gap-2"
                                >
                                    {testing && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {testing ? 'Sending…' : 'Run test task'}
                                </button>
                                <button
                                    onClick={() => setStep('done')}
                                    className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
                                >
                                    {testResult === 'ok' ? 'Go to dashboard →' : 'Skip to dashboard'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Done ── */}
                    {step === 'done' && (
                        <div className="flex flex-col items-center gap-5 py-4 text-center">
                            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 border border-emerald-500/30">
                                <Check className="h-7 w-7 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-zinc-50">You&apos;re all set!</h2>
                                <p className="mt-1 text-sm text-zinc-500">Your workspace is ready. Head to the dashboard to submit tasks.</p>
                            </div>
                            <a
                                href="/"
                                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors block"
                            >
                                Open dashboard →
                            </a>
                        </div>
                    )}
                </div>

                <p className="mt-4 text-center text-[11px] text-zinc-700">
                    Plexo · BSL 1.1 · <a href="https://getplexo.com" className="hover:text-zinc-500">getplexo.com</a>
                </p>
            </div>
        </div>
    )
}
