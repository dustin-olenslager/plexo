// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Joeybuilt LLC

import { chromium, Browser, BrowserContext, Page } from 'playwright'
import { createSimulationSession, SimulationSession } from './session.js'

export interface RunnerOptions {
    personaId: string
    headless?: boolean
    viewport?: { width: number; height: number }
    baseURL?: string
    userAgent?: string
}

export interface PersonaHandle {
    browser: Browser
    context: BrowserContext
    page: Page
    session: SimulationSession
    cleanup: () => Promise<void>
}

export async function launchPersona(opts: RunnerOptions): Promise<PersonaHandle> {
    const sessionId = crypto.randomUUID()
    const session = createSimulationSession(opts.personaId, sessionId)

    const browser = await chromium.launch({
        headless: opts.headless ?? true,
    })

    const context = await browser.newContext({
        viewport: opts.viewport ?? { width: 1280, height: 720 },
        baseURL: opts.baseURL ?? process.env.PUBLIC_URL ?? 'http://localhost:3000',
        userAgent: opts.userAgent,
        extraHTTPHeaders: {
            'x-persona-id': opts.personaId,
            'x-session-id': sessionId,
        }
    })

    const page = await context.newPage()

    return {
        browser,
        context,
        page,
        session,
        cleanup: async () => {
            await browser.close()
        }
    }
}
