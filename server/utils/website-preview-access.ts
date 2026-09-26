/**
 * Draft website access. The raw token is never stored and never logged.
 * Persistence is sha256(token) plus an expiry on website_tenants.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'

export const PREVIEW_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43,128}$/

export type WebsiteReadTarget = {
  id: string
  is_published: boolean
}

export type PublicWebsiteRead =
  | { ok: true; draft: boolean; privateCache: boolean }
  | { ok: false; privateCache: boolean }

type TokenRow = {
  preview_token_hash?: string | null
  preview_token_expires_at?: string | null
}

export function generatePreviewToken(): string {
  return randomBytes(32).toString('base64url')
}

export function hashPreviewToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export function readPreviewToken(query: Record<string, unknown> | null | undefined): string {
  const raw = query?.preview_token
  const value = Array.isArray(raw) ? raw[0] : raw
  const token = String(value || '').trim()
  if (!TOKEN_PATTERN.test(token)) return ''
  return token
}

export function previewQueryRequestsPrivateCache(query: Record<string, unknown> | null | undefined): boolean {
  if (readPreviewToken(query)) return true
  const legacy = query?.preview
  const flag = Array.isArray(legacy) ? legacy[0] : legacy
  return String(flag || '') === '1'
}

export function previewTokensMatch(storedHash: string | null | undefined, token: string): boolean {
  if (!storedHash || !token) return false
  const computed = hashPreviewToken(token)
  const a = Buffer.from(String(storedHash).trim(), 'hex')
  const b = Buffer.from(computed, 'hex')
  if (a.length === 0 || a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function previewTokenExpired(expiresAt: string | null | undefined, now = Date.now()): boolean {
  if (!expiresAt) return true
  const ms = new Date(expiresAt).getTime()
  if (Number.isNaN(ms)) return true
  return ms <= now
}

export async function issueWebsitePreviewToken(
  supabase: any,
  websiteId: string,
  now = Date.now(),
): Promise<{ token: string; expiresAt: string } | null> {
  const token = generatePreviewToken()
  const expiresAt = new Date(now + PREVIEW_TOKEN_TTL_MS).toISOString()
  const table = supabase.from('website_tenants')
  if (!table.update) return null
  const { error } = await table.update({
    preview_token_hash: hashPreviewToken(token),
    preview_token_expires_at: expiresAt,
  }).eq('id', websiteId)
  if (error) return null
  return { token, expiresAt }
}

async function loadPreviewTokenRow(supabase: any, websiteId: string): Promise<TokenRow | null> {
  const { data, error } = await supabase
    .from('website_tenants')
    .select('preview_token_hash, preview_token_expires_at')
    .eq('id', websiteId)
    .maybeSingle()
  if (error || !data) return null
  return data
}

/**
 * Published sites stay public.
 * Unpublished sites require a matching, unexpired token for that website id.
 * `?preview=1` alone is never enough.
 */
export async function authorizePublicWebsiteRead(
  supabase: any,
  website: WebsiteReadTarget,
  query: Record<string, unknown> | null | undefined,
  pagePublished = true,
  now = Date.now(),
): Promise<PublicWebsiteRead> {
  const token = readPreviewToken(query)
  const privateCache = previewQueryRequestsPrivateCache(query)
  const draftRequested = !website.is_published || !pagePublished

  if (!draftRequested) {
    return { ok: true, draft: false, privateCache }
  }

  if (!token) {
    return { ok: false, privateCache: true }
  }

  const row = await loadPreviewTokenRow(supabase, website.id)
  if (!row || previewTokenExpired(row.preview_token_expires_at, now) || !previewTokensMatch(row.preview_token_hash, token)) {
    return { ok: false, privateCache: true }
  }

  return { ok: true, draft: true, privateCache: true }
}

export function previewUrlForPath(baseUrl: string, path: string, token: string): string {
  const base = baseUrl.replace(/\/$/, '')
  const url = new URL(path.startsWith('/') ? path : `/${path}`, `${base}/`)
  url.searchParams.set('preview_token', token)
  return url.toString()
}
