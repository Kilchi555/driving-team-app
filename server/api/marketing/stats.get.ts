import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])
  const { tenantId } = getQuery(event) as { tenantId: string }
  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })
  if (profile.role !== 'super_admin' && tenantId && tenantId !== profile.tenant_id) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()

  const [
    totalRes, activeRes, pendingRes, unsubRes, bouncedRes,
    campaignsRes, templatesRes,
  ] = await Promise.all([
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', effectiveTenantId),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', effectiveTenantId).eq('status', 'active'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', effectiveTenantId).eq('status', 'pending_consent'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', effectiveTenantId).eq('status', 'unsubscribed'),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('tenant_id', effectiveTenantId).eq('status', 'bounced'),
    supabase.from('email_campaigns').select('status, sent_count, bounce_count, unsubscribe_count, open_count, click_count').eq('tenant_id', effectiveTenantId),
    supabase.from('email_templates').select('id', { count: 'exact', head: true }).eq('tenant_id', effectiveTenantId),
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
