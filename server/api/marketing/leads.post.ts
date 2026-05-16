/**
 * POST /api/marketing/leads
 * Manually add a single lead to the marketing database.
 */
import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const { tenantId, email, first_name, last_name, phone, categories, notes } = await readBody(event)

  if (!tenantId || !email) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and email required' })
  }

  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('leads')
    .upsert(
      {
        tenant_id: tenantId,
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
    .select('id, email, status')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  return { success: true, lead: data }
})
