import { createError } from 'h3'
import { createWebsiteSupabaseClient, getSupabaseServiceCredentials } from '~/server/utils/supabase-service-env'

export default defineEventHandler(async (event) => {
  // ✅ Security: disabled in production
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw createError({ statusCode: 404, statusMessage: 'Not found' })
  }

  const { supabaseUrl, supabaseServiceKey } = getSupabaseServiceCredentials(event)
  const vercelEnv = process.env.VERCEL_ENV
  const keyFormat = supabaseServiceKey?.startsWith('sb_secret_')
    ? 'sb_secret'
    : supabaseServiceKey?.startsWith('eyJ')
      ? 'legacy_jwt'
      : supabaseServiceKey
        ? 'unknown'
        : 'missing'

  console.log('=== Track Debug ===')
  console.log('VERCEL_ENV:', vercelEnv)
  console.log('SUPABASE_URL:', supabaseUrl ? 'SET' : 'MISSING')
  console.log('SUPABASE_SECRET_KEY:', supabaseServiceKey ? 'SET' : 'MISSING')
  console.log('KEY_FORMAT:', keyFormat)

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      error: 'Missing Supabase config',
      vercelEnv,
      keyFormat,
    }
  }

  const supabase = createWebsiteSupabaseClient(event)
  if (!supabase) {
    return { ok: false, error: 'Failed to create Supabase client', vercelEnv, keyFormat }
  }

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
    keyFormat,
    error: error?.message,
    rpcResult: { data, error },
  }
})
