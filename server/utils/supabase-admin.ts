import { createClient } from '@supabase/supabase-js'

/**
 * Returns a custom fetch function that strips the Authorization: Bearer header
 * when the bearer value is a new-format Supabase key (sb_secret_ / sb_publishable_).
 * These keys must ONLY be sent in the `apikey` header — not as JWT bearer tokens.
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

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  // SUPABASE_SECRET_KEY is the new-format key; fall back to SUPABASE_SERVICE_ROLE_KEY
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  const isNewKeyFormat = supabaseServiceKey.startsWith('sb_secret_') || supabaseServiceKey.startsWith('sb_publishable_')

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: isNewKeyFormat ? { fetch: newKeyFetch() } : undefined
  })
}

/**
 * Anon client — respects RLS policies.
 * Use for public endpoints where data access should be governed by RLS.
 */
export function getSupabaseAnon() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (URL or ANON_KEY)')
  }

  const isNewKeyFormat = supabaseAnonKey.startsWith('sb_publishable_') || supabaseAnonKey.startsWith('sb_secret_')

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: isNewKeyFormat ? { fetch: newKeyFetch() } : undefined
  })
}
