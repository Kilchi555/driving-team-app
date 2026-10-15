import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PRODUCTION_FALLBACK_URL } from '../../../scripts/vercel-should-build.mjs'
import {
  assertMergeGroupPreviewUrl,
  classifyPreviewUrl,
  resolveE2EBaseURL,
  runPreviewWait,
} from '../../../scripts/wait-for-simy-preview.mjs'

const QUEUE_SHA = 'mergegroupsha111'
const OTHER_SHA = 'othersha222'
const PREVIEW_URL = 'https://simy-app-git-queue.vercel.app'

function clock() {
  let t = 0
  return {
    now: () => t,
    sleep: async (ms: number) => {
      t += ms
    },
  }
}

async function run(options: Record<string, unknown>) {
  const writes: Array<{ url: string, skipped: boolean }> = []
  const time = clock()
  const result = await runPreviewWait({
    sha: QUEUE_SHA,
    repo: 'Kilchi555/driving-team-app',
    timeoutMs: 25,
    pollMs: 10,
    now: time.now,
    sleep: time.sleep,
    writeOutput: (url: string, skipped = false) => {
      writes.push({ url, skipped })
    },
    gh: async () => [],
    ...options,
  })
  return { result, writes }
}

function deploymentGh(target: {
  sha?: string
  environment?: string
  state?: string
  url?: string
  description?: string
}) {
  return async (path: string) => {
    if (path.includes('/statuses')) {
      return [{
        state: target.state || 'success',
        target_url: target.url,
        description: target.description || '',
      }]
    }
    if (!path.includes(`sha=${encodeURIComponent(target.sha || QUEUE_SHA)}`)) return []
    return [{ id: 7, environment: target.environment || 'Preview – simy-app' }]
  }
}

describe('merge-group preview URL classification', () => {
  it('accepts a non-production https host', () => {
    expect(classifyPreviewUrl(PREVIEW_URL)).toMatchObject({ ok: true, reason: 'non-production' })
  })

  it('rejects an empty URL', () => {
    expect(classifyPreviewUrl('')).toMatchObject({ ok: false, reason: 'missing-url' })
    expect(classifyPreviewUrl('   ')).toMatchObject({ ok: false, reason: 'missing-url' })
    expect(() => assertMergeGroupPreviewUrl('')).toThrow(/missing-url/)
  })

  it('rejects the production host without a slash, with a slash, a path, a query, or a port', () => {
    for (const value of [
      'https://app.simy.ch',
      'https://APP.SIMY.CH/',
      'https://app.simy.ch/login',
      'https://app.simy.ch/login?next=1',
      'https://app.simy.ch:443/admin',
    ]) {
      expect(classifyPreviewUrl(value).reason).toBe('production-host')
      expect(() => assertMergeGroupPreviewUrl(value)).toThrow(/production-host/)
    }
  })

  it('rejects a malformed URL', () => {
    expect(classifyPreviewUrl('not a url').reason).toBe('malformed-url')
    expect(classifyPreviewUrl('http://preview.example.com').reason).toBe('malformed-url')
  })

  it('does not let playwright default to production for merge_group', () => {
    expect(() => resolveE2EBaseURL({ eventName: 'merge_group', configured: '' })).toThrow(/missing-url/)
    expect(resolveE2EBaseURL({ eventName: 'merge_group', configured: PREVIEW_URL })).toBe(PREVIEW_URL)
    expect(resolveE2EBaseURL({ eventName: 'pull_request', configured: '' })).toBe(PRODUCTION_FALLBACK_URL)
    expect(resolveE2EBaseURL({ eventName: '', configured: '' })).toBe(PRODUCTION_FALLBACK_URL)
  })
})

describe('preview waiter', () => {
  it('uses a successful preview for the exact merge-group SHA', async () => {
    const { result, writes } = await run({
      mode: 'merge_group',
      gh: deploymentGh({ url: PREVIEW_URL }),
    })
    expect(result).toMatchObject({ exitCode: 0, wrote: PREVIEW_URL, reason: 'ready' })
    expect(writes).toEqual([{ url: PREVIEW_URL, skipped: false }])
  })

  it('fails closed when the successful deployment has no URL', async () => {
    const { result, writes } = await run({
      mode: 'merge_group',
      gh: deploymentGh({ url: '' }),
    })
    expect(result).toMatchObject({ exitCode: 1, wrote: null, reason: 'missing-url' })
    expect(writes).toEqual([])
  })

  it('fails closed when the preview build is skipped', async () => {
    const { result, writes } = await run({ mode: 'merge_group', skip: true })
    expect(result).toMatchObject({ exitCode: 1, wrote: null, reason: 'skipped-build' })
    expect(writes).toEqual([])
  })

  it('keeps the pull-request production fallback when the build is skipped', async () => {
    const { result, writes } = await run({ mode: 'pull_request', skip: true })
    expect(result.exitCode).toBe(0)
    expect(result.wrote).toBe(PRODUCTION_FALLBACK_URL)
    expect(writes).toEqual([{ url: PRODUCTION_FALLBACK_URL, skipped: true }])
  })

  it('fails closed on a canceled merge-group deployment and still falls back for a pull request', async () => {
    const canceled = deploymentGh({ state: 'inactive', url: '', description: 'Canceled' })
    const closed = await run({ mode: 'merge_group', gh: canceled })
    expect(closed.result).toMatchObject({ exitCode: 1, wrote: null, reason: 'canceled' })
    expect(closed.writes).toEqual([])

    const open = await run({ mode: 'pull_request', gh: canceled })
    expect(open.result.wrote).toBe(PRODUCTION_FALLBACK_URL)
    expect(open.writes[0]?.skipped).toBe(true)
  })

  it('fails closed on a failed merge-group deployment', async () => {
    const { result, writes } = await run({
      mode: 'merge_group',
      gh: deploymentGh({ state: 'failure', url: PREVIEW_URL }),
    })
    expect(result).toMatchObject({ exitCode: 1, wrote: null, reason: 'failed' })
    expect(writes).toEqual([])
  })

  it('times out without writing a production URL', async () => {
    const { result, writes } = await run({ mode: 'merge_group', gh: async () => [] })
    expect(result).toMatchObject({ exitCode: 1, wrote: null, reason: 'timeout' })
    expect(writes).toEqual([])
  })

  it('does not accept a deployment for a different SHA', async () => {
    const paths: string[] = []
    const { result, writes } = await run({
      mode: 'merge_group',
      sha: QUEUE_SHA,
      gh: async (path: string) => {
        paths.push(path)
        if (path.includes(`sha=${encodeURIComponent(OTHER_SHA)}`)) {
          return [{ id: 9, environment: 'Preview – simy-app' }]
        }
        return []
      },
    })
    expect(result.reason).toBe('timeout')
    expect(writes).toEqual([])
    expect(paths.some((path) => path.includes(`sha=${encodeURIComponent(QUEUE_SHA)}`))).toBe(true)
    expect(paths.some((path) => path.includes(`sha=${encodeURIComponent(OTHER_SHA)}`))).toBe(false)
  })

  it('rejects a production URL returned for the merge-group SHA', async () => {
    const { result, writes } = await run({
      mode: 'merge_group',
      gh: deploymentGh({ url: 'https://app.simy.ch/login?next=1' }),
    })
    expect(result).toMatchObject({ exitCode: 1, wrote: null, reason: 'production-host' })
    expect(writes).toEqual([])
  })
})

describe('workflow wiring', () => {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8')
  const dependency = readFileSync('.github/workflows/dependency-review.yml', 'utf8')
  const playwright = readFileSync('playwright.config.ts', 'utf8')

  it('keeps the required check names and adds merge_group without a production fallback', () => {
    expect(ci).toContain('name: Test and lint')
    expect(ci).toContain('name: E2E login')
    expect(ci).toContain('merge_group:')
    expect(ci).toContain('github.event.merge_group.head_sha')
    expect(ci).toContain('github.event.merge_group.head_ref')
    expect(ci).toContain('contents: read')
    expect(ci).toContain('deployments: read')
    const playwrightAt = ci.indexOf('npm run test:e2e')
    const guardAt = ci.indexOf('merge_group preview rejected: missing-or-skipped')
    expect(guardAt).toBeGreaterThan(0)
    expect(guardAt).toBeLessThan(playwrightAt)
    expect(ci).toContain('assertMergeGroupPreviewUrl')
    expect(ci).not.toContain("github.event_name == 'merge_group' && steps.preview.outputs.url || 'https://app.simy.ch'")
  })

  it('keeps pull_request dependency review and adds merge_group', () => {
    expect(dependency).toContain('pull_request:')
    expect(dependency).toContain('merge_group:')
    expect(dependency).toContain('name: Dependency review')
    expect(dependency).toContain('contents: read')
    expect(dependency).toContain('fail-on-severity: high')
  })

  it('guards the Playwright default before a merge-group run can start', () => {
    expect(playwright).toContain('resolveE2EBaseURL')
    expect(playwright.indexOf('const baseURL = resolveE2EBaseURL')).toBeGreaterThan(0)
    expect(playwright.indexOf('const baseURL = resolveE2EBaseURL')).toBeLessThan(playwright.indexOf('export default defineConfig'))
  })
})
