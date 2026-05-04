import type { H3Event } from 'h3'

export function getSupabaseServiceCredentials(_event?: H3Event) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing Supabase service environment variables',
    })
  }

  return { supabaseUrl, supabaseServiceKey }
}
