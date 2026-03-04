/**
 * Telegram channel adapter.
 *
 * Architecture:
 * - Production: receives messages via webhook (registered at startup via PUBLIC_URL)
 * - Local dev: falls back to long polling (getUpdates loop)
 * - Each message creates a task in the queue and acknowledges via reply
 *
 * Setup:
 * - Set TELEGRAM_BOT_TOKEN env var (or connect via Channels UI)
 * - Set TELEGRAM_WEBHOOK_SECRET for webhook request validation (prod only)
 * - Webhook URL: ${PUBLIC_URL}/api/channels/telegram/webhook
 */

import { Router, type Router as RouterType, type Request, type Response } from 'express'
import { pushTask } from '@plexo/queue'
import { logger } from '../logger.js'
import { emitToWorkspace } from '../sse-emitter.js'
import { db, eq } from '@plexo/db'
import { channels } from '@plexo/db'

export const telegramRouter: RouterType = Router()

const API_BASE = 'https://api.telegram.org/bot'

// Resolved at init — may come from env or DB
let _botToken: string | null = null
let _webhookSecret: string | null = null

// ── Telegram API helpers ─────────────────────────────────────────────────────

async function sendMessage(chatId: number | string, text: string): Promise<void> {
    if (!_botToken) return
    await fetch(`${API_BASE}${_botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    }).catch((err: Error) => logger.warn({ err }, 'Telegram sendMessage failed'))
}

async function setWebhook(url: string, secret: string): Promise<void> {
    if (!_botToken) return
    const res = await fetch(`${API_BASE}${_botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, secret_token: secret }),
    })
    const data = await res.json() as { ok: boolean; description?: string }
    if (data.ok) {
        logger.info({ url }, 'Telegram webhook registered')
    } else {
        logger.error({ description: data.description }, 'Telegram webhook registration failed')
    }
}

async function deleteWebhook(): Promise<void> {
    if (!_botToken) return
    await fetch(`${API_BASE}${_botToken}/deleteWebhook`, { method: 'POST' }).catch(() => null)
}

// ── Workspace resolver ───────────────────────────────────────────────────────

const CHAT_TO_WORKSPACE = new Map<string, string>()

export function registerTelegramChat(chatId: string, workspaceId: string): void {
    CHAT_TO_WORKSPACE.set(chatId, workspaceId)
}

async function resolveWorkspace(chatId: string): Promise<string | null> {
    // 1. In-memory registry (set via registerTelegramChat or previous DB lookup)
    if (CHAT_TO_WORKSPACE.has(chatId)) return CHAT_TO_WORKSPACE.get(chatId)!

    // 2. Env fallback for single-workspace setups
    if (process.env.DEFAULT_WORKSPACE_ID) return process.env.DEFAULT_WORKSPACE_ID

    // 3. Look up first enabled Telegram channel in DB
    try {
        const [ch] = await db.select({ workspaceId: channels.workspaceId })
            .from(channels)
            .where(eq(channels.type, 'telegram'))
            .limit(1)
        if (ch?.workspaceId) {
            CHAT_TO_WORKSPACE.set(chatId, ch.workspaceId)
            return ch.workspaceId
        }
    } catch (err) {
        logger.warn({ err }, 'Telegram workspace DB lookup failed')
    }

    return null
}

// ── Shared message handler ───────────────────────────────────────────────────

interface TelegramUpdate {
    update_id: number
    message?: {
        message_id: number
        from: { id: number; username?: string; first_name?: string }
        chat: { id: number; type: string; title?: string }
        date: number
        text?: string
    }
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
    const msg = update.message
    if (!msg?.text) return

    const chatId = String(msg.chat.id)
    const workspaceId = await resolveWorkspace(chatId)

    if (!workspaceId) {
        logger.warn({ chatId }, 'Telegram message from unregistered chat — ignored')
        await sendMessage(chatId,
            '⚠️ This chat is not linked to a Plexo workspace. '
            + 'Connect via Settings → Channels.')
        return
    }

    logger.info({ chatId, workspaceId, text: msg.text.slice(0, 80) }, 'Telegram message received')

    try {
        const taskId = await pushTask({
            workspaceId,
            type: 'automation',
            source: 'telegram',
            context: {
                description: msg.text,
                channel: 'telegram',
                chatId,
                from: msg.from.username ?? msg.from.first_name ?? String(msg.from.id),
                messageId: msg.message_id,
            },
            priority: 2,
        })

        await sendMessage(chatId, `✅ Task queued (${taskId.slice(0, 8)}…)\n_I'll reply here when it's done._`)

        emitToWorkspace(workspaceId, {
            type: 'task_queued_via_telegram',
            taskId,
            chatId,
            text: msg.text.slice(0, 200),
        })
    } catch (err) {
        logger.error({ err, chatId }, 'Failed to queue Telegram task')
        await sendMessage(chatId, '❌ Failed to queue task. Please try again.')
    }
}

// ── Webhook handler (production) ─────────────────────────────────────────────

telegramRouter.post('/webhook', async (req: Request, res: Response) => {
    const secret = req.headers['x-telegram-bot-api-secret-token']
    if (_webhookSecret && secret !== _webhookSecret) {
        logger.warn('Telegram webhook secret mismatch')
        res.status(403).json({ error: 'Forbidden' })
        return
    }

    res.json({ ok: true }) // Acknowledge immediately — Telegram needs <1s

    await handleUpdate(req.body as TelegramUpdate)
})

// ── GET /api/channels/telegram/info ─────────────────────────────────────────

telegramRouter.get('/info', (_req, res) => {
    res.json({
        configured: !!_botToken,
        webhookSecret: !!_webhookSecret,
        registeredChats: CHAT_TO_WORKSPACE.size,
        mode: process.env.PUBLIC_URL && !process.env.PUBLIC_URL.includes('localhost')
            ? 'webhook'
            : 'polling',
    })
})

// ── Long polling (local dev) ─────────────────────────────────────────────────

let _pollingActive = false

async function startLongPolling(token: string): Promise<void> {
    if (_pollingActive) return
    _pollingActive = true

    // Clear any existing webhook so polling works
    await deleteWebhook()
    logger.info('Telegram long polling started (local dev mode)')

    let offset = 0

    while (_pollingActive) {
        try {
            const res = await fetch(
                `${API_BASE}${token}/getUpdates?timeout=25&offset=${offset}`,
                { signal: AbortSignal.timeout(30_000) }
            )
            if (!res.ok) {
                await new Promise(r => setTimeout(r, 5000))
                continue
            }
            const data = await res.json() as { ok: boolean; result: TelegramUpdate[] }
            if (!data.ok) {
                await new Promise(r => setTimeout(r, 5000))
                continue
            }
            for (const update of data.result) {
                offset = update.update_id + 1
                handleUpdate(update).catch(err => logger.warn({ err }, 'Telegram update handler failed'))
            }
        } catch (err: unknown) {
            if ((err as Error)?.name !== 'TimeoutError') {
                logger.warn({ err }, 'Telegram polling error')
                await new Promise(r => setTimeout(r, 5000))
            }
        }
    }
}

export function stopTelegramPolling(): void {
    _pollingActive = false
}

// ── Init ─────────────────────────────────────────────────────────────────────

export async function initTelegramWebhook(): Promise<void> {
    // Prefer env var, fall back to first enabled channel in DB
    const envToken = process.env.TELEGRAM_BOT_TOKEN
    if (envToken) {
        _botToken = envToken
    } else {
        try {
            const [ch] = await db.select({ config: channels.config })
                .from(channels).where(eq(channels.type, 'telegram')).limit(1)
            const config = ch?.config as { token?: string; bot_token?: string } | null
            _botToken = config?.token ?? config?.bot_token ?? null
        } catch { /* non-fatal */ }
    }

    if (!_botToken) {
        logger.info('No Telegram bot token found — Telegram adapter disabled')
        return
    }

    _webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET ?? null

    const publicUrl = process.env.PUBLIC_URL
    if (publicUrl && !publicUrl.includes('localhost')) {
        // Production: register webhook
        const secret = _webhookSecret ?? 'plexo-telegram-prod'
        _webhookSecret = secret
        await setWebhook(`${publicUrl}/api/channels/telegram/webhook`, secret)
    } else {
        // Local dev: long polling
        startLongPolling(_botToken).catch(err => logger.error({ err }, 'Telegram polling crashed'))
    }
}
