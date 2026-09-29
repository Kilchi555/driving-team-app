import { defineConfig, devices } from '@playwright/test'
import { emitSimyTestEnvWarnings, loadSimyTestEnv } from './scripts/load-simy-test-env.mjs'

const simyTestEnv = loadSimyTestEnv({ profile: 'e2e' })
emitSimyTestEnvWarnings(simyTestEnv)
if (simyTestEnv.fatal) {
  throw new Error(simyTestEnv.warnings.join('\n') || 'simy-test env was rejected')
}

const baseURL = process.env.E2E_BASE_URL || 'https://app.simy.ch'
const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET

export default defineConfig({
  testDir: 'e2e',
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
