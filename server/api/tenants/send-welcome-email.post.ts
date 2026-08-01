import { getSupabaseAdmin } from '~/server/utils/supabase-admin'
import { sendWelcomeEmail } from '~/server/utils/send-welcome-email'

export default defineEventHandler(async (event) => {
  const { tenantId } = await readBody(event)
  if (!tenantId) throw createError({ statusCode: 400, statusMessage: 'Missing tenantId' })

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
