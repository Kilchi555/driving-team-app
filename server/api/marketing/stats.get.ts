import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId } = getQuery(event) as { tenantId: string }

  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'tenantId is required' })

  const supabase = getSupabaseAdmin()

  const [leadsRes, campaignsRes, templatesRes] = await Promise.all([
    supabase
      .from('leads')
      .select('status')
      .eq('tenant_id', tenantId),
    supabase
      .from('email_campaigns')
      .select('status, sent_count, bounce_count, unsubscribe_count')
      .eq('tenant_id', tenantId),
    supabase
      .from('email_templates')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ])

  const leads = leadsRes.data ?? []
  const campaigns = campaignsRes.data ?? []

  const leadsTotal = leads.length
  const leadsActive = leads.filter(l => l.status === 'active').length
  const leadsPendingConsent = leads.filter(l => l.status === 'pending_consent').length
  const leadsUnsubscribed = leads.filter(l => l.status === 'unsubscribed').length
  const leadsBounced = leads.filter(l => l.status === 'bounced').length

  const campaignsSent = campaigns.filter(c => c.status === 'sent').length
  const totalEmailsSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0)
  const totalBounces = campaigns.reduce((s, c) => s + (c.bounce_count || 0), 0)
  const totalUnsubscribes = campaigns.reduce((s, c) => s + (c.unsubscribe_count || 0), 0)

  return {
    leads: { total: leadsTotal, active: leadsActive, pendingConsent: leadsPendingConsent, unsubscribed: leadsUnsubscribed, bounced: leadsBounced },
    campaigns: { total: campaigns.length, sent: campaignsSent, totalEmailsSent, totalBounces, totalUnsubscribes },
    templates: { total: templatesRes.count ?? 0 },
  }
})
