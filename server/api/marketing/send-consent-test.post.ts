/**
 * Sends a real consent/unsubscribe test email to a given address.
 * Creates (or reuses) a test lead for the tenant, then emails the actual
 * opt-in and opt-out links so the full flow can be verified end-to-end.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendConsentEmail } from '~/server/utils/send-consent-email'

export default defineEventHandler(async (event) => {
  const { tenantId, email } = await readBody(event)

  if (!tenantId || !email) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and email required' })
  }

  const supabase = getSupabaseAdmin()

  // Upsert a test lead so we always have a valid id + token
  const { data: existing } = await supabase
    .from('leads')
    .select('id, unsubscribe_token, status, first_name')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase())
    .maybeSingle()

  let leadId: string
  let token: string

  if (existing) {
    leadId = existing.id
    token = existing.unsubscribe_token
    // Reset to pending_consent so the opt-in link works again
    await supabase
      .from('leads')
      .update({ status: 'pending_consent', consent_given_at: null })
      .eq('id', leadId)
  } else {
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        tenant_id: tenantId,
        email: email.toLowerCase(),
        categories: [],
        status: 'pending_consent',
        source: 'test',
        tags: ['test'],
      })
      .select('id, unsubscribe_token')
      .single()

    if (error || !newLead) {
      throw createError({ statusCode: 500, statusMessage: error?.message ?? 'Failed to create test lead' })
    }

    leadId = newLead.id
    token = newLead.unsubscribe_token
  }

  await sendConsentEmail({
    leadId,
    token,
    email,
    firstName: existing?.first_name ?? null,
    tenantId,
    tenantName: '',   // sendConsentEmail fetches from DB
    primaryColor: '', // sendConsentEmail fetches from DB
  })

  return { success: true, leadId }
})
