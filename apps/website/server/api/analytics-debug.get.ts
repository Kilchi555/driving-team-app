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

  if (!supabaseUrl || !supabaseServiceKey) {
    return {
      ok: false,
      vercelEnv,
      error: 'SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlen in den Umgebungsvariablen',
      supabaseUrl: supabaseUrl ? '✅ gesetzt' : '❌ fehlt',
      supabaseKey: supabaseServiceKey ? '✅ gesetzt' : '❌ fehlt',
    }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    tableCheck: tableError ? `❌ ${tableError.message}` : '✅ page_analytics Tabelle erreichbar',
    rpcCheck: rpcError ? `❌ ${rpcError.message}` : '✅ increment_page_view RPC funktioniert',
  }
})
