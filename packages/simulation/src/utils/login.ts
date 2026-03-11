import { Page } from 'playwright'
import { SimulationSession } from '../session.js'

export async function loginIfNeeded(page: Page, session: SimulationSession) {
    const email = process.env.SIMULATION_EMAIL || 'test@example.com'
    const password = process.env.SIMULATION_PASSWORD || 'password123456'

    // If we are on the login page or been redirected there
    if (page.url().includes('/login')) {
        await session.logEvent('simulation_logging_in', { email })
        
        await page.waitForSelector('#login-email', { timeout: 15000 })
        await page.fill('#login-email', email)
        await page.fill('#login-password', password)
        
        await page.click('button[type="submit"]')
        
        // Wait for the login page to go away
        await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 20000 })
        
        // If we are redirected to setup, it means the seeding didn't work as expected or workspace list failed
        if (page.url().includes('/setup')) {
            await session.logEvent('simulation_hit_setup_unexpectedly', { url: page.url() })
            // Attempt to skip setup if possible, or just log and continue
        }

        // Ensure we are not stuck on the login page anymore
        await page.waitForTimeout(2000)
        await session.logEvent('simulation_logged_in', { email, finalUrl: page.url() })
    }
}
