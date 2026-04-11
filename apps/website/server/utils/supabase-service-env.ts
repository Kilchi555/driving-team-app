import type { H3Event } from 'h3'

/**
 * Supabase URL + Service Role für Nitro-Servercode.
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
    const k = cfg.supabaseServiceRoleKey as string | undefined
    if (u)
      supabaseUrl = u
    if (k)
      supabaseServiceKey = k
  }

  supabaseUrl = supabaseUrl || process.env.SUPABASE_URL || undefined
  supabaseServiceKey = supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || undefined

  return { supabaseUrl, supabaseServiceKey }
}
