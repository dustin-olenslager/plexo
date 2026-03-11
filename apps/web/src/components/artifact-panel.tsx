import { X, Copy, Check, Download, Monitor, FileText } from 'lucide-react'
import { useState, useEffect } from 'react'

export interface TaskAsset {
    filename: string
    bytes: number
    isText: boolean
    content: string | null
}

export function ArtifactPanel({
    asset,
    onClose,
    onPreview
}: {
    asset: TaskAsset | null
    onClose: () => void
    onPreview?: (filename: string) => void
}) {
    const [copied, setCopied] = useState(false)
    const [open, setOpen] = useState(false)

    // Handle slide animation
    useEffect(() => {
        if (asset) {
            // Small delay to ensure CSS transition works when mounting
            requestAnimationFrame(() => setOpen(true))
        } else {
            setOpen(false)
        }
    }, [asset])

    if (!asset && !open) return null

    const sizeLabel = asset?.bytes 
        ? asset.bytes < 1024 ? `${asset.bytes}B` : asset.bytes < 1024 * 1024 ? `${(asset.bytes / 1024).toFixed(1)}KB` : `${(asset.bytes / (1024 * 1024)).toFixed(1)}MB`
        : ''

    function copyContent() {
        if (!asset?.content) return
        navigator.clipboard.writeText(asset.content).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
        })
    }

    function downloadFile() {
        if (!asset?.content) return
        const blob = new Blob([asset.content], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = asset.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 z-40 bg-background/40 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => {
                    setOpen(false)
                    setTimeout(onClose, 300)
                }}
            />
            {/* Slide-in Panel */}
            <div 
                className={`absolute z-50 top-4 bottom-4 right-4 w-full max-w-lg md:max-w-2xl bg-surface-1 border border-border/80 rounded-[24px] shadow-2xl flex flex-col overflow-hidden transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? 'translate-x-0' : 'translate-x-[110%]'}`}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/60 bg-surface-2/30">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="shrink-0 p-2 rounded-lg bg-azure/10 text-azure">
                            <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold text-text-primary font-mono truncate">{asset?.filename}</span>
                            <span className="text-[11px] text-text-muted">{sizeLabel} • {asset?.isText ? 'Text Document' : 'Binary File'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-4">
                        {asset?.isText && asset?.content && (
                            <>
                                {asset.filename.endsWith('.html') && onPreview && (
                                    <button
                                        onClick={() => onPreview(asset.filename)}
                                        className="rounded-lg bg-azure/10 border border-azure/30 px-3 py-1.5 text-xs font-medium text-azure hover:bg-azure/20 transition-colors flex items-center gap-1.5 mr-1"
                                        title="Open in Preview"
                                    >
                                        <Monitor className="h-3.5 w-3.5" />
                                        Preview
                                    </button>
                                )}
                                <button
                                    onClick={copyContent}
                                    className="rounded-lg bg-surface-2 border border-border/60 p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                                    title="Copy content"
                                >
                                    {copied ? <Check className="h-4 w-4 text-azure" /> : <Copy className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={downloadFile}
                                    className="rounded-lg bg-surface-2 border border-border/60 p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors"
                                    title="Download file"
                                >
                                    <Download className="h-4 w-4" />
                                </button>
                            </>
                        )}
                        <div className="w-px h-5 bg-border/60 mx-1" />
                        <button
                            onClick={() => {
                                setOpen(false)
                                setTimeout(onClose, 300)
                            }}
                            className="rounded-lg bg-surface-2 border border-border/60 p-1.5 text-text-secondary hover:text-text-primary hover:bg-surface-3 hover:text-red transition-colors"
                            title="Close"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto bg-[#0d0d0d]">
                    {asset?.isText && asset.content ? (
                        <pre className="p-5 text-[12px] font-mono text-text-secondary leading-relaxed break-words whitespace-pre-wrap selection:bg-azure/30 selection:text-text-primary">
                            {asset.content}
                        </pre>
                    ) : asset ? (
                        <div className="h-full flex flex-col items-center justify-center text-text-muted gap-3 p-8 text-center">
                            <FileText className="h-10 w-10 text-text-muted/50" />
                            <div>
                                <h3 className="text-text-secondary font-medium mb-1">Binary File</h3>
                                <p className="text-sm">Preview isn&apos;t available for this file type.</p>
                                <p className="text-xs mt-2">Download it from the Tasks page to view.</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>
        </>
    )
}
