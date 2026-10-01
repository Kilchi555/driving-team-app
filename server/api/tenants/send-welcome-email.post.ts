import { createError, defineEventHandler, readBody } from 'h3'
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendWelcomeEmail } from '~/server/utils/send-welcome-email'
import { requireStaffOrInternal } from '~/server/utils/require-staff-or-internal'
import { verifyRegistrationToken } from '~/server/utils/registration-token'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const tenantId = body?.tenantId as string | undefined
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'Missing tenantId' })

  // Fresh tenant signup presents the HMAC issued by POST /api/tenants/register.
  // That token is bound to this tenantId. It is not a substitute for staff auth
  // on any other tenant.
  const registrationAuthorized = verifyRegistrationToken(body?.registration_token, tenantId)

  if (!registrationAuthorized) {
    const auth = await requireStaffOrInternal(event)
    if (
      auth.mode === 'staff' &&
      auth.profile?.role !== 'super_admin' &&
      auth.profile?.tenant_id !== tenantId
    ) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden – tenant mismatch' })
    }
  }

  const supabase = getSupabaseAdmin()
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('name, contact_email, contact_person_first_name, slug, business_type')
    .eq('id', tenantId)
    .single()

  if (error || !tenant?.contact_email) {
    throw createError({ statusCode: 404, statusMessage: 'Tenant not found or missing contact_email' })
  }

  await sendWelcomeEmail({
    role: 'admin',
    to: tenant.contact_email,
    firstName: tenant.contact_person_first_name || tenant.name,
    tenantId,
    tenantName: tenant.name,
    tenantSlug: tenant.slug,
    businessType: tenant.business_type,
  })

  return { success: true }
})
