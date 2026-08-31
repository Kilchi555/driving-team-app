/**
 * Dry-run or apply gads-fix-probe-landing against production.
 * Loads CRON_SECRET from a local env file, never prints it.
 *
 *   node server/scripts/run-fix-probe-landing-via-prod.mjs /tmp/simy-app-prod.env
 *   node server/scripts/run-fix-probe-landing-via-prod.mjs /tmp/simy-app-prod.env --apply
 */

import fs from 'fs'

const BASE = 'https://app.simy.ch'
const envPath = process.argv[2]
const apply = process.argv.includes('--apply')
if (!envPath) {
  console.error('Usage: node run-fix-probe-landing-via-prod.mjs <envfile> [--apply]')
  process.exit(1)
}

function loadEnv(file) {
  const env = {}
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (!m) continue
    env[m[1]] = m[2].replace(/^"|"$/g, '').replace(/\\n/g, '').trim()
  }
  return env
}

const env = loadEnv(envPath)
const secret = env.CRON_SECRET
if (!secret) throw new Error('CRON_SECRET missing in env file')

const res = await fetch(`${BASE}/api/admin/gads-fix-probe-landing`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secret}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ dry_run: !apply }),
})
const text = await res.text()
let data
try { data = JSON.parse(text) } catch { data = { raw: text.slice(0, 800) } }
console.log(JSON.stringify({ http: res.status, ...data }, null, 2))
if (!res.ok || data.ok === false) process.exit(1)
