/**
 * Wait for the Vercel "Preview – simy-app" deployment of a commit, then
 * write its URL to GITHUB_OUTPUT. Used by CI so Playwright hits the PR
 * build instead of production.
 *
 * Docs-only / Dependabot / ignored-build commits never get a simy-app
 * preview. In pull_request mode we fall back to https://app.simy.ch so
 * E2E does not sit on an 8-minute timeout.
 *
 * merge_group mode is fail-closed. A missing, skipped, canceled, failed,
 * timed-out, malformed, or production URL exits non-zero and does not
 * write PRODUCTION_FALLBACK_URL. The production hostname is compared after
 * URL parsing, case-folding, and stripping trailing DNS dots. Rejecting
 * that host does not prove the selected preview uses an isolated database.
 */
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import {
  PRODUCTION_FALLBACK_URL,
  decide,
} from './vercel-should-build.mjs'

const COMMIT_FILE_CAP = 300
const PRODUCTION_HOST = 'app.simy.ch'

export function isSimyAppPreview(environment) {
  return /preview/i.test(environment || '') && /simy-app/i.test(environment || '')
}

function normalizedHostname(hostname) {
  return String(hostname || '').toLowerCase().replace(/\.+$/u, '')
}

export function classifyPreviewUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return { ok: false, reason: 'missing-url', host: '' }
  }
  let url
  try {
    url = new URL(value)
  } catch {
    return { ok: false, reason: 'malformed-url', host: '' }
  }
  if (url.protocol !== 'https:') {
    return { ok: false, reason: 'malformed-url', host: normalizedHostname(url.hostname) }
  }
  const host = normalizedHostname(url.hostname)
  if (host === '') {
    return { ok: false, reason: 'malformed-url', host: '' }
  }
  if (host === PRODUCTION_HOST) {
    return { ok: false, reason: 'production-host', host }
  }
  return { ok: true, reason: 'non-production', host }
}

export function assertMergeGroupPreviewUrl(value) {
  const verdict = classifyPreviewUrl(value)
  if (!verdict.ok) {
    const error = new Error(`merge_group preview rejected: ${verdict.reason}`)
    error.reason = verdict.reason
    throw error
  }
  return value
}

export function selectMergeGroupPlaywrightUrl(previewUrl, { skipped = false } = {}) {
  if (skipped) {
    const error = new Error('merge_group preview rejected: missing-or-skipped')
    error.reason = 'missing-or-skipped'
    throw error
  }
  return assertMergeGroupPreviewUrl(previewUrl)
}

export function resolveE2EBaseURL({ eventName = '', configured = '' } = {}) {
  if (eventName === 'merge_group') {
    return assertMergeGroupPreviewUrl(configured)
  }
  return configured || PRODUCTION_FALLBACK_URL
}

export function logPreviewDecision({ mode, sha, reason, host = '', environment = '' }) {
  console.log(
    `preview-wait mode=${mode} sha=${sha} environment=${environment || '-'} host=${host || '-'} reason=${reason}`,
  )
}

export function decidePreviewAction(states, { failClosed }) {
  const list = states || []
  const pending = list.some((row) =>
    row.state === 'in_progress' || row.state === 'pending' || row.state === 'queued'
  )
  const ready = list.find((row) => row.state === 'success' && row.url)
  if (ready) {
    if (failClosed) {
      const verdict = classifyPreviewUrl(ready.url)
      if (!verdict.ok) {
        return { action: 'fail', reason: verdict.reason, host: verdict.host, environment: ready.environment || '' }
      }
      return {
        action: 'use',
        url: ready.url,
        host: verdict.host,
        environment: ready.environment || '',
        reason: 'ready',
      }
    }
    return { action: 'use', url: ready.url, host: '', environment: ready.environment || '', reason: 'ready' }
  }

  if (failClosed && !pending && list.some((row) => row.state === 'success' && !row.url)) {
    return { action: 'fail', reason: 'missing-url', host: '', environment: '' }
  }

  const canceled = list.filter((row) =>
    row.state === 'inactive' || /cancel/i.test(row.description || '')
  )
  if (canceled.length > 0 && !pending) {
    if (failClosed) return { action: 'fail', reason: 'canceled', host: '', environment: '' }
    return { action: 'fallback', url: PRODUCTION_FALLBACK_URL, reason: 'canceled', host: PRODUCTION_HOST, environment: '' }
  }

  const failed = (states || []).some((row) => row.state === 'failure' || row.state === 'error')
  if (failClosed && failed && !pending) {
    return { action: 'fail', reason: 'failed', host: '', environment: '' }
  }
  return { action: 'wait', reason: failed ? 'failed-waiting' : 'pending', host: '', environment: '' }
}

export async function runPreviewWait({
  mode = 'pull_request',
  sha,
  repo,
  gh,
  skip = false,
  timeoutMs = 8 * 60 * 1000,
  pollMs = 8000,
  now = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  writeOutput = () => {},
}) {
  const failClosed = mode === 'merge_group'
  if (skip) {
    logPreviewDecision({ mode, sha, reason: 'skipped-build' })
    if (failClosed) return { exitCode: 1, wrote: null, reason: 'skipped-build' }
    writeOutput(PRODUCTION_FALLBACK_URL, true)
    return { exitCode: 0, wrote: PRODUCTION_FALLBACK_URL, reason: 'fallback' }
  }

  const deadline = now() + timeoutMs
  let lastState = 'none'

  while (now() < deadline) {
    const deployments = await gh(`/repos/${repo}/deployments?sha=${encodeURIComponent(sha)}&per_page=20`)
    const candidates = (Array.isArray(deployments) ? deployments : []).filter((item) =>
      isSimyAppPreview(item.environment)
    )
    if (candidates.length === 0) {
      console.log(`No simy-app preview deployment yet for ${String(sha).slice(0, 7)}`)
    }

    const states = []
    for (const deployment of candidates) {
      const statuses = await gh(`/repos/${repo}/deployments/${deployment.id}/statuses`)
      const latest = Array.isArray(statuses) ? statuses[0] : null
      if (!latest) continue
      states.push({
        id: deployment.id,
        state: latest.state,
        url: latest.target_url,
        description: latest.description || '',
        environment: deployment.environment || '',
      })
    }

    const decision = decidePreviewAction(states, { failClosed })
    if (decision.action === 'use') {
      logPreviewDecision({
        mode,
        sha,
        reason: decision.reason,
        host: decision.host || safeHost(decision.url),
        environment: decision.environment,
      })
      writeOutput(decision.url, false)
      return { exitCode: 0, wrote: decision.url, reason: 'ready' }
    }
    if (decision.action === 'fallback') {
      logPreviewDecision({ mode, sha, reason: decision.reason, host: PRODUCTION_HOST })
      writeOutput(PRODUCTION_FALLBACK_URL, true)
      return { exitCode: 0, wrote: PRODUCTION_FALLBACK_URL, reason: 'fallback' }
    }
    if (decision.action === 'fail') {
      logPreviewDecision({
        mode,
        sha,
        reason: decision.reason,
        host: decision.host,
        environment: decision.environment,
      })
      return { exitCode: 1, wrote: null, reason: decision.reason }
    }

    lastState = states.map((row) => `${row.id}:${row.state}`).join(', ') || 'none'
    if (decision.reason === 'failed-waiting') {
      console.log(`A preview failed; waiting for a later deploy (${lastState})`)
    } else if (states.length > 0) {
      console.log(`Waiting: ${lastState}`)
    }
    await sleep(pollMs)
  }

  logPreviewDecision({ mode, sha, reason: 'timeout' })
  console.error(`Timed out waiting for simy-app preview (${lastState})`)
  return { exitCode: 1, wrote: null, reason: 'timeout' }
}

function safeHost(value) {
  try {
    return new URL(value).hostname
  } catch {
    return ''
  }
}

function writeGithubOutput(url, skipped = false) {
  const dest = process.env.GITHUB_OUTPUT
  if (dest) {
    appendFileSync(dest, `url=${url}\n`)
    appendFileSync(dest, `skipped=${skipped ? 'true' : 'false'}\n`)
  }
  console.log(skipped ? `Preview skipped, using host ${safeHost(url) || '-'}` : `Preview ready host ${safeHost(url) || '-'}`)
}

async function gh(token, path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub ${res.status} ${path}: ${text.slice(0, 200)}`)
  }
  return res.json()
}

async function previewWouldBeSkipped(token, repo, sha) {
  let head = { files: null, message: '' }
  try {
    const commit = await gh(token, `/repos/${repo}/commits/${sha}`)
    const files = (commit.files || []).map((file) => file.filename).filter(Boolean)
    head = {
      files: files.length >= COMMIT_FILE_CAP ? null : files,
      message: commit.commit?.message || '',
    }
  } catch (error) {
    console.log(`Could not load commit ${String(sha).slice(0, 7)}: ${error instanceof Error ? error.message : String(error)}`)
  }
  const result = decide({
    project: 'app',
    vercelEnv: 'preview',
    branch: process.env.E2E_PREVIEW_REF || '',
    commitMessage: head.message,
    authorLogin: process.env.E2E_PREVIEW_AUTHOR || '',
    productionUrl: PRODUCTION_FALLBACK_URL,
    changedFiles: head.files,
  })
  if (result.skip) console.log(`[vercel-should-build] skip: ${result.reason}`)
  return result.skip
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY
  const sha = process.env.E2E_PREVIEW_SHA
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  const mode = process.env.E2E_PREVIEW_MODE === 'merge_group' ? 'merge_group' : 'pull_request'
  if (!repo || !sha || !token) {
    console.error('Need GITHUB_REPOSITORY, E2E_PREVIEW_SHA, and GITHUB_TOKEN')
    return 1
  }
  const skip = await previewWouldBeSkipped(token, repo, sha)
  const result = await runPreviewWait({
    mode,
    sha,
    repo,
    skip,
    timeoutMs: Number(process.env.E2E_PREVIEW_TIMEOUT_MS || 8 * 60 * 1000),
    gh: (path) => gh(token, path),
    writeOutput: writeGithubOutput,
  })
  return result.exitCode
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .then((code) => {
      process.exit(code)
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : String(error))
      process.exit(1)
    })
}
