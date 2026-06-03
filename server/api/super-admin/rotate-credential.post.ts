import { defineEventHandler, createError, readBody } from 'h3'
import { getAuthenticatedUser } from '~/server/utils/auth'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { loadRotationLog, saveRotationLog } from './credential-status.get'

const VERCEL_PROJECT_ID = 'prj_DhkLC3tYRjc3zE7CZS_oLFqhESWhK'
const GITHUB_REPO = 'Kilchi555/driving-team-app'

// ── Vercel ──────────────────────────────────────────────────────────────────

async function listVercelEnvs(token: string) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Vercel API ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.envs as Array<{ id: string; key: string; target: string[] }>
}

async function updateVercelEnv(token: string, envId: string, value: string) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env/${envId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  })
  if (!res.ok) throw new Error(`Vercel PATCH ${res.status}: ${await res.text()}`)
}

async function createVercelEnv(token: string, key: string, value: string) {
  const res = await fetch(`https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/env`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value, type: 'encrypted', target: ['production', 'preview'] }),
  })
  if (!res.ok) throw new Error(`Vercel POST ${res.status}: ${await res.text()}`)
}

async function rotateInVercel(token: string, key: string, value: string) {
  const envs = await listVercelEnvs(token)
  const existing = envs.find(e => e.key === key)
  if (existing) {
    await updateVercelEnv(token, existing.id, value)
    return 'updated'
  } else {
    await createVercelEnv(token, key, value)
    return 'created'
  }
}

// ── GitHub Secrets ───────────────────────────────────────────────────────────

async function rotateGithubSecret(token: string, secretName: string, value: string) {
  const keyRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/secrets/public-key`, {
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json' },
  })
  if (!keyRes.ok) throw new Error(`GitHub key ${keyRes.status}`)
  const { key_id, key: pubKeyB64 } = await keyRes.json()

  // Encrypt with libsodium (tweetnacl compatible via Web Crypto isn't available server-side,
  // so we use the Node.js compatible approach via dynamic import of tweetnacl-sealed-box)
  // Instead, we call the GitHub API directly using pre-encrypted value via the shell approach
  // We use a fetch-based implementation with Node's built-in crypto via Buffer
  const { execSync } = await import('child_process')
  const encrypted = execSync(
    `python3 -c "
import base64, nacl.public
pub = nacl.public.PublicKey(base64.b64decode('${pubKeyB64}'))
box = nacl.public.SealedBox(pub)
print(base64.b64encode(box.encrypt(b'''${value.replace(/'/g, "\\'")}''')).decode())
"`,
    { encoding: 'utf8' },
  ).trim()

  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/actions/secrets/${secretName}`, {
    method: 'PUT',
    headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ encrypted_value: encrypted, key_id }),
  })
  if (!res.ok && res.status !== 204) throw new Error(`GitHub secret ${res.status}: ${await res.text()}`)
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  const authUser = await getAuthenticatedUser(event)
  if (!authUser) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = getSupabaseAdmin()
  const { data: caller } = await supabase.from('users').select('role').eq('auth_user_id', authUser.id).single()
  if (caller?.role !== 'super_admin') throw createError({ statusCode: 403, message: 'Super admin only' })

  const body = await readBody(event)
  const { credentialKey, value, targets } = body as {
    credentialKey: string
    value: string
    targets: Array<'vercel' | 'github'>
  }

  if (!credentialKey || !value || !targets?.length) {
    throw createError({ statusCode: 400, message: 'credentialKey, value und targets sind erforderlich' })
  }

  const results: Record<string, string> = {}

  if (targets.includes('vercel')) {
    const vercelToken = process.env.VERCEL_API_TOKEN
    if (!vercelToken) throw createError({ statusCode: 500, message: 'VERCEL_API_TOKEN nicht konfiguriert' })
    results.vercel = await rotateInVercel(vercelToken, credentialKey, value)
  }

  if (targets.includes('github')) {
    const githubToken = process.env.GH_API_TOKEN || process.env.SIMY_GITHUB_PAT
    if (!githubToken) throw createError({ statusCode: 500, message: 'GH_API_TOKEN nicht konfiguriert' })
    await rotateGithubSecret(githubToken, credentialKey, value)
    results.github = 'updated'
  }

  // Rotation-Log speichern
  const log = await loadRotationLog()
  log[credentialKey] = new Date().toISOString()
  await saveRotationLog(log)

  return { success: true, results, rotatedAt: log[credentialKey] }
})
