import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'
import { logger } from '~/utils/logger'

/**
 * Get Supabase client with anon key
 * This allows RLS policies to be enforced
 * Unauthenticated requests use the 'anon' role
 */
export function getSupabase(event?: H3Event, sessionJwt?: string) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)')
  }

  const headers: Record<string, string> = {}
  if (sessionJwt) {
    headers['Authorization'] = `Bearer ${sessionJwt}`
    logger.debug('🔐 getSupabase() - Using JWT for Authorization')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: undefined
    },
    global: {
      headers: headers,
    }
  })
  
  return client
}
