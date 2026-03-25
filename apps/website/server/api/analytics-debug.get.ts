import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async () => {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
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

  // Test 1: Table exists?
  const { error: tableError } = await supabase
    .from('page_analytics')
    .select('id')
    .limit(1)

  // Test 2: RPC function exists?
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
