import { defineConfig, devices } from '@playwright/test'
import { emitSimyTestEnvWarnings, loadSimyTestEnv } from './scripts/load-simy-test-env.mjs'
import { playwrightTestIgnoreForFlexibleSession } from './utils/e2e-flexible-session-safety'

const simyTestEnv = loadSimyTestEnv({ profile: 'e2e' })
emitSimyTestEnvWarnings(simyTestEnv)
if (simyTestEnv.fatal) {
  throw new Error(simyTestEnv.warnings.join('\n') || 'simy-test env was rejected')
}

const baseURL = process.env.E2E_BASE_URL || 'https://app.simy.ch'
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET
const productionFlexIgnore = playwrightTestIgnoreForFlexibleSession(process.env)

export default defineConfig({
  testDir: 'e2e',
  // Production flexible-session UI E2E is opt-in via SIMY_E2E_PRODUCTION_FLEX=1
  // (dedicated workflow only). General `npm run test:e2e` / CI must not discover it.
  testIgnore: productionFlexIgnore,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    extraHTTPHeaders: bypass
      ? {
          'x-vercel-protection-bypass': bypass,
          'x-vercel-set-bypass-cookie': 'true',
        }
      : undefined,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
