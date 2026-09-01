/**
 * Wait for the Vercel "Preview – simy-app" deployment of a commit, then
 * write its URL to GITHUB_OUTPUT. Used by CI so Playwright hits the PR
 * build instead of production.
 *
 * Docs-only / Dependabot / ignored-build commits never get a simy-app
 * preview. In that case we fall back to https://app.simy.ch so E2E does
 * not sit on an 8-minute timeout.
 */
import { appendFileSync } from 'node:fs'
import {
  PRODUCTION_FALLBACK_URL,
  decide,
} from './vercel-should-build.mjs'

const repo = process.env.GITHUB_REPOSITORY
const sha = process.env.E2E_PREVIEW_SHA
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const timeoutMs = Number(process.env.E2E_PREVIEW_TIMEOUT_MS || 8 * 60 * 1000)
const pollMs = 8000
const COMMIT_FILE_CAP = 300

if (!repo || !sha || !token) {
  console.error('Need GITHUB_REPOSITORY, E2E_PREVIEW_SHA, and GITHUB_TOKEN')
  process.exit(1)
}

function isSimyAppPreview(environment) {
  return /preview/i.test(environment || '') && /simy-app/i.test(environment || '')
}

async function gh(path) {
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

function writeOutput(url, skipped = false) {
  const dest = process.env.GITHUB_OUTPUT
  if (dest) {
    appendFileSync(dest, `url=${url}\n`)
    appendFileSync(dest, `skipped=${skipped ? 'true' : 'false'}\n`)
  }
  console.log(skipped ? `Preview skipped, using ${url}` : `Preview ready: ${url}`)
}

async function listChangedFiles() {
  // Same window Vercel uses (HEAD^ HEAD): only this commit, not the whole PR.
  try {
    const commit = await gh(`/repos/${repo}/commits/${sha}`)
    const files = (commit.files || []).map((file) => file.filename).filter(Boolean)
    if (files.length >= COMMIT_FILE_CAP) return null
    return files
  } catch (error) {
    console.log(`Could not list files for ${sha.slice(0, 7)}: ${error.message}`)
    return null
  }
}

async function previewWouldBeSkipped() {
  const changedFiles = await listChangedFiles()
  const result = decide({
    project: 'app',
    vercelEnv: 'preview',
    branch: process.env.E2E_PREVIEW_REF || '',
    commitMessage: process.env.E2E_PREVIEW_MESSAGE || '',
    authorLogin: process.env.E2E_PREVIEW_AUTHOR || '',
    productionUrl: PRODUCTION_FALLBACK_URL,
    changedFiles,
  })
  if (result.skip) {
    console.log(`[vercel-should-build] skip: ${result.reason}`)
  }
  return result.skip
}

async function main() {
  if (await previewWouldBeSkipped()) {
    writeOutput(PRODUCTION_FALLBACK_URL, true)
    process.exit(0)
  }

  const deadline = Date.now() + timeoutMs
  let lastState = 'none'

  while (Date.now() < deadline) {
    const deployments = await gh(`/repos/${repo}/deployments?sha=${sha}&per_page=20`)
    const candidates = deployments.filter((d) => isSimyAppPreview(d.environment))

    if (candidates.length === 0) {
      console.log(`No simy-app preview deployment yet for ${sha.slice(0, 7)}`)
    }

    const states = []
    for (const deployment of candidates) {
      const statuses = await gh(
        `/repos/${repo}/deployments/${deployment.id}/statuses`
      )
      const latest = statuses[0]
      if (!latest) continue
      states.push({
        id: deployment.id,
        state: latest.state,
        url: latest.target_url,
        description: latest.description || '',
      })
    }

    const ready = states.find((row) => row.state === 'success' && row.url)
    if (ready) {
      writeOutput(ready.url)
      process.exit(0)
    }

    lastState = states.map((row) => `${row.id}:${row.state}`).join(', ') || 'none'
    const pending = states.some((row) =>
      row.state === 'in_progress' || row.state === 'pending' || row.state === 'queued'
    )
    const canceled = states.filter((row) =>
      row.state === 'inactive'
      || /cancel/i.test(row.description || '')
    )
    if (canceled.length > 0 && !pending && !ready) {
      console.log(`simy-app preview canceled (${lastState}); falling back to production`)
      writeOutput(PRODUCTION_FALLBACK_URL, true)
      process.exit(0)
    }
    if (states.some((row) => row.state === 'failure' || row.state === 'error')) {
      console.log(`A preview failed; waiting for a later deploy (${lastState})`)
    } else if (states.length > 0) {
      console.log(`Waiting: ${lastState}`)
    }

    await new Promise((resolve) => setTimeout(resolve, pollMs))
  }

  console.error(`Timed out waiting for simy-app preview (${lastState})`)
  process.exit(1)
}

await main()
