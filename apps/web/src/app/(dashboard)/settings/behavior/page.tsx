'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
    Shield,
    Settings2,
    MessageSquare,
    BookOpen,
    Sparkles,
    Wrench,
    Target,
    Lock,
    Plus,
    Trash2,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    RefreshCw,
    Eye,
    EyeOff,
    Check,
    X,
    ArrowLeftRight,
    History,
    Layers,
} from 'lucide-react'
import { useWorkspace } from '@web/context/workspace'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

// ── Types ─────────────────────────────────────────────────────────────────────

type RuleType = 'safety_constraint' | 'operational_rule' | 'communication_style' | 'domain_knowledge' | 'persona_trait' | 'tool_preference' | 'quality_gate'
type RuleSource = 'platform' | 'workspace' | 'project' | 'task'

interface RuleValue {
    type: 'boolean' | 'string' | 'number' | 'enum' | 'text_block' | 'json'
    value: unknown
    options?: string[]
    min?: number
    max?: number
}

interface BehaviorRule {
    id: string
    workspaceId: string
    projectId: string | null
    type: RuleType
    key: string
    label: string
    description: string
    value: RuleValue
    locked: boolean
    source: RuleSource
    tags: string[]
    createdAt: string
    updatedAt: string
}

interface ResolvedRule {
    key: string
    label: string
    description: string
    type: RuleType
    value: RuleValue
    locked: boolean
    effectiveSource: RuleSource
    ruleId: string
    overriddenBy: { ruleId: string; source: RuleSource } | null
}

interface GroupDef {
    id: string
    label: string
    description: string
    icon: string
    ruleTypes: RuleType[]
    locked: boolean
    color: string
    displayOrder: number
}

interface Snapshot {
    id: string
    compiledPrompt: string
    triggeredBy: string
    triggerResourceId: string | null
    createdAt: string
}

// ── Icon map ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
    Shield, Settings2, MessageSquare, BookOpen, Sparkles, Wrench, Target,
}

// ── Color map ─────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { border: string; accent: string; bg: string; text: string; badge: string }> = {
    red: { border: 'border-red-800/40', accent: 'border-l-red-500', bg: 'bg-red-950/20', text: 'text-red-400', badge: 'bg-red-900/30 text-red-400' },
    amber: { border: 'border-amber-800/40', accent: 'border-l-amber-500', bg: 'bg-amber-950/20', text: 'text-amber-400', badge: 'bg-amber-900/30 text-amber-400' },
    blue: { border: 'border-blue-800/40', accent: 'border-l-blue-500', bg: 'bg-blue-950/20', text: 'text-blue-400', badge: 'bg-blue-900/30 text-blue-400' },
    green: { border: 'border-green-800/40', accent: 'border-l-green-500', bg: 'bg-green-950/20', text: 'text-green-400', badge: 'bg-green-900/30 text-green-400' },
    purple: { border: 'border-purple-800/40', accent: 'border-l-purple-500', bg: 'bg-purple-950/20', text: 'text-purple-400', badge: 'bg-purple-900/30 text-purple-400' },
    slate: { border: 'border-slate-700/40', accent: 'border-l-slate-500', bg: 'bg-slate-900/20', text: 'text-slate-400', badge: 'bg-slate-800/40 text-slate-400' },
    orange: { border: 'border-orange-800/40', accent: 'border-l-orange-500', bg: 'bg-orange-950/20', text: 'text-orange-400', badge: 'bg-orange-900/30 text-orange-400' },
    zinc: { border: 'border-zinc-700/40', accent: 'border-l-zinc-500', bg: 'bg-zinc-900/20', text: 'text-zinc-400', badge: 'bg-zinc-800/40 text-zinc-400' },
}

// ── Value renderer/editor ─────────────────────────────────────────────────────

function RuleValueEditor({
    val,
    locked,
    onChange,
}: {
    val: RuleValue
    locked: boolean
    onChange: (v: RuleValue) => void
}) {
    if (locked) {
        return (
            <span className="text-sm text-zinc-500 font-mono">
                {val.type === 'boolean'
                    ? (val.value ? 'enabled' : 'disabled')
                    : String(val.value)}
            </span>
        )
    }

    switch (val.type) {
        case 'boolean':
            return (
                <button
                    onClick={() => onChange({ ...val, value: !val.value })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${val.value ? 'bg-indigo-600' : 'bg-zinc-700'}`}
                >
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${val.value ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
            )

        case 'number':
            return (
                <input
                    type="number"
                    value={val.value as number}
                    min={val.min}
                    max={val.max}
                    onChange={e => onChange({ ...val, value: parseFloat(e.target.value) })}
                    className="w-24 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
            )

        case 'enum':
            return (
                <select
                    value={val.value as string}
                    onChange={e => onChange({ ...val, value: e.target.value })}
                    className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                >
                    {(val.options ?? []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
            )

        case 'string':
            return (
                <input
                    type="text"
                    value={val.value as string}
                    onChange={e => onChange({ ...val, value: e.target.value })}
                    className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                />
            )

        case 'text_block':
            return (
                <textarea
                    value={val.value as string}
                    onChange={e => onChange({ ...val, value: e.target.value })}
                    rows={3}
                    className="flex-1 resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none leading-relaxed"
                />
            )

        default:
            return <span className="text-xs text-zinc-600 font-mono">{JSON.stringify(val.value)}</span>
    }
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: RuleSource }) {
    const map: Record<RuleSource, string> = {
        platform: 'bg-zinc-800 text-zinc-500',
        workspace: 'bg-blue-900/30 text-blue-400',
        project: 'bg-purple-900/30 text-purple-400',
        task: 'bg-amber-900/30 text-amber-400',
    }
    return (
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase tracking-wide ${map[source]}`}>
            {source}
        </span>
    )
}

// ── Rule row ──────────────────────────────────────────────────────────────────

function RuleRow({
    rule,
    onUpdate,
    onDelete,
    showSource = false,
    overriddenBy,
}: {
    rule: BehaviorRule | ResolvedRule
    onUpdate: (id: string, value: RuleValue) => void
    onDelete: (id: string) => void
    showSource?: boolean
    overriddenBy?: { ruleId: string; source: RuleSource } | null
}) {
    const id = 'ruleId' in rule ? rule.ruleId : rule.id
    const source = 'effectiveSource' in rule ? rule.effectiveSource : rule.source
    const [localVal, setLocalVal] = useState<RuleValue>(rule.value)
    const [dirty, setDirty] = useState(false)
    const [saving, setSaving] = useState(false)
    const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

    // Sync when parent updates
    useEffect(() => { setLocalVal(rule.value); setDirty(false) }, [rule.value])

    const handleChange = (v: RuleValue) => {
        setLocalVal(v)
        setDirty(true)
    }

    const handleSave = async () => {
        setSaving(true)
        await onUpdate(id, localVal)
        setSaving(false)
        setDirty(false)
        savedTimer.current = setTimeout(() => { }, 1500)
    }

    const needsTextSave = localVal.type === 'text_block' || localVal.type === 'string' || localVal.type === 'json'
    const autoSaveTypes = ['boolean', 'number', 'enum']
    const shouldAutoSave = autoSaveTypes.includes(localVal.type)

    // Auto-save for toggle/select/number changes
    useEffect(() => {
        if (dirty && shouldAutoSave) {
            void onUpdate(id, localVal)
            setDirty(false)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [localVal, dirty, shouldAutoSave])

    return (
        <div className={`flex flex-col gap-2 py-3 border-b border-zinc-800/60 last:border-0 ${overriddenBy ? 'opacity-60' : ''}`}>
            <div className="flex items-start gap-3">
                {rule.locked && (
                    <Lock className="h-3.5 w-3.5 text-zinc-600 mt-0.5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-200">{rule.label}</span>
                        {showSource && <SourceBadge source={source} />}
                        {overriddenBy && (
                            <span className="text-[10px] text-zinc-600 italic">overridden at {overriddenBy.source} level</span>
                        )}
                        {rule.locked && (
                            <span className="text-[10px] text-zinc-600 px-1.5 py-0.5 rounded border border-zinc-800">enforced</span>
                        )}
                    </div>
                    {rule.description && (
                        <p className="text-xs text-zinc-600 mt-0.5">{rule.description}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <RuleValueEditor val={localVal} locked={rule.locked} onChange={handleChange} />
                    {needsTextSave && dirty && (
                        <button
                            onClick={() => void handleSave()}
                            disabled={saving}
                            className="text-xs bg-indigo-600 text-white px-2 py-1 rounded-lg hover:bg-indigo-500 disabled:opacity-50 transition-colors"
                        >
                            {saving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                        </button>
                    )}
                    {!rule.locked && (
                        <button
                            onClick={() => onDelete(id)}
                            className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            aria-label="Delete rule"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Add rule form ─────────────────────────────────────────────────────────────

function AddRuleForm({
    groupTypes,
    onAdd,
    onCancel,
}: {
    groupTypes: RuleType[]
    onAdd: (rule: Partial<BehaviorRule>) => void
    onCancel: () => void
}) {
    const [label, setLabel] = useState('')
    const [description, setDescription] = useState('')
    const [valueType, setValueType] = useState<RuleValue['type']>('text_block')
    const [value, setValue] = useState('')
    const [type] = useState<RuleType>(groupTypes[0] ?? 'communication_style')

    const autoKey = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 50)

    function buildValue(): RuleValue {
        switch (valueType) {
            case 'boolean': return { type: 'boolean', value: false }
            case 'number': return { type: 'number', value: parseFloat(value) || 0 }
            case 'text_block': return { type: 'text_block', value }
            case 'string': return { type: 'string', value }
            case 'enum': return { type: 'enum', value: value.split(',')[0]?.trim() ?? '', options: value.split(',').map(s => s.trim()).filter(Boolean) }
            default: return { type: 'text_block', value }
        }
    }

    return (
        <div className="mt-3 border border-dashed border-zinc-700 rounded-xl p-4 flex flex-col gap-3 bg-zinc-900/30">
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="text-xs text-zinc-500 mb-1 block">Label</label>
                    <input
                        type="text"
                        value={label}
                        onChange={e => setLabel(e.target.value)}
                        placeholder="e.g. Always use TypeScript strict mode"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                        autoFocus
                    />
                    {autoKey && (
                        <p className="text-[10px] text-zinc-700 mt-0.5 font-mono">key: {autoKey}</p>
                    )}
                </div>
                <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Type</label>
                    <select
                        value={valueType}
                        onChange={e => setValueType(e.target.value as RuleValue['type'])}
                        className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100 focus:border-indigo-500 focus:outline-none"
                    >
                        <option value="text_block">Text block</option>
                        <option value="string">Short string</option>
                        <option value="boolean">Toggle</option>
                        <option value="number">Number</option>
                        <option value="enum">Enum (comma-sep)</option>
                    </select>
                </div>
            </div>
            <div>
                <label className="text-xs text-zinc-500 mb-1 block">
                    {valueType === 'text_block' ? 'Content' : valueType === 'enum' ? 'Options (comma-separated)' : 'Value'}
                </label>
                {valueType === 'text_block' ? (
                    <textarea
                        rows={3}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder="Enter the rule content…"
                        className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                    />
                ) : (
                    <input
                        type={valueType === 'number' ? 'number' : 'text'}
                        value={value}
                        onChange={e => setValue(e.target.value)}
                        placeholder={valueType === 'enum' ? 'option1, option2, option3' : ''}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                    />
                )}
            </div>
            <div>
                <label className="text-xs text-zinc-500 mb-1 block">Description (optional)</label>
                <input
                    type="text"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="What does this rule do?"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-500 focus:outline-none"
                />
            </div>
            <div className="flex gap-2 justify-end">
                <button onClick={onCancel} className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-lg transition-colors">
                    Cancel
                </button>
                <button
                    onClick={() => {
                        if (!label.trim()) return
                        onAdd({ type, key: autoKey, label: label.trim(), description, value: buildValue() })
                    }}
                    disabled={!label.trim()}
                    className="text-xs bg-indigo-600 text-white px-3 py-2 rounded-lg hover:bg-indigo-500 disabled:opacity-40 transition-colors"
                >
                    Add rule
                </button>
            </div>
        </div>
    )
}

// ── Behavior card ─────────────────────────────────────────────────────────────

function BehaviorCard({
    group,
    rules,
    inheritanceMode,
    resolvedRules,
    onUpdate,
    onDelete,
    onAdd,
}: {
    group: GroupDef
    rules: BehaviorRule[]
    inheritanceMode: boolean
    resolvedRules: ResolvedRule[]
    onUpdate: (id: string, value: RuleValue) => void
    onDelete: (id: string) => void
    onAdd: (rule: Partial<BehaviorRule>) => void
}) {
    const [expanded, setExpanded] = useState(true)
    const [adding, setAdding] = useState(false)

    const colors = COLOR_MAP[group.color] ?? COLOR_MAP['zinc']!
    const Icon = ICON_MAP[group.icon] ?? Settings2

    // In inheritance mode, show resolved rules for this group's types
    const displayRules = inheritanceMode
        ? resolvedRules.filter(r => group.ruleTypes.includes(r.type))
        : rules.filter(r => group.ruleTypes.includes(r.type))

    const platformCount = inheritanceMode
        ? displayRules.filter(r => 'effectiveSource' in r && r.effectiveSource === 'platform').length
        : 0

    return (
        <div className={`group rounded-xl border ${colors.border} border-l-4 ${colors.accent} bg-zinc-900/40 overflow-hidden transition-all`}>
            {/* Card header */}
            <button
                onClick={() => setExpanded(e => !e)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/20 transition-colors text-left"
            >
                <div className={`p-1.5 rounded-lg ${colors.bg}`}>
                    <Icon className={`h-4 w-4 ${colors.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">{group.label}</span>
                        {group.locked && <Lock className="h-3 w-3 text-zinc-600" />}
                        {platformCount > 0 && (
                            <span className="text-[10px] text-zinc-600">+{platformCount} platform defaults</span>
                        )}
                    </div>
                    <p className="text-xs text-zinc-600 truncate mt-0.5">{group.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
                        {displayRules.length} {displayRules.length === 1 ? 'rule' : 'rules'}
                    </span>
                    {expanded ? <ChevronUp className="h-4 w-4 text-zinc-600" /> : <ChevronDown className="h-4 w-4 text-zinc-600" />}
                </div>
            </button>

            {/* Card body */}
            {expanded && (
                <div className="px-5 pb-4">
                    {displayRules.length === 0 && !adding ? (
                        <p className="text-xs text-zinc-700 py-2 italic">No rules yet.</p>
                    ) : (
                        <div>
                            {displayRules.map(rule => {
                                const resolvedRule = 'effectiveSource' in rule ? rule : null
                                const normalRule = 'effectiveSource' in rule ? null : rule
                                return (
                                    <RuleRow
                                        key={resolvedRule?.ruleId ?? normalRule?.id}
                                        rule={rule as BehaviorRule}
                                        onUpdate={onUpdate}
                                        onDelete={onDelete}
                                        showSource={inheritanceMode}
                                        overriddenBy={resolvedRule?.overriddenBy ?? undefined}
                                    />
                                )
                            })}
                        </div>
                    )}

                    {!group.locked && (
                        adding ? (
                            <AddRuleForm
                                groupTypes={group.ruleTypes}
                                onAdd={(rule) => { onAdd(rule); setAdding(false) }}
                                onCancel={() => setAdding(false)}
                            />
                        ) : (
                            <button
                                onClick={() => setAdding(true)}
                                className={`mt-2 flex items-center gap-1.5 text-xs ${colors.text} hover:opacity-80 transition-opacity`}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add rule
                            </button>
                        )
                    )}
                    {group.locked && (
                        <p className="text-[11px] text-zinc-700 mt-2 flex items-center gap-1.5">
                            <Lock className="h-3 w-3" />
                            These constraints are structurally enforced and cannot be removed or disabled.
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

// ── System prompt preview ─────────────────────────────────────────────────────

function SystemPromptPreview({
    workspaceId,
    refreshTick,
}: {
    workspaceId: string
    refreshTick: number
}) {
    const [open, setOpen] = useState(false)
    const [prompt, setPrompt] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!open || !workspaceId) return
        let cancelled = false
        const debounce = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`${API}/api/v1/behavior/${workspaceId}/resolve`)
                if (!res.ok) return
                const data = await res.json() as { compiledPrompt: string }
                if (!cancelled) setPrompt(data.compiledPrompt)
            } finally {
                if (!cancelled) setLoading(false)
            }
        }, 500)
        return () => { cancelled = true; clearTimeout(debounce) }
    }, [open, workspaceId, refreshTick])

    return (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-zinc-800/20 transition-colors text-left"
            >
                {open ? <EyeOff className="h-4 w-4 text-zinc-500" /> : <Eye className="h-4 w-4 text-zinc-500" />}
                <span className="text-sm font-medium text-zinc-300">
                    {open ? 'Hide' : 'Preview'} compiled system prompt
                </span>
                <span className="ml-auto text-xs text-zinc-600">What the agent actually receives →</span>
            </button>
            {open && (
                <div className="px-5 pb-5">
                    {loading ? (
                        <div className="flex items-center gap-2 py-4 text-sm text-zinc-600">
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Compiling…
                        </div>
                    ) : prompt ? (
                        <pre className="text-xs text-zinc-400 bg-zinc-950 rounded-lg p-4 overflow-auto max-h-80 whitespace-pre-wrap leading-relaxed border border-zinc-800">
                            {prompt}
                        </pre>
                    ) : (
                        <p className="text-sm text-zinc-600 py-2 italic">No rules configured yet — prompt will be empty.</p>
                    )}
                </div>
            )}
        </div>
    )
}

// ── History panel ─────────────────────────────────────────────────────────────

function HistoryPanel({ workspaceId }: { workspaceId: string }) {
    const [snapshots, setSnapshots] = useState<Snapshot[]>([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState<Snapshot | null>(null)

    useEffect(() => {
        if (!workspaceId) return
        void (async () => {
            const res = await fetch(`${API}/api/v1/behavior/${workspaceId}/snapshots?limit=20`)
            if (res.ok) setSnapshots((await res.json() as { snapshots: Snapshot[] }).snapshots)
            setLoading(false)
        })()
    }, [workspaceId])

    return (
        <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-600">
                Snapshots are saved each time the agent starts a task or you preview the compiled prompt manually.
            </p>
            {loading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-zinc-600"><RefreshCw className="h-4 w-4 animate-spin" /> Loading…</div>
            ) : snapshots.length === 0 ? (
                <p className="text-sm text-zinc-600 italic py-4">No snapshots yet. Snapshots are created on task start.</p>
            ) : (
                <div className="flex flex-col gap-1.5">
                    {snapshots.map(s => (
                        <div key={s.id}
                            className={`rounded-lg border px-4 py-3 cursor-pointer transition-colors ${selected?.id === s.id ? 'border-indigo-500/40 bg-indigo-950/10' : 'border-zinc-800 hover:border-zinc-700'}`}
                            onClick={() => setSelected(selected?.id === s.id ? null : s)}
                        >
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-zinc-300 capitalize">{s.triggeredBy.replace('_', ' ')}</span>
                                <span className="text-[10px] text-zinc-600">{new Date(s.createdAt).toLocaleString()}</span>
                            </div>
                            {s.triggerResourceId && (
                                <p className="text-[10px] text-zinc-700 font-mono mt-0.5">{s.triggerResourceId.slice(0, 8)}</p>
                            )}
                            {selected?.id === s.id && s.compiledPrompt && (
                                <pre className="mt-3 text-[11px] text-zinc-500 bg-zinc-950 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap border border-zinc-800">
                                    {s.compiledPrompt}
                                </pre>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type Tab = 'rules' | 'history'

export default function BehaviorPage() {
    const { workspaceId: ctxId } = useWorkspace()
    const WS_ID = ctxId || (process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE ?? '')

    const [groups, setGroups] = useState<GroupDef[]>([])
    const [rules, setRules] = useState<BehaviorRule[]>([])
    const [resolvedRules, setResolvedRules] = useState<ResolvedRule[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [inheritanceMode, setInheritanceMode] = useState(false)
    const [tab, setTab] = useState<Tab>('rules')
    const [refreshTick, setRefreshTick] = useState(0)

    // Core prompt fields (previously split across Agent settings)
    const [agentPersona, setAgentPersona] = useState('')
    const [systemPromptExtra, setSystemPromptExtra] = useState('')
    const [promptSaving, setPromptSaving] = useState(false)
    const [promptSaved, setPromptSaved] = useState(false)

    const reload = useCallback(async () => {
        if (!WS_ID) return
        setLoading(true)
        setError(null)
        try {
            const [groupsRes, rulesRes, resolvedRes, wsRes] = await Promise.all([
                fetch(`${API}/api/v1/behavior/${WS_ID}/groups`),
                fetch(`${API}/api/v1/behavior/${WS_ID}`),
                fetch(`${API}/api/v1/behavior/${WS_ID}/resolve`),
                fetch(`${API}/api/workspaces/${WS_ID}`),
            ])
            if (!groupsRes.ok || !rulesRes.ok) throw new Error('Failed to load behavior data')
            const g = (await groupsRes.json() as { groups: GroupDef[] }).groups
            const r = (await rulesRes.json() as { rules: BehaviorRule[] }).rules
            const resolved = resolvedRes.ok
                ? (await resolvedRes.json() as { rules: ResolvedRule[] }).rules
                : []
            setGroups(g.sort((a, b) => a.displayOrder - b.displayOrder))
            setRules(r)
            setResolvedRules(resolved)
            if (wsRes.ok) {
                const ws = await wsRes.json() as { settings: { agentPersona?: string; systemPromptExtra?: string } }
                setAgentPersona(ws.settings?.agentPersona ?? '')
                setSystemPromptExtra(ws.settings?.systemPromptExtra ?? '')
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [WS_ID])

    useEffect(() => { void reload() }, [reload])

    const handleUpdate = useCallback(async (id: string, value: RuleValue) => {
        if (!WS_ID) return
        await fetch(`${API}/api/v1/behavior/${WS_ID}/rules/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ value }),
        })
        setRules(prev => prev.map(r => r.id === id ? { ...r, value } : r))
        setRefreshTick(t => t + 1)
    }, [WS_ID])

    const handleDelete = useCallback(async (id: string) => {
        if (!WS_ID) return
        await fetch(`${API}/api/v1/behavior/${WS_ID}/rules/${id}`, { method: 'DELETE' })
        setRules(prev => prev.filter(r => r.id !== id))
        setRefreshTick(t => t + 1)
    }, [WS_ID])

    const handleAdd = useCallback(async (partial: Partial<BehaviorRule>) => {
        if (!WS_ID) return
        const res = await fetch(`${API}/api/v1/behavior/${WS_ID}/rules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(partial),
        })
        if (res.ok) {
            const rule = await res.json() as BehaviorRule
            setRules(prev => [...prev, rule])
            setRefreshTick(t => t + 1)
        }
    }, [WS_ID])

    return (
        <div className="flex flex-col gap-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-xl font-bold text-zinc-50">Agent Behavior</h1>
                    <p className="mt-0.5 text-sm text-zinc-500">
                        Layered rules that shape how your agent thinks, communicates, and acts.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setInheritanceMode(m => !m)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${inheritanceMode
                            ? 'border-indigo-500/40 bg-indigo-950/20 text-indigo-400'
                            : 'border-zinc-700 text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <ArrowLeftRight className="h-3.5 w-3.5" />
                        Inheritance view
                    </button>
                    <button
                        onClick={() => void reload()}
                        disabled={loading}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Layer legend */}
            <div className="flex items-center gap-4 text-xs text-zinc-600 flex-wrap">
                <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Rule sources:</span>
                {(['platform', 'workspace', 'project', 'task'] as RuleSource[]).map(s => (
                    <SourceBadge key={s} source={s} />
                ))}
                <span className="text-zinc-700 ml-auto">Later layers override earlier ones</span>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-zinc-800">
                {([
                    { id: 'rules', label: 'Rules', icon: Settings2 },
                    { id: 'history', label: 'History', icon: History },
                ] as { id: Tab; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setTab(id)}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === id
                            ? 'border-indigo-500 text-indigo-400'
                            : 'border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                    >
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                    </button>
                ))}
            </div>

            {!WS_ID && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    NEXT_PUBLIC_DEFAULT_WORKSPACE not configured.
                </div>
            )}

            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-800/40 bg-red-950/20 px-4 py-3 text-sm text-red-400">
                    <X className="h-4 w-4 shrink-0" />
                    {error}
                    <button onClick={() => void reload()} className="ml-auto text-xs underline">Retry</button>
                </div>
            )}

            {tab === 'rules' && (
                <>
                    {loading ? (
                        <div className="flex items-center gap-2 py-8 text-sm text-zinc-600">
                            <RefreshCw className="h-4 w-4 animate-spin" /> Loading…
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {groups.map(group => (
                                <BehaviorCard
                                    key={group.id}
                                    group={group}
                                    rules={rules}
                                    inheritanceMode={inheritanceMode}
                                    resolvedRules={resolvedRules}
                                    onUpdate={handleUpdate}
                                    onDelete={handleDelete}
                                    onAdd={handleAdd}
                                />
                            ))}
                        </div>
                    )}

                    {!loading && WS_ID && (
                        <SystemPromptPreview workspaceId={WS_ID} refreshTick={refreshTick} />
                    )}
                </>
            )}

            {tab === 'history' && WS_ID && (
                <HistoryPanel workspaceId={WS_ID} />
            )}
        </div>
    )
}
