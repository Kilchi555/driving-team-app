import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { event_type, campaign_id, lead_id, tenant_id, metadata } = body

  if (!event_type) throw createError({ statusCode: 400, statusMessage: 'event_type is required' })

  const supabase = getSupabaseAdmin()

  await supabase.from('analytics_events').insert({
    event_type,
    event_category: 'marketing',
    tenant_id: tenant_id || null,
    event_data: {
      campaign_id: campaign_id || null,
      lead_id: lead_id || null,
      ...metadata,
    },
    ip_address: getRequestIP(event) || null,
    user_agent: getRequestHeader(event, 'user-agent') || null,
  })

  return { ok: true }
})
