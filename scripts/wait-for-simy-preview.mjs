/**
 * Wait for the Vercel "Preview – simy-app" deployment of a commit, then
 * write its URL to GITHUB_OUTPUT. Used by CI so Playwright hits the PR
 * build instead of production.
 */
import { appendFileSync } from 'node:fs'

const repo = process.env.GITHUB_REPOSITORY
const sha = process.env.E2E_PREVIEW_SHA
const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
const timeoutMs = Number(process.env.E2E_PREVIEW_TIMEOUT_MS || 8 * 60 * 1000)
const pollMs = 8000

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

function writeOutput(url) {
  const dest = process.env.GITHUB_OUTPUT
  if (dest) {
    appendFileSync(dest, `url=${url}\n`)
  }
  console.log(`Preview ready: ${url}`)
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
    })
  }

  const ready = states.find((row) => row.state === 'success' && row.url)
  if (ready) {
    writeOutput(ready.url)
    process.exit(0)
  }

  lastState = states.map((row) => `${row.id}:${row.state}`).join(', ') || 'none'
  if (states.some((row) => row.state === 'failure' || row.state === 'error')) {
    console.log(`A preview failed; waiting for a later deploy (${lastState})`)
  } else if (states.length > 0) {
    console.log(`Waiting: ${lastState}`)
  }

  await new Promise((resolve) => setTimeout(resolve, pollMs))
}

console.error(`Timed out waiting for simy-app preview (${lastState})`)
process.exit(1)
