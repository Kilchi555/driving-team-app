/**
 * POST /api/marketing/leads
 * Manually add a single lead and automatically send a consent invitation email.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendConsentEmail } from '~/server/utils/send-consent-email'
import { requireAdminProfile } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const profile = await requireAdminProfile(event, ['admin', 'staff', 'super_admin', 'tenant_admin'])

  const { tenantId, email, first_name, last_name, phone, categories, notes } = await readBody(event)

  if (!email) {
    throw createError({ statusCode: 400, statusMessage: 'email required' })
  }

  const effectiveTenantId =
    profile.role === 'super_admin' && tenantId ? tenantId : profile.tenant_id

  if (!effectiveTenantId) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId required' })
  }

  if (
    profile.role !== 'super_admin' &&
    tenantId &&
    tenantId !== profile.tenant_id
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
  }

  const supabase = getSupabaseAdmin()

  const [{ data: lead, error }, { data: tenant }] = await Promise.all([
    supabase
      .from('leads')
      .upsert(
        {
          tenant_id: effectiveTenantId,
          email: email.toLowerCase().trim(),
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
          phone: phone?.trim() || null,
          categories: categories || [],
          notes: notes?.trim() || null,
          status: 'pending_consent',
          source: 'manual',
        },
        { onConflict: 'tenant_id,email', ignoreDuplicates: false }
      )
      .select('id, email, first_name, unsubscribe_token, status')
      .single(),
    supabase
      .from('tenants')
      .select('name, primary_color')
      .eq('id', effectiveTenantId)
      .single(),
  ])

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Send consent email (awaited — serverless functions terminate on return)
  try {
    await sendConsentEmail({
      leadId: lead.id,
      token: lead.unsubscribe_token,
      email: lead.email,
      firstName: lead.first_name,
      tenantId: effectiveTenantId,
      tenantName: tenant?.name || 'Unternehmen',
      primaryColor: tenant?.primary_color || '#1e293b',
    })
  } catch (e) {
    console.error('Consent email failed:', e)
  }

  // Never return unsubscribe_token to the client
  return { success: true, lead: { id: lead.id, email: lead.email, status: lead.status } }
})
