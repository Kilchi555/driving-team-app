import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PRODUCTION_FALLBACK_URL } from '../../../scripts/vercel-should-build.mjs'
import {
  assertMergeGroupPreviewUrl,
  classifyPreviewUrl,
  resolveE2EBaseURL,
  runPreviewWait,
  selectMergeGroupPlaywrightUrl,
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

  it('rejects the production host for case, trailing dot, path, query, fragment, and port', () => {
    for (const value of [
      'https://app.simy.ch',
      'https://APP.SIMY.CH',
      'https://app.simy.ch.',
      'https://APP.SIMY.CH./',
      'https://app.simy.ch/login',
      'https://app.simy.ch/login?next=1',
      'https://app.simy.ch/login?next=1#section',
      'https://app.simy.ch.:443/admin?x=1#f',
      'https://app.simy.ch:8443/admin?x=1#f',
      'https://user:pass@app.simy.ch/login',
      'https://user:pass@APP.SIMY.CH./login?q=1#frag',
    ]) {
      expect(classifyPreviewUrl(value).reason).toBe('production-host')
      expect(() => assertMergeGroupPreviewUrl(value)).toThrow(/production-host/)
      expect(() => resolveE2EBaseURL({ eventName: 'merge_group', configured: value })).toThrow(/production-host/)
      expect(() => selectMergeGroupPlaywrightUrl(value)).toThrow(/production-host/)
    }
  })

  it('rejects a malformed URL, an empty URL, and a non-HTTPS URL', () => {
    expect(classifyPreviewUrl('')).toMatchObject({ ok: false, reason: 'missing-url' })
    expect(classifyPreviewUrl('not a url').reason).toBe('malformed-url')
    expect(classifyPreviewUrl('http://preview.example.com').reason).toBe('malformed-url')
    expect(classifyPreviewUrl('http://app.simy.ch').reason).toBe('malformed-url')
    expect(() => selectMergeGroupPlaywrightUrl('http://simy-app-git-queue.vercel.app')).toThrow(/malformed-url/)
  })

  it('passes the same validated preview URL through to Playwright', () => {
    const preview = 'https://user:pass@simy-app-git-queue.vercel.app/login?next=1#section'
    expect(classifyPreviewUrl(preview)).toMatchObject({ ok: true, reason: 'non-production' })
    expect(assertMergeGroupPreviewUrl(preview)).toBe(preview)
    expect(selectMergeGroupPlaywrightUrl(preview)).toBe(preview)
    expect(resolveE2EBaseURL({ eventName: 'merge_group', configured: preview })).toBe(preview)
    expect(selectMergeGroupPlaywrightUrl('https://app.simy.ch@simy-app-git-queue.vercel.app/path')).toBe(
      'https://app.simy.ch@simy-app-git-queue.vercel.app/path',
    )
  })

  it('does not let playwright default to production for merge_group', () => {
    expect(() => resolveE2EBaseURL({ eventName: 'merge_group', configured: '' })).toThrow(/missing-url/)
    expect(() => resolveE2EBaseURL({ eventName: 'merge_group', configured: 'https://app.simy.ch.' })).toThrow(/production-host/)
    expect(resolveE2EBaseURL({ eventName: 'merge_group', configured: PREVIEW_URL })).toBe(PREVIEW_URL)
    expect(resolveE2EBaseURL({ eventName: 'pull_request', configured: '' })).toBe(PRODUCTION_FALLBACK_URL)
    expect(resolveE2EBaseURL({ eventName: 'push', configured: '' })).toBe(PRODUCTION_FALLBACK_URL)
    expect(resolveE2EBaseURL({ eventName: '', configured: '' })).toBe(PRODUCTION_FALLBACK_URL)
  })

  it('fails closed when a merge-group preview is skipped, without returning the production URL', () => {
    expect(() => selectMergeGroupPlaywrightUrl(PREVIEW_URL, { skipped: true })).toThrow(/missing-or-skipped/)
    expect(() => selectMergeGroupPlaywrightUrl('', { skipped: true })).toThrow(/missing-or-skipped/)
    expect(() => selectMergeGroupPlaywrightUrl(PRODUCTION_FALLBACK_URL, { skipped: true })).toThrow(/missing-or-skipped/)
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

  it('does not write a trailing-dot production URL for merge_group', async () => {
    const productionDot = 'https://user:pass@app.simy.ch./login?next=1#section'
    const { result, writes } = await run({
      mode: 'merge_group',
      gh: deploymentGh({ url: productionDot }),
    })
    expect(result).toMatchObject({ exitCode: 1, wrote: null, reason: 'production-host' })
    expect(writes).toEqual([])
    expect(writes.some((row) => row.url === PRODUCTION_FALLBACK_URL)).toBe(false)
  })

  it('writes the exact preview URL and not a rewritten host', async () => {
    const preview = 'https://simy-app-git-queue.vercel.app/login?next=1#section'
    const { result, writes } = await run({
      mode: 'merge_group',
      gh: deploymentGh({ url: preview }),
    })
    expect(result).toMatchObject({ exitCode: 0, wrote: preview, reason: 'ready' })
    expect(writes).toEqual([{ url: preview, skipped: false }])
    expect(selectMergeGroupPlaywrightUrl(preview)).toBe(preview)
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
    expect(ci).toContain('selectMergeGroupPlaywrightUrl')
    expect(ci).toContain('assertMergeGroupPreviewUrl')
    expect(ci.indexOf('selectMergeGroupPlaywrightUrl')).toBeLessThan(playwrightAt)
    expect(ci.indexOf('assertMergeGroupPreviewUrl(process.env.E2E_BASE_URL)')).toBeLessThan(playwrightAt)
    expect(ci).toContain('export E2E_BASE_URL="${PREVIEW_URL:-https://app.simy.ch}"')
    expect(ci).toContain('export E2E_BASE_URL="https://app.simy.ch"')
    expect(ci).not.toContain('export E2E_BASE_URL="$PREVIEW_URL"')
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
