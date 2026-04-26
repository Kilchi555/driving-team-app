import { createError } from 'h3'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

export default defineEventHandler(async (event) => {
  // ✅ Security: disabled in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  const vercelEnv = process.env.VERCEL_ENV

  console.log('=== Track Debug ===')
  console.log('VERCEL_ENV:', vercelEnv)
  console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'SET' : 'MISSING')

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      error: 'Missing Supabase config',
      vercelEnv,
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data, error } = await supabase.rpc('increment_page_view', {
    p_page: '/test-debug',
    p_date: new Date().toISOString().split('T')[0],
    p_referrer_type: 'direct',
    p_device_type: 'desktop',
    p_country: 'unknown',
  })

  console.log('RPC Result:', { data, error })

  return {
    ok: !error,
    vercelEnv,
    error: error?.message,
    rpcResult: { data, error },
  }
})
