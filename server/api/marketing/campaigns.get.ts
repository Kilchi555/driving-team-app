import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId } = getQuery(event) as { tenantId: string }
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('email_campaigns')
    // Explicit FK hint to avoid PostgREST 300 "ambiguous relationship"
    .select('*, email_template:email_templates!template_id(name, subject), variants:email_campaign_variants(id, label, split_pct, subject_override, sent_count, open_count, click_count, template_id, subject_snapshots, email_template:email_templates(name, subject))')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const campaigns = data ?? []
  const activeIds = campaigns
    .filter((c: any) => ['sent', 'pilot', 'recurring', 'sending'].includes(c.status))
    .map((c: any) => c.id)

  const queueByCampaign = new Map<string, {
    delivered_count: number
    pending_count: number
    cancelled_count: number
    failed_count: number
    sending_count: number
  }>()

  if (activeIds.length) {
    const { data: queueStats, error: queueErr } = await supabase.rpc('marketing_campaign_queue_stats', {
      p_campaign_ids: activeIds,
    })
    if (queueErr) {
      console.error('[campaigns.get] queue stats error:', queueErr)
    } else {
      for (const row of queueStats || []) {
        queueByCampaign.set(row.campaign_id, {
          delivered_count: Number(row.delivered_count) || 0,
          pending_count: Number(row.pending_count) || 0,
          cancelled_count: Number(row.cancelled_count) || 0,
          failed_count: Number(row.failed_count) || 0,
          sending_count: Number(row.sending_count) || 0,
        })
      }
    }
  }

  return {
    campaigns: campaigns.map((c: any) => {
      const q = queueByCampaign.get(c.id)
      return {
        ...c,
        delivered_count: q?.delivered_count ?? 0,
        pending_count: q?.pending_count ?? 0,
        cancelled_count: q?.cancelled_count ?? 0,
        failed_count: q?.failed_count ?? 0,
        sending_count: q?.sending_count ?? 0,
      }
    }),
  }
})
