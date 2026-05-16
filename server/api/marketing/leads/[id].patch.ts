import { getSupabaseAdmin } from '~/server/utils/supabase-admin'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const { tenantId, status, categories, tags, notes, first_name, last_name, phone } = body

  if (!tenantId || !id) {
    throw createError({ statusCode: 400, statusMessage: 'tenantId and id are required' })
  }

  const allowed = ['pending_consent', 'active', 'unsubscribed', 'bounced', 'inactive']
  if (status && !allowed.includes(status)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid status: ${status}` })
  }

  const updates: Record<string, any> = {}
  if (status !== undefined) updates.status = status
  if (categories !== undefined) updates.categories = categories
  if (tags !== undefined) updates.tags = tags
  if (notes !== undefined) updates.notes = notes
  if (first_name !== undefined) updates.first_name = first_name
  if (last_name !== undefined) updates.last_name = last_name
  if (phone !== undefined) updates.phone = phone

  if (status === 'active' && !updates.consent_given_at) {
    updates.consent_given_at = new Date().toISOString()
    updates.consent_source = 'manual'
  }

  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('leads')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { lead: data }
})
