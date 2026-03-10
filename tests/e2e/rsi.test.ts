import { test, expect } from '@playwright/test'

const SKIP_BROWSER = process.env.E2E_SKIP_BROWSER === 'true'

test.describe('RSI Accountability Dashboard (Phase 13)', () => {
    test.skip(SKIP_BROWSER, 'Set E2E_SKIP_BROWSER=false to enable')

    test('Accountability tab loads and displays RSI Proposals panel, simulating an admin approve action', async ({ page }) => {
        
        // Mock the proposals endpoint to return a fake cost_spike proposal
        await page.route('**/api/v1/workspaces/*/rsi/proposals', async route => {
            const json = { items: [{
                id: 'test-proposal-1',
                anomalyType: 'cost_spikes',
                hypothesis: 'Test mock: cost_spike detected.',
                proposedChange: { action: 'test_cap' },
                risk: 'high',
                status: 'pending',
                createdAt: new Date().toISOString()
            }]}
            await route.fulfill({ json })
        })

        // Mock the approve endpoint
        await page.route('**/api/v1/workspaces/*/rsi/proposals/test-proposal-1/approve', async route => {
            const json = [{
                id: 'test-proposal-1',
                anomalyType: 'cost_spikes',
                hypothesis: 'Test mock: cost_spike detected.',
                proposedChange: { action: 'test_cap' },
                risk: 'high',
                status: 'approved',
                createdAt: new Date().toISOString()
            }]
            await route.fulfill({ json })
        })

        // Go to settings
        await page.goto('/settings')
        
        // Find and click the Accountability tab/section
        const accountabilityTab = page.getByRole('button', { name: /Accountability/ })
        await accountabilityTab.waitFor({ state: 'visible' })
        await accountabilityTab.click()
        
        // Verify panel mounts
        await expect(page.getByRole('heading', { name: 'Accountability (RSI)' })).toBeVisible()
        
        // We mocked a proposal, so we should see it
        await expect(page.locator('text=Test mock: cost_spike detected.')).toBeVisible()
        
        // Click Approve (Run Shadow Mode)
        const approveBtn = page.getByRole('button', { name: /Run Shadow Mode/ })
        await expect(approveBtn).toBeVisible()
        await approveBtn.click()

        // Give it a moment to process the fake network request and update state
        await expect(page.locator('text=approved').first()).toBeVisible()
    })
})
