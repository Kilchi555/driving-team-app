import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

// Event types that count as a campaign conversion
const CONVERSION_EVENTS = new Set([
  'helvetia_form_submitted',
  'booking_completed',
])

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { event_type, campaign_id, lead_id, tenant_id, metadata, variant } = body

  if (!event_type) throw createError({ statusCode: 400, statusMessage: 'event_type is required' })

  const supabase = getSupabaseAdmin()

  // Write analytics event
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

  // If this is a conversion event tied to a campaign, increment conversion counters
  if (campaign_id && CONVERSION_EVENTS.has(event_type)) {
    const rpcName = variant === 'b' ? 'increment_campaign_conversion_b' : 'increment_campaign_conversion'
    const conversions: Promise<any>[] = [
      supabase.rpc(rpcName, { p_campaign_id: campaign_id }),
    ]

    // Mark lead as converted (first conversion only, idempotent via converted_at)
    if (lead_id) {
      conversions.push(
        supabase
          .from('email_campaign_leads')
          .update({ converted_at: new Date().toISOString(), status: 'converted' })
          .eq('campaign_id', campaign_id)
          .eq('lead_id', lead_id)
          .is('converted_at', null),
      )
    }

    await Promise.all(conversions)
  }

  return { ok: true }
})
