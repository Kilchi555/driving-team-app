import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

/**
 * Get Supabase client with anon key
 * This allows RLS policies to be enforced
 * Unauthenticated requests use the 'anon' role
 */
export function getSupabase(event?: H3Event) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables (SUPABASE_URL or SUPABASE_ANON_KEY)')
  }

  // Log which key we're using (for debugging)
  console.log('🔐 getSupabase() - Using ANON key, first 20 chars:', supabaseAnonKey.substring(0, 20))

  // Create client with anon key - minimal configuration
  // Do NOT use signOut() as it can cause issues
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
      storage: undefined
    }
  })
  
  console.log('🔐 getSupabase() - Client created (no signOut)')
  
  return client
}
