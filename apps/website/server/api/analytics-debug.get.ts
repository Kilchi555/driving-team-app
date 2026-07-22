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

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      vercelEnv,
      error: 'SUPABASE_URL oder SUPABASE_SECRET_KEY fehlen in den Umgebungsvariablen',
      supabaseUrl: supabaseUrl ? '✅ gesetzt' : '❌ fehlt',
      supabaseKey: supabaseServiceKey ? '✅ gesetzt' : '❌ fehlt',
      keyFormat,
    }
  }

  const supabase = createWebsiteSupabaseClient(event)
  if (!supabase) {
    return { ok: false, vercelEnv, error: 'Failed to create Supabase client', keyFormat }
  }

  const { error: tableError } = await supabase
    .from('page_analytics')
    .select('id')
    .limit(1)

  const { error: rpcError } = await supabase.rpc('increment_page_view', {
    p_page: '/test-debug',
    p_date: new Date().toISOString().split('T')[0],
    p_referrer_type: 'direct',
    p_device_type: 'desktop',
    p_country: 'unknown',
  })

  return {
    ok: !tableError && !rpcError,
    vercelEnv,
    supabaseUrl: '✅ gesetzt',
    supabaseKey: '✅ gesetzt',
    keyFormat,
    tableCheck: tableError ? `❌ ${tableError.message}` : '✅ page_analytics Tabelle erreichbar',
    rpcCheck: rpcError ? `❌ ${rpcError.message}` : '✅ increment_page_view RPC funktioniert',
  }
})
