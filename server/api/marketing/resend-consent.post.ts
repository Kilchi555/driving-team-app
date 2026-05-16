/**
 * POST /api/marketing/resend-consent
 * Sends a consent-invitation reminder to every lead with status = 'pending_consent'.
 * Safe to call multiple times — only targets leads who haven't confirmed yet.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { requireAdminProfile } from '~/server/utils/auth'
import { fetchTenantEmailContext, sendConsentEmailWithContext } from '~/server/utils/send-consent-email'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event)
  const tenantId = profile.tenant_id

  const supabase = getSupabaseAdmin()

  // Fetch pending leads + tenant context in parallel
  const [leadsResult, emailCtx] = await Promise.all([
    supabase
      .from('leads')
      .select('id, email, first_name, unsubscribe_token')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending_consent')
      .not('email', 'is', null),
    fetchTenantEmailContext(tenantId),
  ])

  if (leadsResult.error) {
    throw createError({ statusCode: 500, statusMessage: leadsResult.error.message })
  }

  const leads = leadsResult.data || []
  if (leads.length === 0) {
    return { success: true, sent: 0, message: 'Keine pending_consent Leads gefunden.' }
  }

  // Send in batches of 20, fire-and-forget (context fetched once = 0 extra DB queries)
  const CONCURRENCY = 20
  let sent = 0

  ;(async () => {
    for (let i = 0; i < leads.length; i += CONCURRENCY) {
      const batch = leads.slice(i, i + CONCURRENCY)
      const results = await Promise.allSettled(
        batch.map(lead =>
          sendConsentEmailWithContext(emailCtx, {
            leadId: lead.id,
            token: lead.unsubscribe_token,
            email: lead.email,
            firstName: lead.first_name,
          })
        )
      )
      sent += results.filter(r => r.status === 'fulfilled').length
      if (i + CONCURRENCY < leads.length) {
        await new Promise(r => setTimeout(r, 50))
      }
    }
    console.log(`[resend-consent] Sent ${sent}/${leads.length} reminders for tenant ${tenantId}`)
  })().catch(e => console.error('Resend consent error:', e))

  return {
    success: true,
    total: leads.length,
    message: `Erinnerung wird an ${leads.length} Kontakte gesendet.`,
  }
})
