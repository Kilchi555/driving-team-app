import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId } = getQuery(event) as { tenantId: string }

  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })

  const supabase = getSupabaseAdmin()

  const [
    totalRes, activeRes, pendingRes, unsubRes, bouncedRes,
    campaignsRes, templatesRes,
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'pending_consent'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'unsubscribed'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'bounced'),
    supabase.from('email_campaigns').select('status, sent_count, bounce_count, unsubscribe_count, open_count, click_count').eq('tenant_id', tenantId),
    supabase.from('email_templates').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
  ])

  const campaigns = campaignsRes.data ?? []

  const leadsTotal = totalRes.count ?? 0
  const leadsActive = activeRes.count ?? 0
  const leadsPendingConsent = pendingRes.count ?? 0
  const leadsUnsubscribed = unsubRes.count ?? 0
  const leadsBounced = bouncedRes.count ?? 0

  const campaignsSent = campaigns.filter(c => c.status === 'sent').length
  const totalEmailsSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)
  const totalBounces = campaigns.reduce((s, c) => s + (c.bounce_count || 0), 0)
  const totalUnsubscribes = campaigns.reduce((s, c) => s + (c.unsubscribe_count || 0), 0)
  const totalOpens = campaigns.reduce((s, c) => s + (c.open_count || 0), 0)
  const totalClicks = campaigns.reduce((s, c) => s + (c.click_count || 0), 0)

  return {
    leads: { total: leadsTotal, active: leadsActive, pendingConsent: leadsPendingConsent, unsubscribed: leadsUnsubscribed, bounced: leadsBounced },
    campaigns: { total: campaigns.length, sent: campaignsSent, totalEmailsSent, totalBounces, totalUnsubscribes, totalOpens, totalClicks },
    templates: { total: templatesRes.count ?? 0 },
  }
})
