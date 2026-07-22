import type { H3Event } from 'h3'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase URL + Service Key für Nitro-Servercode.
 * Preferiert das neue sb_secret_-Format (SUPABASE_SECRET_KEY),
 * mit Fallback auf den Legacy-Service-Role-Key.
 * Werte kommen aus runtimeConfig (nuxt.config + NUXT_*-Overrides) mit Fallback auf process.env.
 */
export function getSupabaseServiceCredentials(event?: H3Event): {
  supabaseUrl: string | undefined
  supabaseServiceKey: string | undefined
} {
  let supabaseUrl: string | undefined
  let supabaseServiceKey: string | undefined

  if (event) {
    const cfg = useRuntimeConfig(event)
    const u = cfg.supabaseUrl as string | undefined
    // Prefer new-format secret key; fall back to legacy service_role JWT
    const secret = cfg.supabaseSecretKey as string | undefined
    const legacy = cfg.supabaseServiceRoleKey as string | undefined
    if (u)
      supabaseUrl = u
    if (secret || legacy)
      supabaseServiceKey = secret || legacy
  }

  supabaseUrl = supabaseUrl || process.env.SUPABASE_URL || undefined
  supabaseServiceKey =
    supabaseServiceKey ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    undefined

  return { supabaseUrl, supabaseServiceKey }
}

/**
 * New-format keys (sb_secret_ / sb_publishable_) must ONLY be sent in the `apikey`
 * header — not as JWT bearer tokens. Strip Authorization when it carries one.
 */
function newKeyFetch(fetch = globalThis.fetch) {
  return (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
    if (options?.headers) {
      const headers = new Headers(options.headers as HeadersInit)
      const auth = headers.get('Authorization') ?? ''
      if (auth.startsWith('Bearer sb_')) {
        headers.delete('Authorization')
        options = { ...options, headers }
      }
    }
    return fetch(url, options)
  }
}

/**
 * Server-side admin client (bypasses RLS). Returns null if credentials are missing.
 */
export function createWebsiteSupabaseClient(event?: H3Event): SupabaseClient | null {
  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  if (!supabaseUrl || !supabaseServiceKey) return null

  const isNewKeyFormat =
    supabaseServiceKey.startsWith('sb_secret_') ||
    supabaseServiceKey.startsWith('sb_publishable_')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: isNewKeyFormat ? { fetch: newKeyFetch() } : undefined,
  })
}
